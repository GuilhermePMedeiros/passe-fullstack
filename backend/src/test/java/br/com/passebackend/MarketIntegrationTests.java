package br.com.passebackend;

import br.com.passebackend.lineup.LineupId;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
import br.com.passebackend.contract.ContractRepository;
import br.com.passebackend.contract.enums.ContractStatus;
import br.com.passebackend.lineup.Lineup;
import br.com.passebackend.lineup.LineupRepository;
import br.com.passebackend.market.MarketService;
import br.com.passebackend.market.dto.BuyRequestDTO;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import jakarta.persistence.EntityManager;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
@AutoConfigureMockMvc
@Transactional
class MarketIntegrationTests {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AuditPersistenceTests.applicationDatabase(properties); }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired ClubRepository clubs;
    @Autowired PlayerRepository players;
    @Autowired ContractRepository contracts;
    @Autowired LineupRepository lineups;
    @Autowired PlayerService playerService;
    @Autowired MarketService market;
    @Autowired JdbcTemplate jdbc;
    @Autowired EntityManager em;

    private Club club(String acronym, String cash) {
        return clubs.saveAndFlush(new Club(null, "Mercado " + UUID.randomUUID(), acronym, new BigDecimal(cash), null));
    }

    private Player player(String value) {
        return players.saveAndFlush(new Player(null, "Meia Lua", PlayerPosition.MIDFIELDER, 85, 25,
                new BigDecimal(value), PlayerCondition.FIT, null, 70, 68, 82, 79, 55, 64, 86));
    }

    private BuyRequestDTO request(Club c, int days) {
        BuyRequestDTO request = new BuyRequestDTO(); request.setClubId(c.getId());
        request.setLoyaltyUntil(DateTimeUtils.now().plusDays(days).withSecond(0).withNano(0));
        return request;
    }

    private String body(Club c) {
        return "{\"club_id\":" + c.getId() + ",\"loyalty_until\":\""
                + DateTimeUtils.now().plusDays(120).format(DateTimeFormatter.ofPattern("uuuu-MM-dd'T'HH:mm")) + "-03:00\"}";
    }

    @Test
    void officialPurchaseSaleClubContractHistoryAndCsv() throws Exception {
        Club c = club("XQZ", "300.00"); Player p = player("40.00");
        p.setCondition(PlayerCondition.UNFIT); players.flush();
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON).content(body(c)))
                .andExpect(status().isOk()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.value").value(37)).andExpect(jsonPath("$.fee").value(1.85))
                .andExpect(jsonPath("$.cash_change").value(-38.85)).andExpect(jsonPath("$.profit").isEmpty())
                .andExpect(jsonPath("$.contract.purchase_value").value(37)).andExpect(jsonPath("$.contract.status").value("ATIVO"))
                .andExpect(jsonPath("$.club_cash").value(261.15));
        mvc.perform(get("/api/v1/clubs/{id}", c.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.squad_value").value(37))
                .andExpect(jsonPath("$.net_worth").value(298.15))
                .andExpect(jsonPath("$.players[0].contract.remaining_days").value(120))
                .andExpect(jsonPath("$.players[0].contract.penalty_rate").value(10));
        var contract = contracts.findByPlayerIdAndStatus(p.getId(), ContractStatus.ACTIVE).getFirst();
        contract.setLoyaltyUntil(DateTimeUtils.now().plusDays(116).plusHours(17).plusMinutes(35).withNano(0));
        Lineup l = new Lineup(); l.setClub(c); l.setPlayer(p); l.setCreatedAt(DateTimeUtils.now().withNano(0));
        lineups.saveAndFlush(l); c.setFormation("2-1-1");
        playerService.updatePlayerCondition(p.getId(), PlayerCondition.FIT);
        mvc.perform(post("/api/v1/players/{id}/sell", p.getId()).contentType(MediaType.APPLICATION_JSON).content("invalid body ignored"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.value").value(40))
                .andExpect(jsonPath("$.purchase_value").value(37)).andExpect(jsonPath("$.remaining_days").value(117))
                .andExpect(jsonPath("$.penalty_rate").value(10)).andExpect(jsonPath("$.penalty").value(4))
                .andExpect(jsonPath("$.profit").value(3)).andExpect(jsonPath("$.fee").value(0.30))
                .andExpect(jsonPath("$.cash_change").value(35.70)).andExpect(jsonPath("$.club_cash").value(296.85))
                .andExpect(jsonPath("$.contract_status").value("RESCINDIDO"));
        assertThat(lineups.findById(new LineupId(c.getId(), p.getId()))).isEmpty();
        assertThat(c.getFormation()).isEqualTo("2-1-1");
        assertThat(p.getClub()).isNull();
        assertThat(contract.getEndedAt()).isNotNull();
        p.setName("Nome Alterado"); players.flush();
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].type").value("VENDA")).andExpect(jsonPath("$.data[0].player_name").value("Meia Lua"))
                .andExpect(jsonPath("$.summary.total_spent").value(38.85)).andExpect(jsonPath("$.summary.total_received").value(35.70))
                .andExpect(jsonPath("$.summary.total_fees").value(2.15)).andExpect(jsonPath("$.summary.total_penalties").value(4))
                .andExpect(jsonPath("$.summary.total_profit").value(3));
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId()).param("type", "VENDA").param("player_id", p.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.summary.total_spent").value(0)).andExpect(jsonPath("$.summary.total_fees").value(0.30));
        assertThat(jdbc.queryForObject("SELECT 300+SUM(variacao_caixa) FROM transacoes WHERE clube_id=?", BigDecimal.class, c.getId()))
                .isEqualByComparingTo(c.getCash());
        playerService.deletePlayer(p.getId());
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));
        for (String suffix : List.of("", "/export")) {
            mvc.perform(get("/api/v1/clubs/{id}/transactions" + suffix, c.getId()).param("player_id", p.getId().toString()))
                    .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
        }
    }

    @ParameterizedTest
    @CsvSource({"30,300,0,270", "30.01,300,1.50,268.49", "47.62,100,2.38,50"})
    void feeAndHalfCashInclusiveBoundary(String value, String cash, String fee, String expectedCash) {
        Club c = club("XQZ", cash); Player p = player(value);
        var result = market.buy(p.getId(), request(c, 1));
        assertThat(result.getFee()).isEqualByComparingTo(fee);
        assertThat(c.getCash()).isEqualByComparingTo(expectedCash);
    }

    @ParameterizedTest
    @CsvSource({"48,100", "124.36,261.15", "500,300"})
    void insufficientCashRejectsWithoutRoundingHalfUp(String value, String cash) throws Exception {
        Club c = club("XQZ", cash); Player p = player(value);
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON).content(body(c)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(c.getCash()).isEqualByComparingTo(cash);
        assertThat(p.getClub()).isNull();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacoes WHERE jogador_id=?", Integer.class, p.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM contratos WHERE jogador_id=?", Integer.class, p.getId())).isZero();
    }

    @Test
    void fullSquadAndRepeatOperationsAreConflicts() throws Exception {
        Club c = club("XQZ", "300");
        for (int n = 0; n < 12; n++) { Player p = player("1"); p.setClub(c); }
        players.flush(); Player free = player("1");
        mvc.perform(post("/api/v1/players/{id}/buy", free.getId()).contentType(MediaType.APPLICATION_JSON).content(body(c)))
                .andExpect(status().isConflict());
        mvc.perform(post("/api/v1/players/{id}/sell", free.getId())).andExpect(status().isConflict());
        assertThat(c.getCash()).isEqualByComparingTo("300");
    }

    @Test
    void expiredLoyaltyAndRepurchaseRules() throws Exception {
        Club c = club("XQZ", "300"), other = club("XQY", "300"); Player p = player("25");
        market.buy(p.getId(), request(c, 1));
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON).content(body(other)))
                .andExpect(status().isConflict());
        contracts.findByPlayerIdAndStatus(p.getId(), ContractStatus.ACTIVE).getFirst().setLoyaltyUntil(DateTimeUtils.now().minusDays(1));
        var result = market.sell(p.getId());
        assertThat(result.getContractStatus()).isEqualTo("ENCERRADO");
        assertThat(result.getRemainingDays()).isZero();
        assertThat(result.getPenalty()).isEqualByComparingTo("0");
        mvc.perform(post("/api/v1/players/{id}/sell", p.getId())).andExpect(status().isConflict());
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON).content(body(c)))
                .andExpect(status().isConflict());
        assertThat(market.buy(p.getId(), request(other, 1)).getContract().getStatus()).isEqualTo("ATIVO");
    }

    @Test
    void missingAndDeletedResourcesAre404() throws Exception {
        Club c = club("XQZ", "300"); Player p = player("25");
        for (String id : List.of("2147483647", "abc", "01", "0", "2147483648")) {
            for (String op : List.of("buy", "sell")) {
                mvc.perform(post("/api/v1/players/" + id + "/" + op).contentType(MediaType.APPLICATION_JSON).content(body(c)))
                        .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
            }
        }
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON)
                .content(body(c).replace("\"club_id\":" + c.getId(), "\"club_id\":2147483647"))).andExpect(status().isNotFound());
        p.setDeletedAt(DateTimeUtils.now()); players.flush();
        for (String op : List.of("buy", "sell")) mvc.perform(post("/api/v1/players/{id}/" + op, p.getId())
                .contentType(MediaType.APPLICATION_JSON).content(body(c))).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/clubs/2147483647/transactions")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId()).param("player_id", "2147483647"))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @ValueSource(strings = {"[]", "null", "true", "10", "\"x\"", "{} {}", "{", "{}",
            "{\"club_id\":\"1\"}", "{\"club_id\":true}", "{\"club_id\":null}", "{\"club_id\":1.5}",
            "{\"club_id\":0}", "{\"club_id\":-1}", "{\"club_id\":2147483648}",
            "{\"club_id\":1,\"loyalty_until\":20}", "{\"club_id\":1,\"loyalty_until\":null}",
            "{\"club_id\":1,\"loyaltyUntil\":\"2027-03-02T10:15-03:00\"}"})
    void strictJsonRejectsBeforeWrites(String body) throws Exception {
        Player p = player("25");
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(p.getClub()).isNull();
    }

    @Test
    void integralDecimalClubIdAndControlledFieldsAreAcceptedAndIgnored() throws Exception {
        Club c = club("XQZ", "300"); Player p = player("25");
        String json = body(c).replace("\"club_id\":" + c.getId(), "\"club_id\":" + c.getId() + ".0");
        json = json.substring(0, json.length() - 1) + ",\"cash\":999,\"value\":0,\"id\":99}";
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON).content(json))
                .andExpect(status().isOk()).andExpect(jsonPath("$.value").value(25)).andExpect(jsonPath("$.club_cash").value(275));
    }

    @ParameterizedTest
    @ValueSource(strings = {"type=", "type=compra", "type=COMPRA,COMPRA", "type=COMPRA,", "type=COMPRA, VENDA",
            "type=TROCA", "player_id=0", "player_id=01", "player_id=-1", "player_id=1.0", "player_id=", "player_id=2147483648"})
    void historyAndCsvShareStrictFilters(String filter) throws Exception {
        Club c = club("XQZ", "300"); String[] parts = filter.split("=", -1);
        for (String suffix : List.of("", "/export")) {
            mvc.perform(get("/api/v1/clubs/{id}/transactions" + suffix, c.getId()).param(parts[0], parts[1]))
                    .andExpect(status().isBadRequest()).andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                    .andExpect(jsonPath("$.message").isNotEmpty());
        }
    }

    @Test
    void csvEscapesSnapshotsAndAlwaysHasHeaderUtf8AndLf() throws Exception {
        Club c = club("XQZ", "300"); Player p = player("25");
        p.setName("Zé; \"Foguete\" Lima"); players.flush(); market.buy(p.getId(), request(c, 1));
        String csv = mvc.perform(get("/api/v1/clubs/{id}/transactions/export", c.getId()))
                .andExpect(status().isOk()).andExpect(content().contentType("text/csv;charset=UTF-8"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csv).startsWith("data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa\n")
                .contains(";COMPRA;\"Zé; \"\"Foguete\"\" Lima\";25,00;0,00;0,00;;-25,00\n")
                .doesNotContain("\r", "\uFEFF").endsWith("\n");
        String empty = mvc.perform(get("/api/v1/clubs/{id}/transactions/export", c.getId()).param("type", "VENDA"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(empty).isEqualTo(csv.substring(0, csv.indexOf('\n') + 1));
        Player withoutHistory = player("25");
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId()).param("player_id", withoutHistory.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty())
                .andExpect(jsonPath("$.summary.total_spent").value(0)).andExpect(jsonPath("$.summary.total_received").value(0))
                .andExpect(jsonPath("$.summary.total_fees").value(0)).andExpect(jsonPath("$.summary.total_penalties").value(0))
                .andExpect(jsonPath("$.summary.total_profit").value(0));
    }

    @Test
    void saleWithLossHasZeroCommissionAndPenaltyCeilingIsApplied() {
        Club c = club("XQZ", "300"); Player p = player("50");
        market.buy(p.getId(), request(c, 200));
        p.setAgility(50); p.setCondition(PlayerCondition.UNFIT); players.flush();
        var loss = market.sell(p.getId());
        assertThat(loss.getValue()).isEqualByComparingTo("42.50");
        assertThat(loss.getProfit()).isEqualByComparingTo("-7.50");
        assertThat(loss.getFee()).isEqualByComparingTo("0");
        assertThat(loss.getPenalty()).isEqualByComparingTo("8.50");
        assertThat(loss.getCashChange()).isEqualByComparingTo("34");
        Player expensive = player("75"); market.buy(expensive.getId(), request(c, 200));
        var capped = market.sell(expensive.getId());
        assertThat(capped.getPenalty()).isEqualByComparingTo("10");
        assertThat(capped.getCashChange()).isEqualByComparingTo("65");
    }

    @Test
    void historySortsDateThenIdAndCombinesBothTypeAndPlayerFiltersInDatabase() throws Exception {
        Club c = club("XQZ", "300"), other = club("XQY", "300");
        Player a = player("25"), b = player("20"), unrelated = player("1");
        var first = market.buy(a.getId(), request(c, 1));
        var second = market.buy(b.getId(), request(c, 1));
        market.buy(unrelated.getId(), request(other, 1));
        LocalDateTime sameTime = LocalDateTime.of(2026, 10, 21, 10, 0);
        jdbc.update("UPDATE transacoes SET criado_em=? WHERE clube_id=?", sameTime, c.getId()); em.clear();
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId()).param("type", "COMPRA,VENDA"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[0].id").value(second.getId())).andExpect(jsonPath("$.data[1].id").value(first.getId()));
        jdbc.update("UPDATE transacoes SET criado_em=? WHERE id=?", sameTime.plusDays(1), first.getId()); em.clear();
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].id").value(first.getId()));
        mvc.perform(get("/api/v1/clubs/{id}/transactions", c.getId()).param("type", "COMPRA").param("player_id", b.getId().toString()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(second.getId())).andExpect(jsonPath("$.summary.total_spent").value(20));
        String csv = mvc.perform(get("/api/v1/clubs/{id}/transactions/export", c.getId()).param("type", "COMPRA")
                .param("player_id", b.getId().toString())).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csv.lines().count()).isEqualTo(2);
        assertThat(csv).contains("2026-10-21T10:00:00-03:00;COMPRA;Meia Lua;20,00;0,00;0,00;;-20,00\n");
    }

    @ParameterizedTest
    @ValueSource(strings = {"2020-01-01T10:00-03:00", "2099-01-01T10:00-03:00", "2027-02-30T10:15-03:00",
            "2027-03-02T24:00-03:00", "2027-03-02T10:15:00-03:00", "2027-03-02T10:15Z"})
    void loyaltyDateErrorsAre400AndLeaveNoHistory(String loyalty) throws Exception {
        Club c = club("XQZ", "300"); Player p = player("25");
        mvc.perform(post("/api/v1/players/{id}/buy", p.getId()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"club_id\":" + c.getId() + ",\"loyalty_until\":\"" + loyalty + "\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM transacoes WHERE jogador_id=?", Integer.class, p.getId())).isZero();
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM contratos WHERE jogador_id=?", Integer.class, p.getId())).isZero();
        assertThat(c.getCash()).isEqualByComparingTo("300");
    }
}
