package br.com.passebackend;

import static org.assertj.core.api.Assertions.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.contract.Contract;
import br.com.passebackend.contract.ContractRepository;
import br.com.passebackend.contract.enums.ContractStatus;
import br.com.passebackend.lineup.Lineup;
import br.com.passebackend.lineup.LineupId;
import br.com.passebackend.lineup.LineupRepository;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.match.Match;
import br.com.passebackend.match.MatchRepository;
import br.com.passebackend.match.MatchDuel;
import br.com.passebackend.match.MatchDuelRepository;
import br.com.passebackend.match.enums.DuelAttribute;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import br.com.passebackend.transaction.Transaction;
import br.com.passebackend.transaction.TransactionRepository;
import br.com.passebackend.transaction.enums.TransactionType;
import jakarta.persistence.EntityManager;

/** Real MySQL, additive schema applied separately; all fixture writes roll back. */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
@Transactional
class RemainingEntitiesPersistenceTests {
    @DynamicPropertySource
    static void applicationDatabase(DynamicPropertyRegistry properties) {
        AuditPersistenceTests.applicationDatabase(properties);
    }

    @Autowired ClubRepository clubs;
    @Autowired PlayerRepository players;
    @Autowired ContractRepository contracts;
    @Autowired TransactionRepository transactions;
    @Autowired LineupRepository lineups;
    @Autowired MatchRepository matches;
    @Autowired MatchDuelRepository duels;
    @Autowired EntityManager em;
    @Autowired JdbcTemplate jdbc;

    private final LocalDateTime now = LocalDateTime.of(2026, 10, 21, 12, 30, 45);

    private Club club(String acronym) {
        return clubs.saveAndFlush(new Club(null, "Teste " + UUID.randomUUID(), acronym,
                new BigDecimal("300.00"), null));
    }

    private Player player(Club club) {
        return players.saveAndFlush(new Player(null, "Nome Original", PlayerPosition.STRIKER,
                85, 25, new BigDecimal("37.00"), PlayerCondition.FIT, club,
                70, 75, 70, 70, 70, 70, 80));
    }

    private Contract contract(Club club, Player player) {
        Contract c = new Contract();
        c.setClub(club); c.setPlayer(player); c.setPurchaseValue(new BigDecimal("37.01"));
        c.setLoyaltyUntil(now.plusDays(120)); c.setStatus(ContractStatus.ACTIVE);
        c.setStartedAt(now);
        return contracts.saveAndFlush(c);
    }

    private Transaction transaction(Club club, Player player) {
        Transaction t = new Transaction();
        t.setClub(club); t.setPlayer(player); t.setPlayerName(player.getName());
        t.setType(TransactionType.PURCHASE); t.setValue(new BigDecimal("37.01"));
        t.setFee(new BigDecimal("1.85")); t.setPenalty(new BigDecimal("0.00"));
        t.setCashChange(new BigDecimal("-38.86")); t.setCreatedAt(now);
        return transactions.saveAndFlush(t);
    }

    private Lineup lineup(Club club, Player player) {
        Lineup l = new Lineup(); l.setClub(club); l.setPlayer(player); l.setCreatedAt(now);
        return lineups.saveAndFlush(l);
    }

    private Match match(Club home, Club away) {
        Match m = new Match(); m.setHomeClub(home); m.setAwayClub(away);
        m.setHomeGoals(0); m.setAwayGoals(3);
        m.setHomeFormation(Formation.TWO_ONE_ONE); m.setAwayFormation(Formation.ONE_TWO_ONE);
        m.setPlayedAt(now);
        return matches.saveAndFlush(m);
    }

    private MatchDuel duel(Match match, Player attacker, Player defender, int order) {
        MatchDuel d = new MatchDuel(); d.setMatch(match); d.setOrder(order);
        d.setAttackingClub(match.getHomeClub()); d.setAttacker(attacker); d.setDefender(defender);
        d.setAttackerName(attacker.getName()); d.setDefenderName(defender.getName());
        d.setAttackerPosition(PlayerPosition.STRIKER); d.setDefenderPosition(PlayerPosition.GOALKEEPER);
        d.setAttackerCondition(PlayerCondition.UNFIT); d.setDefenderCondition(PlayerCondition.FIT);
        d.setAttackAttribute(DuelAttribute.SHOOTING); d.setDefenseAttribute(DuelAttribute.DEFENDING);
        d.setAttackValue(63); d.setDefenseValue(63); d.setGoal(false);
        return duels.saveAndFlush(d);
    }

