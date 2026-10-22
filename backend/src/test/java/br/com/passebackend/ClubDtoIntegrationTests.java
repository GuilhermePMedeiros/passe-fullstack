package br.com.passebackend;

import java.util.UUID;

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

import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.dto.PlayerRequestDTO;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
@AutoConfigureMockMvc
@Transactional
class ClubDtoIntegrationTests {

    @DynamicPropertySource
    static void applicationDatabase(DynamicPropertyRegistry properties) {
        AuditPersistenceTests.applicationDatabase(properties);
    }

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    private ClubRepository clubs;

    @Autowired
    private PlayerRepository players;

    @Autowired
    private PlayerService playerService;

    @Test
    void createListAndDetailKeepExactClubJson() throws Exception {
        JsonNode created = createClub();
        int id = created.get("id").intValue();
        clubs.flush();

        var listResult = mvc.perform(get("/api/v1/clubs")).andExpect(status().isOk()).andReturn();
        JsonNode list = mapper.readTree(listResult.getResponse().getContentAsString());
        JsonNode found = null;
        for (JsonNode club : list) {
            if (club.get("id").intValue() == id) found = club;
        }
        assertThat(found).isEqualTo(created);
        assertThat(created.size()).isEqualTo(6);
        assertThat(created.has("players")).isFalse();
        assertThat(created.get("cash").decimalValue()).isEqualByComparingTo("300.00");
        assertThat(created.get("squad_value").decimalValue()).isEqualByComparingTo("0.00");
        assertThat(created.get("net_worth").decimalValue()).isEqualByComparingTo("300.00");

        mvc.perform(get("/api/v1/clubs/" + id))
                .andExpect(status().isOk()).andExpect(jsonPath("$.players").isEmpty())
                .andExpect(jsonPath("$.formation").doesNotExist())
                .andExpect(jsonPath("$.created_at").doesNotExist());
    }

    @Test
    void detailUsesPersistedPlayerAndCalculatedMarketValue() throws Exception {
        int clubId = createClub().get("id").intValue();
        PlayerRequestDTO request = new PlayerRequestDTO();
        request.setName("Meia Auditoria");
        request.setPosition(PlayerPosition.MIDFIELDER);
        request.setAgility(85);
        request.setAge(25);
        request.setPace(70);
        request.setShooting(68);
        request.setPassing(82);
        request.setDribbling(79);
        request.setDefending(55);
        request.setPhysical(64);
        request.setPotential(86);
        int playerId = playerService.createPlayer(request).getId();
        playerService.updatePlayerCondition(playerId, PlayerCondition.UNFIT);

        // Fixture for the existing relationship, not an implementation of buying a player.
        players.findById(playerId).orElseThrow().setClub(clubs.findById(clubId).orElseThrow());
        players.flush();

        mvc.perform(get("/api/v1/clubs/" + clubId))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cash").value(300))
                .andExpect(jsonPath("$.squad_value").value(37))
                .andExpect(jsonPath("$.net_worth").value(337))
                .andExpect(jsonPath("$.players[0].id").value(playerId))
                .andExpect(jsonPath("$.players[0].club_id").value(clubId))
                .andExpect(jsonPath("$.players[0].base_value").value(40))
                .andExpect(jsonPath("$.players[0].market_value").value(37))
                .andExpect(jsonPath("$.players[0].overall").value(75))
                .andExpect(jsonPath("$.players[0].condition").value("MAL_CONDICIONADO"))
                .andExpect(jsonPath("$.players[0].club").doesNotExist())
                .andExpect(jsonPath("$.players[0].created_at").doesNotExist())
                .andExpect(jsonPath("$.players[0].contract").doesNotExist());
    }

    private JsonNode createClub() throws Exception {
        String name = "Auditoria DTO " + UUID.randomUUID().toString().replace("-", "").replaceAll("[0-9]", "a");
        String body = "{\"name\":\"" + name + "\",\"acronym\":\"ADT\",\"cash\":1}";
        var result = mvc.perform(post("/api/v1/clubs").contentType("application/json").content(body))
                .andExpect(status().isCreated()).andExpect(content().contentTypeCompatibleWith("application/json"))
                .andReturn();
        JsonNode created = mapper.readTree(result.getResponse().getContentAsString());
        assertThat(result.getResponse().getHeader("Location")).isEqualTo("/api/v1/clubs/" + created.get("id").intValue());
        return created;
    }
}
