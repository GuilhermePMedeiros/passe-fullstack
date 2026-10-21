package br.com.passebackend;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.lineup.LineupRepository;
import br.com.passebackend.lineup.LineupService;
import br.com.passebackend.lineup.dto.LineupRequestDTO;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.match.MatchDuel;
import br.com.passebackend.match.MatchDuelRepository;
import br.com.passebackend.match.MatchService;
import br.com.passebackend.match.dto.MatchRequestDTO;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

/** Real committed fixtures for independent transactions; cleanup only uses owned primary keys. */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
class LeagueAtomicityTests {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AuditPersistenceTests.applicationDatabase(properties); }

    @Autowired ClubRepository clubs;
    @Autowired LineupService lineups;
    @Autowired MatchService matches;
    @Autowired PlayerService playerService;
    @Autowired PlatformTransactionManager manager;
    @Autowired JdbcTemplate jdbc;
    @MockitoSpyBean LineupRepository lineupRepository;
    @MockitoSpyBean MatchDuelRepository duelRepository;
    @MockitoSpyBean PlayerRepository players;
    private final List<Integer> clubIds = new ArrayList<>();
    private final List<Integer> playerIds = new ArrayList<>();

    private record Team(Club club, List<Player> players) { }

    private Team team(String acronym) {
        Team team = new TransactionTemplate(manager).execute(status -> {
            Club club = clubs.saveAndFlush(new Club(null, "Liga Atômica " + UUID.randomUUID(), acronym, new BigDecimal("300"), null));
            clubIds.add(club.getId());
            List<Player> squad = createPlayers(club);
            return new Team(club, squad);
        });
        lineups.update(team.club().getId(), lineupRequest(team.players()));
        return team;
    }

    private List<Player> createPlayers(Club club) {
        List<Player> squad = new ArrayList<>();
        for (PlayerPosition position : PlayerPosition.values()) {
            Player p = players.saveAndFlush(new Player(null, "Titular " + position.name(), position, 85, 25,
                    new BigDecimal("25"), PlayerCondition.FIT, club, 70, 70, 70, 70, 70, 70, 99));
            playerIds.add(p.getId()); squad.add(p);
        }
        return squad;
    }

    private LineupRequestDTO lineupRequest(List<Player> squad) {
        LineupRequestDTO request = new LineupRequestDTO(); request.setFormation(Formation.TWO_ONE_ONE);
        request.setPlayerIds(squad.stream().map(Player::getId).toList()); return request;
    }

    private MatchRequestDTO request(Team home, Team away) {
        MatchRequestDTO r = new MatchRequestDTO(); r.setHomeClubId(home.club().getId()); r.setAwayClubId(away.club().getId()); return r;
    }

    @AfterEach
    void cleanOnlyFixturesCreatedByThisTest() {
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            for (Integer id : clubIds) {
                jdbc.update("DELETE FROM duelos_partida WHERE partida_id IN (SELECT id FROM partidas WHERE mandante_id=? OR visitante_id=?)", id, id);
                jdbc.update("DELETE FROM partidas WHERE mandante_id=? OR visitante_id=?", id, id);
            }
            for (Integer id : playerIds) {
                jdbc.update("DELETE FROM escalacoes WHERE jogador_id=?", id);
                jdbc.update("DELETE FROM jogadores WHERE id=?", id);
            }
            for (Integer id : clubIds) jdbc.update("DELETE FROM clubes WHERE id=?", id);
        });
    }

    @Test
    void lineupReplacementFailureRestoresPreviousRowsAndFormation() {
        Team team = team("XQZ");
        List<Player> replacements = new TransactionTemplate(manager).execute(status -> createPlayers(team.club()));
        doThrow(new IllegalStateException("Injected lineup insert failure")).when(lineupRepository).saveAllAndFlush(any());
        assertThatThrownBy(() -> lineups.update(team.club().getId(), lineupRequest(replacements))).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForList("SELECT jogador_id FROM escalacoes WHERE clube_id=? ORDER BY jogador_id", Integer.class, team.club().getId()))
                .containsExactlyElementsOf(team.players().stream().map(Player::getId).sorted().toList());
        assertThat(jdbc.queryForObject("SELECT formacao FROM clubes WHERE id=?", String.class, team.club().getId())).isEqualTo("2-1-1");
    }

    @Test
    void failedDuelPersistenceRollsBackMatchAndAlreadyInsertedDuel() {
        Team home = team("XQZ"), away = team("XQY");
        doAnswer(invocation -> {
            List<MatchDuel> duels = invocation.getArgument(0);
            duelRepository.saveAndFlush(duels.getFirst());
            throw new IllegalStateException("Injected second duel failure");
        }).when(duelRepository).saveAllAndFlush(any());
        assertThatThrownBy(() -> matches.play(request(home, away))).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM partidas WHERE mandante_id=?", Integer.class, home.club().getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM duelos_partida WHERE clube_atacante_id=?", Integer.class, home.club().getId())).isZero();
        assertThat(lineups.get(home.club().getId()).getPlayers()).hasSize(5);
        assertThat(jdbc.queryForObject("SELECT caixa FROM clubes WHERE id=?", BigDecimal.class, home.club().getId())).isEqualByComparingTo("300");
    }

    @Test
    void failedConditionWriteRollsBackRemovalFromLineup() {
        Team team = team("XQZ"); Player p = team.players().getFirst();
        doThrow(new IllegalStateException("Injected condition failure")).when(players).save(any(Player.class));
        assertThatThrownBy(() -> playerService.updatePlayerCondition(p.getId(), PlayerCondition.SICK)).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT condicao FROM jogadores WHERE id=?", String.class, p.getId())).isEqualTo("APTO");
        assertThat(lineups.get(team.club().getId()).getPlayers()).hasSize(5);
    }

    private List<String> race(Runnable first, Runnable second) throws Exception {
        CountDownLatch ready = new CountDownLatch(2), start = new CountDownLatch(1);
        try (var executor = Executors.newFixedThreadPool(2)) {
            var tasks = List.of(first, second).stream().map(action -> executor.submit(() -> {
                ready.countDown();
                if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("Barrier timeout");
                try { action.run(); return "OK"; }
                catch (BusinessConflictException conflict) { return "CONFLICT"; }
            })).toList();
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue(); start.countDown();
            return List.of(tasks.get(0).get(20, TimeUnit.SECONDS), tasks.get(1).get(20, TimeUnit.SECONDS));
        }
    }

    @Test
    void reversedConcurrentMatchesUseSameLockOrderAndBothComplete() throws Exception {
        Team home = team("XQZ"), away = team("XQY");
        assertThat(race(() -> matches.play(request(home, away)), () -> matches.play(request(away, home))))
                .containsExactly("OK", "OK");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM partidas WHERE mandante_id IN (?,?)", Integer.class,
                home.club().getId(), away.club().getId())).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM duelos_partida WHERE clube_atacante_id IN (?,?)", Integer.class,
                home.club().getId(), away.club().getId())).isEqualTo(12);
    }

    @Test
    void matchRacingSickConditionNeverStoresIneligibleSnapshot() throws Exception {
        Team home = team("XQZ"), away = team("XQY"); Player p = home.players().getFirst();
        var result = race(() -> matches.play(request(home, away)), () -> playerService.updatePlayerCondition(p.getId(), PlayerCondition.SICK));
        assertThat(result.get(1)).isEqualTo("OK");
        assertThat(result.getFirst()).isIn("OK", "CONFLICT");
        assertThat(lineups.get(home.club().getId()).getPlayers()).hasSize(4);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM duelos_partida WHERE defensor_id=? AND condicao_defensor='DOENTE'", Integer.class, p.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM partidas WHERE mandante_id=?", Integer.class, home.club().getId()))
                .isEqualTo(result.getFirst().equals("OK") ? 1 : 0);
    }

    @Test
    void simultaneousLineupReplacementsKeepExactlyOneCompleteSelection() throws Exception {
        Team team = team("XQZ");
        List<Player> replacements = new TransactionTemplate(manager).execute(status -> createPlayers(team.club()));
        assertThat(race(() -> lineups.update(team.club().getId(), lineupRequest(team.players())),
                () -> lineups.update(team.club().getId(), lineupRequest(replacements)))).containsExactly("OK", "OK");
        assertThat(lineups.get(team.club().getId()).getPlayers()).hasSize(5);
        assertThat(lineups.get(team.club().getId()).getComplete()).isTrue();
    }
}