    @Test
    void allRepositoriesRoundTripWithExactValuesDatesAndSnapshots() {
        Club home = club("XQZ"), away = club("XQY");
        Player attacker = player(home), defender = player(away);
        Contract c = contract(home, attacker);
        Transaction t = transaction(home, attacker);
        lineup(home, attacker);
        Match m = match(home, away);
        for (int order = 1; order <= 6; order++) duel(m, attacker, defender, order);
        attacker.setName("Nome Alterado"); attacker.setCondition(PlayerCondition.SICK);
        attacker.setDeletedAt(now); attacker.setClub(null);
        em.flush(); em.clear();

        Contract loaded = contracts.findById(c.getId()).orElseThrow();
        assertThat(loaded.getPurchaseValue()).isEqualByComparingTo("37.01");
        assertThat(loaded.getLoyaltyUntil()).isEqualTo(now.plusDays(120));
        assertThat(loaded.getStartedAt()).isEqualTo(now);
        assertThat(loaded.getEndedAt()).isNull();
        assertThat(loaded.getStatus()).isEqualTo(ContractStatus.ACTIVE);
        assertThat(loaded.getClub().getId()).isEqualTo(home.getId());
        assertThat(loaded.getPlayer().getId()).isEqualTo(attacker.getId());
        Transaction history = transactions.findById(t.getId()).orElseThrow();
        assertThat(history.getType()).isEqualTo(TransactionType.PURCHASE);
        assertThat(history.getPlayerName()).isEqualTo("Nome Original");
        assertThat(history.getValue()).isEqualByComparingTo("37.01");
        assertThat(history.getFee()).isEqualByComparingTo("1.85");
        assertThat(history.getPenalty()).isEqualByComparingTo("0");
        assertThat(history.getProfit()).isNull();
        assertThat(history.getCashChange()).isEqualByComparingTo("-38.86");
        assertThat(history.getCreatedAt()).isEqualTo(now);
        assertThat(lineups.findById(new LineupId(home.getId(), attacker.getId())).orElseThrow()
                .getCreatedAt()).isEqualTo(now);
        Match result = matches.findById(m.getId()).orElseThrow();
        assertThat(result.getHomeGoals()).isZero(); assertThat(result.getAwayGoals()).isEqualTo(3);
        assertThat(result.getHomeFormation()).isEqualTo(Formation.TWO_ONE_ONE);
        assertThat(result.getAwayFormation()).isEqualTo(Formation.ONE_TWO_ONE);
        assertThat(result.getPlayedAt()).isEqualTo(now);
        var rows = jdbc.queryForList("SELECT * FROM duelos_partida WHERE partida_id=? ORDER BY ordem", m.getId());
        assertThat(rows).hasSize(6);
        assertThat(rows).allSatisfy(row -> {
            assertThat(row.get("nome_atacante")).isEqualTo("Nome Original");
            assertThat(row.get("posicao_atacante")).isEqualTo("ATA");
            assertThat(row.get("condicao_atacante")).isEqualTo("MAL_CONDICIONADO");
            assertThat(row.get("atributo_ataque")).isEqualTo("shooting");
            assertThat(row.get("valor_ataque")).isEqualTo(63);
        });
        Integer id = ((Number) rows.getFirst().get("id")).intValue();
        MatchDuel snapshot = duels.findById(id).orElseThrow();
        assertThat(snapshot.getAttackerCondition()).isEqualTo(PlayerCondition.UNFIT);
        assertThat(snapshot.getDefenderPosition()).isEqualTo(PlayerPosition.GOALKEEPER);
        assertThat(snapshot.getAttackAttribute()).isEqualTo(DuelAttribute.SHOOTING);
        assertThat(snapshot.getDefenseAttribute()).isEqualTo(DuelAttribute.DEFENDING);
        assertThat(snapshot.getGoal()).isFalse();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ENCERRADO", "RESCINDIDO"})
    void contractKeepsHistoricalPurchasesAndEndDates(String code) {
        Club home = club("XQZ"); Player p = player(home);
        Contract first = contract(home, p);
        first.setStatus(ContractStatus.fromCode(code)); first.setEndedAt(now.plusDays(1));
        contracts.flush();
        Contract second = contract(home, p);
        em.clear();
        assertThat(contracts.findById(first.getId()).orElseThrow().getEndedAt()).isEqualTo(now.plusDays(1));
        assertThat(contracts.findById(first.getId()).orElseThrow().getStatus()).isEqualTo(ContractStatus.fromCode(code));
        assertThat(contracts.existsById(second.getId())).isTrue();
    }

    @Test
    void saleStoresNegativeProfitAndPositiveCashChange() {
        Club home = club("XQZ"); Transaction t = transaction(home, player(home));
        t.setType(TransactionType.SALE); t.setProfit(new BigDecimal("-7.50"));
        t.setValue(new BigDecimal("29.51")); t.setFee(BigDecimal.ZERO);
        t.setPenalty(new BigDecimal("2.95")); t.setCashChange(new BigDecimal("26.56"));
        transactions.flush(); em.clear();
        Transaction loaded = transactions.findById(t.getId()).orElseThrow();
        assertThat(loaded.getType()).isEqualTo(TransactionType.SALE);
        assertThat(loaded.getProfit()).isEqualByComparingTo("-7.50");
        assertThat(loaded.getCashChange()).isEqualByComparingTo("26.56");
    }

    @Test
    void lineupHasCompositePrimaryKeyAndPlayerIsUniqueAcrossClubs() {
        Club home = club("XQZ"), away = club("XQY"); Player p = player(home);
        lineup(home, p);
        assertThatThrownBy(() -> jdbc.update(
                "INSERT INTO escalacoes (clube_id,jogador_id,criado_em) VALUES (?,?,?)", away.getId(), p.getId(), now))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.queryForList("SELECT column_name FROM information_schema.key_column_usage "
                + "WHERE table_schema=DATABASE() AND table_name='escalacoes' AND constraint_name='PRIMARY' "
                + "ORDER BY ordinal_position", String.class)).containsExactly("clube_id", "jogador_id");
    }

