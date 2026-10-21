package br.com.passebackend;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;
import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.contract.ContractService;
import br.com.passebackend.lineup.LineupService;
import br.com.passebackend.lineup.dto.LineupRequestDTO;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.market.MarketService;
import br.com.passebackend.match.Match;
import br.com.passebackend.match.MatchRepository;
import br.com.passebackend.match.MatchService;
import br.com.passebackend.match.StandingsService;
import br.com.passebackend.match.dto.MatchRequestDTO;
import br.com.passebackend.match.dto.MatchResponseDTO;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

@SpringBootTest(properties = {"spring.jpa.hibernate.ddl-auto=none", "spring.jpa.properties.hibernate.generate_statistics=true"})
@AutoConfigureMockMvc
@Transactional
class LeagueIntegrationTests {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AuditPersistenceTests.applicationDatabase(properties); }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ClubRepository clubs;
    @Autowired PlayerRepository players;
    @Autowired PlayerService playerService;
    @Autowired ContractService contracts;
    @Autowired MarketService market;
    @Autowired LineupService lineups;
    @Autowired MatchService matches;
    @Autowired MatchRepository matchRepository;
    @Autowired StandingsService standings;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;
    @Autowired EntityManagerFactory emf;

    private Club club(String acronym) {
        return namedClub("Liga " + UUID.randomUUID(), acronym);
    }

    private Club namedClub(String name, String acronym) {
        return clubs.saveAndFlush(new Club(null, name, acronym, new BigDecimal("300.00"), null));
    }

    private Player player(Club club, String name, PlayerPosition position) {
        return players.saveAndFlush(new Player(null, name, position, 85, 25, new BigDecimal("25.00"),
                PlayerCondition.FIT, club, 70, 70, 70, 70, 70, 70, 99));
    }

    private List<Player> team(Club club, Formation formation) {
        List<Player> team = new ArrayList<>();
        team.add(player(club, "Goleiro Liga", PlayerPosition.GOALKEEPER));
        for (int n = 0; n < formation.getDefenders(); n++) team.add(player(club, "Defensor " + (char)('A' + n), PlayerPosition.CENTER_BACK));
        for (int n = 0; n < formation.getMidfielders(); n++) team.add(player(club, "Meia " + (char)('A' + n), PlayerPosition.MIDFIELDER));
        for (int n = 0; n < formation.getStrikers(); n++) team.add(player(club, "Atacante " + (char)('A' + n), PlayerPosition.STRIKER));
        return team;
    }

    private LineupRequestDTO lineupRequest(List<Player> team, Formation formation) {
        LineupRequestDTO r = new LineupRequestDTO(); r.setFormation(formation);
        r.setPlayerIds(new ArrayList<>(team.stream().map(Player::getId).toList())); return r;
    }

    private MatchRequestDTO matchRequest(Club home, Club away) {
        MatchRequestDTO r = new MatchRequestDTO(); r.setHomeClubId(home.getId()); r.setAwayClubId(away.getId()); return r;
    }

    private List<Player> officialTeam(Club club, boolean home) {
        List<Player> team = List.of(
                player(club, home ? "Rui Prado" : "Ivo Teles", PlayerPosition.GOALKEEPER),
                player(club, home ? "Téo Brandão" : "Hugo Vaz", PlayerPosition.CENTER_BACK),
                player(club, home ? "Davi Lins" : "Lino Matos", PlayerPosition.FULL_BACK),
                player(club, home ? "Lauro Neves" : "Nei Soares", PlayerPosition.MIDFIELDER),
                player(club, home ? "Otto Rangel" : "Ugo Falcão", PlayerPosition.STRIKER));
        team.get(0).setDefending(home ? 77 : 72);
        team.get(1).setDefending(84);
        team.get(2).setDribbling(home ? 74 : 79); team.get(2).setDefending(home ? 66 : 63);
        team.get(3).setPassing(home ? 82 : 70); team.get(4).setShooting(home ? 75 : 81);
        if (home) team.get(2).setCondition(PlayerCondition.UNFIT);
        players.flush();
        lineups.update(club.getId(), lineupRequest(team, Formation.TWO_ONE_ONE));
        return team;
    }

    @ParameterizedTest
    @ValueSource(strings = {"3-1", "2-2", "2-1-1", "1-2-1"})
    void allFormationsAcceptUnorderedDistinctIdsAndReplaceEntireLineup(String code) throws Exception {
        Club c = club("XQZ"); Formation formation = Formation.fromCode(code); List<Player> team = team(c, formation);
        LineupRequestDTO request = lineupRequest(team, formation); Collections.reverse(request.getPlayerIds());
        mvc.perform(put("/api/v1/clubs/{id}/lineup", c.getId()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.formation").value(code))
                .andExpect(jsonPath("$.complete").value(true)).andExpect(jsonPath("$.players.length()").value(5))
                .andExpect(jsonPath("$.players[0].position").value("GOL"));
        Player replacement = player(c, "Novo Atacante", PlayerPosition.STRIKER);
        List<Player> changed = new ArrayList<>(team); changed.set(4, replacement);
        lineups.update(c.getId(), lineupRequest(changed, formation));
        var result = lineups.get(c.getId());
        assertThat(result.getPlayers()).extracting(p -> p.getId()).contains(replacement.getId()).doesNotContain(team.get(4).getId());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM escalacoes WHERE clube_id=?", Integer.class, c.getId())).isEqualTo(5);
        assertThat(c.getCash()).isEqualByComparingTo("300");
    }

    @Test
    void lineupOfNewClubIsEmptyAndClubErrorsAre404() throws Exception {
        Club c = club("XQZ");
        mvc.perform(get("/api/v1/clubs/{id}/lineup", c.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.formation").isEmpty()).andExpect(jsonPath("$.complete").value(false))
                .andExpect(jsonPath("$.players").isEmpty());
        mvc.perform(get("/api/v1/clubs/2147483647/lineup")).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
        var request = lineupRequest(team(c, Formation.TWO_ONE_ONE), Formation.TWO_ONE_ONE);
        mvc.perform(put("/api/v1/clubs/2147483647/lineup").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
    }

    @Test
    void eligibilityFailuresPreservePreviousFormationAndFiveRows() throws Exception {
        Club c = club("XQZ"), other = club("XQY"); List<Player> original = team(c, Formation.TWO_ONE_ONE);
        lineups.update(c.getId(), lineupRequest(original, Formation.TWO_ONE_ONE));
        Player candidate = player(other, "Outro Atacante", PlayerPosition.STRIKER);
        var request = lineupRequest(original, Formation.TWO_ONE_ONE); request.getPlayerIds().set(4, candidate.getId());
        for (int state = 0; state < 3; state++) {
            if (state == 1) candidate.setClub(null);
            if (state == 2) { candidate.setClub(c); candidate.setCondition(PlayerCondition.SICK); }
            players.flush();
            mvc.perform(put("/api/v1/clubs/{id}/lineup", c.getId()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                    .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
            assertThat(lineups.get(c.getId()).getPlayers()).extracting(p -> p.getId()).containsExactlyElementsOf(original.stream().map(Player::getId).toList());
        }
        candidate.setDeletedAt(DateTimeUtils.now()); players.flush();
        mvc.perform(put("/api/v1/clubs/{id}/lineup", c.getId()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
        request.getPlayerIds().set(4, 2147483647);
        mvc.perform(put("/api/v1/clubs/{id}/lineup", c.getId()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
        request = lineupRequest(original, Formation.ONE_TWO_ONE);
        mvc.perform(put("/api/v1/clubs/{id}/lineup", c.getId()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isConflict());
        assertThat(c.getFormation()).isEqualTo("2-1-1");
    }

    @ParameterizedTest
    @ValueSource(strings = {"[]", "null", "{} {}", "{", "{}", "{\"formation\":\"4-0\",\"player_ids\":[1,2,3,4,5]}",
            "{\"formation\":\"2-1-1\",\"player_ids\":null}", "{\"formation\":\"2-1-1\",\"player_ids\":\"x\"}",
            "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4]}", "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,5,6]}",
            "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,4]}", "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,0]}",
            "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,-1]}", "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,\"5\"]}",
            "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,5.5]}", "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,null]}",
            "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,true]}", "{\"formation\":\"2-1-1\",\"player_ids\":[1,2,3,4,2147483648]}"})
    void lineupJsonIsStrictAndValidationPrecedesWrites(String body) throws Exception {
        mvc.perform(put("/api/v1/clubs/1/lineup").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void sickAndSoldStartersLeaveAtomicallyAndDoNotReturnAutomatically() {
        Club c = club("XQZ"); List<Player> team = team(c, Formation.TWO_ONE_ONE);
        lineups.update(c.getId(), lineupRequest(team, Formation.TWO_ONE_ONE));
        Player sick = team.get(1);
        playerService.updatePlayerCondition(sick.getId(), PlayerCondition.SICK);
        assertThat(lineups.get(c.getId()).getComplete()).isFalse();
        assertThat(lineups.get(c.getId()).getPlayers()).hasSize(4);
        playerService.updatePlayerCondition(sick.getId(), PlayerCondition.UNFIT);
        assertThat(lineups.get(c.getId()).getPlayers()).hasSize(4);
        lineups.update(c.getId(), lineupRequest(team, Formation.TWO_ONE_ONE));
        Player sold = team.get(4);
        contracts.create(sold, c, new BigDecimal("25"), DateTimeUtils.now().plusDays(120).withNano(0), DateTimeUtils.now());
        market.sell(sold.getId());
        assertThat(lineups.get(c.getId()).getPlayers()).hasSize(4);
        assertThat(c.getFormation()).isEqualTo("2-1-1");
    }

    @Test
    void officialSixDuelsPersistAndHistoryNeverRecalculatesPlayerSnapshots() throws Exception {
        Club home = club("XQZ"), away = club("XQY");
        List<Player> h = officialTeam(home, true), a = officialTeam(away, false);
        String json = mapper.writeValueAsString(matchRequest(home, away));
        String response = mvc.perform(post("/api/v1/matches").contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isCreated()).andExpect(header().string("Location", org.hamcrest.Matchers.startsWith("/api/v1/matches/")))
                .andExpect(jsonPath("$.home.goals").value(1)).andExpect(jsonPath("$.away.goals").value(2))
                .andExpect(jsonPath("$.result").value("VISITANTE")).andExpect(jsonPath("$.duels.length()").value(6))
                .andReturn().getResponse().getContentAsString();
        var result = mapper.readTree(response); int id = result.get("id").intValue();
        assertThat(result.get("played_at").asText()).matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}-03:00");
        int[] attack = {75,82,63,81,70,79}, defense = {72,84,63,77,84,56};
        int[] attacker = {h.get(4).getId(),h.get(3).getId(),h.get(2).getId(),a.get(4).getId(),a.get(3).getId(),a.get(2).getId()};
        int[] defender = {a.get(0).getId(),a.get(1).getId(),a.get(2).getId(),h.get(0).getId(),h.get(1).getId(),h.get(2).getId()};
        for (int n = 0; n < 6; n++) {
            var duel = result.get("duels").get(n);
            assertThat(duel.get("order").intValue()).isEqualTo(n + 1);
            assertThat(duel.get("attacker").get("player_id").intValue()).isEqualTo(attacker[n]);
            assertThat(duel.get("defender").get("player_id").intValue()).isEqualTo(defender[n]);
            assertThat(duel.get("attacker").get("value").intValue()).isEqualTo(attack[n]);
            assertThat(duel.get("defender").get("value").intValue()).isEqualTo(defense[n]);
            assertThat(duel.get("goal").booleanValue()).isEqualTo(attack[n] > defense[n]);
        }
        assertThat(h.get(2).getDribbling()).isEqualTo(74);
        assertThat(home.getCash()).isEqualByComparingTo("300");
        assertThat(lineups.get(home.getId()).getPlayers()).hasSize(5);
        h.get(2).setName("Nome Alterado"); h.get(2).setClub(null); h.get(2).setDeletedAt(DateTimeUtils.now());
        h.get(2).setCondition(PlayerCondition.SICK); h.get(2).setDribbling(1);
        home.setFormation("3-1"); players.flush(); em.clear();
        String history = mvc.perform(get("/api/v1/matches/{id}", id)).andExpect(status().isOk()).andReturn().getResponse().getContentAsString();
        assertThat(mapper.readTree(history)).isEqualTo(result);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM duelos_partida WHERE partida_id=?", Integer.class, id)).isEqualTo(6);
    }

    @ParameterizedTest
    @ValueSource(strings = {"[]", "null", "true", "{}", "{} {}", "{\"home_club_id\":1,\"away_club_id\":1}",
            "{\"home_club_id\":0,\"away_club_id\":2}", "{\"home_club_id\":-1,\"away_club_id\":2}",
            "{\"home_club_id\":\"1\",\"away_club_id\":2}", "{\"home_club_id\":1.5,\"away_club_id\":2}",
            "{\"home_club_id\":true,\"away_club_id\":2}", "{\"home_club_id\":null,\"away_club_id\":2}"})
    void invalidMatchBodyIs400(String body) throws Exception {
        mvc.perform(post("/api/v1/matches").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void incompleteLineupsMissingClubsAndMissingMatchHaveCorrectErrors() throws Exception {
        Club home = club("XQZ"), away = club("XQY");
        mvc.perform(post("/api/v1/matches").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(matchRequest(home, away))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        var request = matchRequest(home, away); request.setAwayClubId(2147483647);
        mvc.perform(post("/api/v1/matches").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(request)))
                .andExpect(status().isNotFound());
        for (String id : List.of("2147483647", "0", "01", "abc", "2147483648")) {
            mvc.perform(get("/api/v1/matches/" + id)).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
        }
        officialTeam(home, true); List<Player> awayTeam = officialTeam(away, false);
        playerService.updatePlayerCondition(awayTeam.get(0).getId(), PlayerCondition.SICK);
        mvc.perform(post("/api/v1/matches").contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(matchRequest(home, away))))
                .andExpect(status().isConflict());
        assertThat(matchRepository.count()).isZero();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "0", "01", "-1", "1.0", "1e0", "2147483648", "true"})
    void invalidHistoryFilterIs400(String value) throws Exception {
        mvc.perform(get("/api/v1/matches").param("club_id", value)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void repeatedMatchesAreDeterministicAndHistoryFiltersBothSidesWithoutNPlusOne() throws Exception {
        Club home = club("XQZ"), away = club("XQY"), other = club("XQX");
        officialTeam(home, true); officialTeam(away, false);
        MatchResponseDTO first = matches.play(matchRequest(home, away));
        MatchResponseDTO second = matches.play(matchRequest(home, away));
        com.fasterxml.jackson.databind.JsonNode repeatedDuels = mapper.valueToTree(second.getDuels());
        assertThat(repeatedDuels).isEqualTo(mapper.valueToTree(first.getDuels()));
        assertThat(second.getHome().getGoals()).isEqualTo(first.getHome().getGoals());
        jdbc.update("UPDATE partidas SET jogada_em=? WHERE id IN (?,?)", LocalDateTime.of(2026,10,21,12,0), first.getId(), second.getId()); em.clear();
        for (Club c : List.of(home, away)) {
            mvc.perform(get("/api/v1/matches").param("club_id", c.getId().toString())).andExpect(status().isOk())
                    .andExpect(jsonPath("$.length()").value(2)).andExpect(jsonPath("$[0].id").value(second.getId()))
                    .andExpect(jsonPath("$[0].duels").doesNotExist());
        }
        mvc.perform(get("/api/v1/matches").param("club_id", other.getId().toString())).andExpect(status().isOk()).andExpect(content().json("[]"));
        mvc.perform(get("/api/v1/matches").param("club_id", "2147483647")).andExpect(status().isNotFound());
        em.clear(); var statistics = emf.unwrap(SessionFactory.class).getStatistics(); statistics.clear();
        matches.list(null); assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        statistics.clear(); matches.get(first.getId()); assertThat(statistics.getPrepareStatementCount()).isEqualTo(2);
    }

    private void score(Club home, Club away, int homeGoals, int awayGoals) {
        Match match = new Match(); match.setHomeClub(home); match.setAwayClub(away);
        match.setHomeGoals(homeGoals); match.setAwayGoals(awayGoals);
        match.setHomeFormation(Formation.TWO_ONE_ONE); match.setAwayFormation(Formation.TWO_ONE_ONE);
        match.setPlayedAt(DateTimeUtils.now().withNano(0)); matchRepository.saveAndFlush(match);
    }

    @Test
    void standingsOfficialSixClubExampleUsesOneAggregateQuery() {
        Club a = namedClub("Águias FC", "AGU"), d = namedClub("Delta FC", "DEL"), g = namedClub("Gama SC", "GAM");
        Club e = namedClub("Épsilon EC", "EPS"), m = namedClub("Mangue FC", "MAN"), t = namedClub("Tubarões EC", "TUB");
        score(a,d,1,2); score(g,e,2,1); score(e,a,3,2); score(d,g,0,1); em.clear();
        var statistics = emf.unwrap(SessionFactory.class).getStatistics(); statistics.clear();
        var result = standings.get();
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        assertThat(statistics.getEntityLoadCount()).isZero();
        assertThat(result).extracting(r -> r.getClubId()).containsExactly(g.getId(),e.getId(),d.getId(),m.getId(),t.getId(),a.getId());
        assertThat(result).extracting(r -> r.getPosition()).containsExactly(1,2,3,4,5,6);
        assertThat(result).extracting(r -> r.getPoints()).containsExactly(6,3,3,0,0,0);
        assertThat(result).extracting(r -> r.getGoalDifference()).containsExactly(2,0,0,0,0,-2);
        assertThat(result).extracting(r -> r.getGoalsFor()).containsExactly(3,4,2,0,0,3);
    }

    @Test
    void standingsDrawsAccumulateAndUnicodeNameTieBreakFallsBackToId() throws Exception {
        Club accented = namedClub("Águias FC", "AGU"), plain = namedClub("Aguias FC", "AGI"), z = namedClub("Zeta FC", "ZET");
        mvc.perform(get("/api/v1/standings")).andExpect(status().isOk()).andExpect(jsonPath("$[0].club_id").value(accented.getId()))
                .andExpect(jsonPath("$[1].club_id").value(plain.getId())).andExpect(jsonPath("$[0].played").value(0));
        score(accented,plain,0,0); score(plain,accented,1,1); score(z,plain,0,0);
        var result = standings.get();
        assertThat(result).extracting(r -> r.getClubId()).containsExactly(plain.getId(),accented.getId(),z.getId());
        assertThat(result.getFirst().getPlayed()).isEqualTo(3);
        assertThat(result.getFirst().getDraws()).isEqualTo(3);
        assertThat(result.getFirst().getWins()).isZero(); assertThat(result.getFirst().getLosses()).isZero();
        assertThat(result.getFirst().getPoints()).isEqualTo(3);
    }

    @ParameterizedTest
    @ValueSource(strings = {"3-1", "2-2", "2-1-1", "1-2-1"})
    void everyFormationPlaysAllSixDuelsAndEqualValuesDraw(String code) throws Exception {
        Formation formation = Formation.fromCode(code);
        Club home = club("XQZ"), away = club("XQY");
        lineups.update(home.getId(), lineupRequest(team(home, formation), formation));
        lineups.update(away.getId(), lineupRequest(team(away, formation), formation));
        var request = matchRequest(home, away);
        String body = mapper.writeValueAsString(request).replace("\"home_club_id\":" + home.getId(), "\"home_club_id\":" + home.getId() + ".0");
        body = body.substring(0, body.length() - 1) + ",\"home_goals\":3,\"result\":\"MANDANTE\"}";
        mvc.perform(post("/api/v1/matches").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.result").value("EMPATE"))
                .andExpect(jsonPath("$.home.goals").value(0)).andExpect(jsonPath("$.away.goals").value(0))
                .andExpect(jsonPath("$.duels.length()").value(6));
    }

    @Test
    void samePositionUsesNormalizedNameThenIdForLineupAndDuelRoles() {
        Club home = club("XQZ"), away = club("XQY");
        List<Player> homePlayers = team(home, Formation.ONE_TWO_ONE);
        homePlayers.get(2).setName("Zulu Meia"); homePlayers.get(2).setPassing(60);
        homePlayers.get(3).setName("Álvaro Meia"); homePlayers.get(3).setPassing(80); players.flush();
        lineups.update(home.getId(), lineupRequest(homePlayers, Formation.ONE_TWO_ONE));
        lineups.update(away.getId(), lineupRequest(team(away, Formation.ONE_TWO_ONE), Formation.ONE_TWO_ONE));
        var game = matches.play(matchRequest(home, away));
        assertThat(game.getDuels().get(1).getAttacker().getPlayerId()).isEqualTo(homePlayers.get(2).getId());
        assertThat(game.getDuels().get(2).getAttacker().getPlayerId()).isEqualTo(homePlayers.get(3).getId());
        assertThat(game.getDuels().get(2).getAttacker().getValue()).isEqualTo(80);
        homePlayers.get(2).setName("Alvaro Meia"); players.flush();
        assertThat(lineups.get(home.getId()).getPlayers()).extracting(p -> p.getId())
                .containsSubsequence(homePlayers.get(2).getId(), homePlayers.get(3).getId());
    }

    @Test
    void higherGoalDifferencePrecedesMoreGoalsForAndHomeWinIsReturned() {
        Club a = club("XQZ"), b = club("XQY"), c = club("XQX"), d = club("XQW");
        score(a,c,2,0); score(b,d,3,2);
        assertThat(standings.get()).extracting(r -> r.getClubId()).startsWith(a.getId(),b.getId());
        var homePlayers = team(a, Formation.TWO_ONE_ONE);
        var awayPlayers = team(b, Formation.TWO_ONE_ONE);
        awayPlayers.forEach(p -> p.setDefending(1)); players.flush();
        lineups.update(a.getId(), lineupRequest(homePlayers, Formation.TWO_ONE_ONE));
        lineups.update(b.getId(), lineupRequest(awayPlayers, Formation.TWO_ONE_ONE));
        var game = matches.play(matchRequest(a,b));
        assertThat(game.getResult()).isEqualTo("MANDANTE");
        assertThat(game.getHome().getGoals()).isEqualTo(3);
        assertThat(game.getAway().getGoals()).isZero();
    }
}
