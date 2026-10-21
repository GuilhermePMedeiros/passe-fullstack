package br.com.passebackend;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import java.math.BigDecimal;
import java.time.LocalDateTime;
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
import br.com.passebackend.lineup.Lineup;
import br.com.passebackend.lineup.LineupRepository;
import br.com.passebackend.market.MarketService;
import br.com.passebackend.market.dto.BuyRequestDTO;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import br.com.passebackend.transaction.Transaction;
import br.com.passebackend.transaction.TransactionRepository;

/** Separate committed transactions exercise real lock contention and real rollback.
 * Cleanup is limited to primary keys allocated by this test, never application rows. */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
class MarketAtomicityTests {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AuditPersistenceTests.applicationDatabase(properties); }

    @Autowired MarketService market;
    @Autowired br.com.passebackend.player.PlayerService playerService;
    @Autowired PlayerRepository players;
    @Autowired ClubRepository clubs;
    @Autowired LineupRepository lineups;
    @Autowired JdbcTemplate jdbc;
    @Autowired PlatformTransactionManager manager;
    @MockitoSpyBean TransactionRepository transactions;
    private final List<Integer> playerIds = new ArrayList<>();
    private final List<Integer> clubIds = new ArrayList<>();

    private Club club(String acronym) {
        return new TransactionTemplate(manager).execute(status -> {
            Club c = clubs.saveAndFlush(new Club(null, "Concorrência " + UUID.randomUUID(), acronym, new BigDecimal("300.00"), null));
            clubIds.add(c.getId()); return c;
        });
    }

    private Player player(String value) {
        return new TransactionTemplate(manager).execute(status -> {
            Player p = players.saveAndFlush(new Player(null, "Teste Concorrente", PlayerPosition.MIDFIELDER, 85, 25,
                    new BigDecimal(value), PlayerCondition.FIT, null, 70, 70, 70, 70, 70, 70, 80));
            playerIds.add(p.getId()); return p;
        });
    }

    private BuyRequestDTO request(Club c) {
        BuyRequestDTO r = new BuyRequestDTO(); r.setClubId(c.getId());
        r.setLoyaltyUntil(DateTimeUtils.now().plusDays(120).withSecond(0).withNano(0)); return r;
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

    @AfterEach
    void cleanOnlyOwnedFixtures() {
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            for (Integer id : playerIds) {
                jdbc.update("DELETE FROM transacoes WHERE jogador_id=?", id);
                jdbc.update("DELETE FROM contratos WHERE jogador_id=?", id);
                jdbc.update("DELETE FROM escalacoes WHERE jogador_id=?", id);
                jdbc.update("DELETE FROM jogadores WHERE id=?", id);
            }
            for (Integer id : clubIds) jdbc.update("DELETE FROM clubes WHERE id=?", id);
        });
    }

    @Test
    void concurrentPurchasesOfSamePlayerHaveOneWinner() throws Exception {
        Club a = club("XQZ"), b = club("XQY"); Player p = player("25");
        assertThat(race(() -> market.buy(p.getId(), request(a)), () -> market.buy(p.getId(), request(b))))
                .containsExactlyInAnyOrder("OK", "CONFLICT");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM contratos WHERE jogador_id=?", Integer.class, p.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacoes WHERE jogador_id=?", Integer.class, p.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT SUM(caixa) FROM clubes WHERE id IN (?,?)", BigDecimal.class, a.getId(), b.getId()))
                .isEqualByComparingTo("575");
    }

    @Test
    void differentPlayersShareLockedCashAndCannotOverspendHalf() throws Exception {
        Club c = club("XQZ"); Player a = player("100"), b = player("100");
        assertThat(race(() -> market.buy(a.getId(), request(c)), () -> market.buy(b.getId(), request(c))))
                .containsExactlyInAnyOrder("OK", "CONFLICT");
        assertThat(jdbc.queryForObject("SELECT caixa FROM clubes WHERE id=?", BigDecimal.class, c.getId())).isEqualByComparingTo("195");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM jogadores WHERE clube_id=?", Integer.class, c.getId())).isEqualTo(1);
    }

    @Test
    void concurrentPlayerEditCannotOverwriteNewClubOwnership() throws Exception {
        Club c = club("XQZ"); Player p = player("25");
        var edit = new br.com.passebackend.player.dto.PlayerRequestDTO();
        edit.setName("Nome Atualizado"); edit.setPosition(PlayerPosition.MIDFIELDER); edit.setAgility(85); edit.setAge(25);
        assertThat(race(() -> market.buy(p.getId(), request(c)), () -> playerService.updatePlayer(p.getId(), edit)))
                .containsOnly("OK");
        assertThat(jdbc.queryForObject("SELECT clube_id FROM jogadores WHERE id=?", Integer.class, p.getId())).isEqualTo(c.getId());
        assertThat(jdbc.queryForObject("SELECT nome FROM jogadores WHERE id=?", String.class, p.getId())).isEqualTo("Nome Atualizado");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM contratos WHERE jogador_id=?", Integer.class, p.getId())).isEqualTo(1);
    }

    @Test
    void lastSquadSlotCannotBeTakenTwice() throws Exception {
        Club c = club("XQZ");
        for (int i = 0; i < 11; i++) {
            Player p = player("1");
            jdbc.update("UPDATE jogadores SET clube_id=? WHERE id=?", c.getId(), p.getId());
        }
        Player a = player("1"), b = player("1");
        assertThat(race(() -> market.buy(a.getId(), request(c)), () -> market.buy(b.getId(), request(c))))
                .containsExactlyInAnyOrder("OK", "CONFLICT");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM jogadores WHERE clube_id=?", Integer.class, c.getId())).isEqualTo(12);
        assertThat(jdbc.queryForObject("SELECT caixa FROM clubes WHERE id=?", BigDecimal.class, c.getId())).isEqualByComparingTo("299");
    }

    @Test
    void concurrentSalesCreditExactlyOnce() throws Exception {
        Club c = club("XQZ"); Player p = player("25"); market.buy(p.getId(), request(c));
        jdbc.update("UPDATE contratos SET fidelidade_ate=? WHERE jogador_id=?", DateTimeUtils.now().minusDays(1), p.getId());
        assertThat(race(() -> market.sell(p.getId()), () -> market.sell(p.getId())))
                .containsExactlyInAnyOrder("OK", "CONFLICT");
        assertThat(jdbc.queryForObject("SELECT caixa FROM clubes WHERE id=?", BigDecimal.class, c.getId())).isEqualByComparingTo("300");
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacoes WHERE jogador_id=?", Integer.class, p.getId())).isEqualTo(2);
        assertThat(jdbc.queryForObject("SELECT situacao FROM contratos WHERE jogador_id=?", String.class, p.getId())).isEqualTo("ENCERRADO");
    }

    @Test
    void failedHistoryWriteRollsBackPurchaseCashPlayerAndContract() {
        Club c = club("XQZ"); Player p = player("25");
        doThrow(new IllegalStateException("Injected history failure")).when(transactions).saveAndFlush(any(Transaction.class));
        assertThatThrownBy(() -> market.buy(p.getId(), request(c))).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT caixa FROM clubes WHERE id=?", BigDecimal.class, c.getId())).isEqualByComparingTo("300");
        assertThat(jdbc.queryForObject("SELECT clube_id FROM jogadores WHERE id=?", Integer.class, p.getId())).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM contratos WHERE jogador_id=?", Integer.class, p.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacoes WHERE jogador_id=?", Integer.class, p.getId())).isZero();
    }

    @Test
    void failedHistoryWriteRollsBackSaleIncludingLineupAndContractClosure() {
        Club c = club("XQZ"); Player p = player("25"); market.buy(p.getId(), request(c));
        new TransactionTemplate(manager).executeWithoutResult(status -> {
            Lineup l = new Lineup(); l.setClub(clubs.getReferenceById(c.getId())); l.setPlayer(players.getReferenceById(p.getId()));
            l.setCreatedAt(DateTimeUtils.now().withNano(0)); lineups.saveAndFlush(l);
        });
        doThrow(new IllegalStateException("Injected history failure")).when(transactions).saveAndFlush(any(Transaction.class));
        assertThatThrownBy(() -> market.sell(p.getId())).isInstanceOf(IllegalStateException.class);
        assertThat(jdbc.queryForObject("SELECT caixa FROM clubes WHERE id=?", BigDecimal.class, c.getId())).isEqualByComparingTo("275");
        assertThat(jdbc.queryForObject("SELECT clube_id FROM jogadores WHERE id=?", Integer.class, p.getId())).isEqualTo(c.getId());
        assertThat(jdbc.queryForObject("SELECT situacao FROM contratos WHERE jogador_id=?", String.class, p.getId())).isEqualTo("ATIVO");
        assertThat(jdbc.queryForObject("SELECT encerrado_em FROM contratos WHERE jogador_id=?", LocalDateTime.class, p.getId())).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM escalacoes WHERE jogador_id=?", Integer.class, p.getId())).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacoes WHERE jogador_id=?", Integer.class, p.getId())).isEqualTo(1);
    }
}