    @Test
    void databaseRejectsMissingRequiredFieldsAndInvalidForeignKeys() {
        assertThatThrownBy(() -> jdbc.update("INSERT INTO contratos (jogador_id,clube_id,valor_compra,fidelidade_ate,situacao,iniciado_em) "
                + "VALUES (2147483647,2147483647,37,?,'ATIVO',?)", now, now))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThatThrownBy(() -> jdbc.update("INSERT INTO partidas (mandante_id) VALUES (NULL)"))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM information_schema.key_column_usage WHERE "
                + "table_schema=DATABASE() AND table_name IN ('contratos','transacoes','escalacoes','partidas','duelos_partida') "
                + "AND referenced_table_name IS NOT NULL", Integer.class)).isEqualTo(12);
    }

    @Test
    void duelOrderIsUniqueWithinMatchButMayRepeatInAnotherMatch() {
        Club home = club("XQZ"), away = club("XQY"); Player p = player(home), q = player(away);
        Match m = match(home, away); duel(m, p, q, 1);
        assertThatCode(() -> duel(match(home, away), p, q, 1)).doesNotThrowAnyException();
        assertThatThrownBy(() -> jdbc.update("UPDATE duelos_partida SET ordem=7 WHERE partida_id=?", m.getId()))
                .hasRootCauseInstanceOf(java.sql.SQLException.class).hasMessageContaining("error code [3819]");
        duel(m, p, q, 2);
        assertThatThrownBy(() -> jdbc.update("UPDATE duelos_partida SET ordem=1 WHERE partida_id=? AND ordem=2", m.getId()))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void databaseChecksScoreAndSnapshotDomains() {
        Club home = club("XQZ"), away = club("XQY"); Player p = player(home), q = player(away);
        Match m = match(home, away); MatchDuel d = duel(m, p, q, 1);
        for (String assignment : List.of("gols_mandante=-1", "gols_visitante=4", "visitante_id=mandante_id", "formacao_mandante='4-0'")) {
            assertThatThrownBy(() -> jdbc.update("UPDATE partidas SET " + assignment + " WHERE id=?", m.getId()))
                    .hasRootCauseInstanceOf(java.sql.SQLException.class).hasMessageContaining("error code [3819]");
        }
        for (String assignment : List.of("condicao_atacante='DOENTE'", "posicao_defensor='XXX'", "atributo_ataque='pace'")) {
            assertThatThrownBy(() -> jdbc.update("UPDATE duelos_partida SET " + assignment + " WHERE id=?", d.getId()))
                    .hasRootCauseInstanceOf(java.sql.SQLException.class).hasMessageContaining("error code [3819]");
        }
        Contract c = contract(home, p); Transaction t = transaction(home, p);
        assertThatThrownBy(() -> jdbc.update("UPDATE contratos SET situacao='INVALIDO' WHERE id=?", c.getId()))
                .hasRootCauseInstanceOf(java.sql.SQLException.class).hasMessageContaining("error code [3819]");
        assertThatThrownBy(() -> jdbc.update("UPDATE transacoes SET tipo='TROCA' WHERE id=?", t.getId()))
                .hasRootCauseInstanceOf(java.sql.SQLException.class).hasMessageContaining("error code [3819]");
    }

    @Test
    void schemaHasExactOfficialColumnsNullabilityAndMonetaryTypes() {
        Map<String, String> expected = Map.of(
                "contratos", "id,jogador_id,clube_id,valor_compra,fidelidade_ate,situacao,iniciado_em,encerrado_em",
                "transacoes", "id,clube_id,jogador_id,nome_jogador,tipo,valor,taxa,multa,lucro,variacao_caixa,criado_em",
                "escalacoes", "clube_id,jogador_id,criado_em",
                "partidas", "id,mandante_id,visitante_id,gols_mandante,gols_visitante,formacao_mandante,formacao_visitante,jogada_em",
                "duelos_partida", "id,partida_id,ordem,clube_atacante_id,atacante_id,defensor_id,nome_atacante,nome_defensor,posicao_atacante,posicao_defensor,condicao_atacante,condicao_defensor,atributo_ataque,atributo_defesa,valor_ataque,valor_defesa,gol");
        expected.forEach((table, columns) -> {
            var metadata = jdbc.queryForList("SELECT column_name,is_nullable,data_type,column_type FROM information_schema.columns "
                    + "WHERE table_schema=DATABASE() AND table_name=? ORDER BY ordinal_position", table);
            assertThat(metadata.stream().map(row -> (String) row.get("column_name"))).containsExactly(columns.split(","));
            metadata.forEach(row -> assertThat(row.get("is_nullable"))
                    .isEqualTo(List.of("encerrado_em", "lucro").contains(row.get("column_name")) ? "YES" : "NO"));
            metadata.stream().filter(row -> ((String) row.get("column_name")).endsWith("_em")
                    || row.get("column_name").equals("fidelidade_ate"))
                    .forEach(row -> assertThat(row.get("data_type")).isEqualTo("timestamp"));
        });
        Map<String, String> monetary = Map.of("valor", "decimal(6,2)", "taxa", "decimal(6,2)",
                "multa", "decimal(6,2)", "lucro", "decimal(7,2)", "variacao_caixa", "decimal(8,2)");
        monetary.forEach((column, type) -> assertThat(jdbc.queryForObject("SELECT column_type FROM information_schema.columns "
                + "WHERE table_schema=DATABASE() AND table_name='transacoes' AND column_name=?", String.class, column)).isEqualTo(type));
        assertThat(jdbc.queryForObject("SELECT column_type FROM information_schema.columns WHERE table_schema=DATABASE() "
                + "AND table_name='contratos' AND column_name='valor_compra'", String.class)).isEqualTo("decimal(6,2)");
    }
}
