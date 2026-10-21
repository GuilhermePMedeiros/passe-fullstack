package br.com.passebackend;

import br.com.passebackend.club.Club;
import br.com.passebackend.nucleo.util.StringUtils;
import br.com.passebackend.player.Player;
import java.nio.charset.StandardCharsets;
import java.util.TimeZone;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import br.com.passebackend.nucleo.util.DateTimeUtils;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
@AutoConfigureMockMvc
@Transactional
class FinalComplianceTests {
    @DynamicPropertySource
    static void database(DynamicPropertyRegistry properties) { AuditPersistenceTests.applicationDatabase(properties); }

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;

    @Test
    void entityTimestampsUseBrasiliaEvenWhenJvmDefaultIsUtc() {
        var original = TimeZone.getDefault();
        try {
            TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
            var before = DateTimeUtils.now();
            var club = new Club();
            club.onCreate();
            var player = new Player();
            ReflectionTestUtils.invokeMethod(player, "onCreate");
            var after = DateTimeUtils.now();
            assertThat(club.getCreatedAt()).isBetween(before, after);
            assertThat(player.getCreatedAt()).isBetween(before, after);
        } finally {
            TimeZone.setDefault(original);
        }
    }

    private JsonNode postJson(String route, String body) throws Exception {
        var response = mvc.perform(post("/api/v1" + route).contentType("application/json").content(body))
                .andReturn().getResponse();
        assertThat(response.getStatus()).isBetween(200, 201);
        return mapper.readTree(response.getContentAsString());
    }

    private int createPlayer(String name, String position, int age, int agility, int potential) throws Exception {
        return postJson("/players", """
                {"name":"%s","position":"%s","age":%d,"agility":%d,
                 "pace":70,"shooting":70,"passing":70,"dribbling":70,"defending":70,"physical":70,"potential":%d}
                """.formatted(name, position, age, agility, potential)).get("id").intValue();
    }

    @Test
    void sequentialPurchasesReconcileContractsSquadPatrimonyAndFilteredHistory() throws Exception {
        int club = postJson("/clubs", "{\"name\":\"Águias FC\",\"acronym\":\"AGU\"}").get("id").intValue();
        int other = postJson("/clubs", "{\"name\":\"Delta FC\",\"acronym\":\"DEL\"}").get("id").intValue();
        int young = createPlayer("Álvaro Lima", "GOL", 20, 50, 86);
        int unfit = createPlayer("João Silva", "MEI", 25, 85, 86);
        int older = createPlayer("Beto; Lima", "ZAG", 33, 30, 70);
        mvc.perform(patch("/api/v1/players/{id}/condition", unfit).contentType("application/json")
                .content("{\"condition\":\"MAL_CONDICIONADO\"}")).andExpect(status().isOk());
        mvc.perform(patch("/api/v1/players/{id}/condition", older).contentType("application/json")
                .content("{\"condition\":\"DOENTE\"}")).andExpect(status().isOk());
        String loyalty = DateTimeUtils.now().plusDays(120).withSecond(0).withNano(0).toString() + "-03:00";
        String buy = "{\"club_id\":" + club + ",\"loyalty_until\":\"" + loyalty + "\"}";
        assertThat(postJson("/players/" + young + "/buy", buy).get("club_cash").decimalValue()).isEqualByComparingTo("259.81");
        assertThat(postJson("/players/" + unfit + "/buy", buy).get("club_cash").decimalValue()).isEqualByComparingTo("232.06");
        assertThat(postJson("/players/" + older + "/buy", buy).get("club_cash").decimalValue()).isEqualByComparingTo("214.06");
        mvc.perform(get("/api/v1/clubs/{id}", club)).andExpect(status().isOk())
                .andExpect(jsonPath("$.squad_value").value(84.03)).andExpect(jsonPath("$.net_worth").value(298.09))
                .andExpect(jsonPath("$.players[0].id").value(young)).andExpect(jsonPath("$.players[1].id").value(older))
                .andExpect(jsonPath("$.players[2].id").value(unfit))
                .andExpect(jsonPath("$.players[0].contract.remaining_days").value(120))
                .andExpect(jsonPath("$.players[1].contract.penalty_rate").value(10));
        mvc.perform(get("/api/v1/clubs").param("sort", "net_worth_desc"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(other));
        mvc.perform(get("/api/v1/players").param("club_id", "" + club).param("free", "false"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.meta.total_items").value(3));
        mvc.perform(delete("/api/v1/players/{id}", unfit)).andExpect(status().isConflict());
        mvc.perform(put("/api/v1/players/{id}", unfit).contentType("application/json")
                .content("{\"name\":\"João Silva\",\"position\":\"ATA\",\"age\":25,\"agility\":85}"))
                .andExpect(status().isConflict());
        assertThat(postJson("/players/" + older + "/sell", "ignored").get("club_cash").decimalValue()).isEqualByComparingTo("230.26");
        mvc.perform(get("/api/v1/clubs/{id}/transactions", club).param("type", "VENDA"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.summary.total_received").value(16.2))
                .andExpect(jsonPath("$.summary.total_penalties").value(1.8)).andExpect(jsonPath("$.summary.total_spent").value(0));
        String csv = mvc.perform(get("/api/v1/clubs/{id}/transactions/export", club).param("type", "VENDA"))
                .andExpect(status().isOk()).andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);
        assertThat(csv).contains(";VENDA;\"Beto; Lima\";18,00;0,00;1,80;0,00;16,20\n");
    }

    @Test
    void orderingUsesUnicodeCodePointsIncludingSupplementaryLetters() {
        assertThat(StringUtils.compareNames("ﬀ Silva", "𐐀 Silva")).isNegative();
        assertThat(StringUtils.compareNames("Águia Silva", "aguia silva")).isZero();
        assertThat(StringUtils.compareNames("Ana Lima", "Ana-Maria")).isNegative();
    }

    @Test
    void nameCountsWordsContainingLettersAndAllowsAdditionalPunctuation() throws Exception {
        String body = """
                {"name":"  João   Silva -  ","position":"MEI","agility":85,"age":25,
                 "pace":70,"shooting":68,"passing":82,"dribbling":79,"defending":55,"physical":64,"potential":86}
                """;
        mvc.perform(post("/api/v1/players").contentType("application/json").content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("João Silva -"));
        mvc.perform(post("/api/v1/players").contentType("application/json").content(body.replace("João   Silva -", "João -")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void getAndDeleteIgnoreBodyAndRetainResponseContract() throws Exception {
        mvc.perform(get("/api/v1/players").contentType("application/json").content("invalid body"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.meta").exists());
        mvc.perform(delete("/api/v1/players/abc").contentType("application/json").content("invalid body"))
                .andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
    }
}
