package br.com.passebackend;

import br.com.passebackend.contract.ContractService;
import br.com.passebackend.lineup.LineupRepository;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import org.springframework.dao.DataIntegrityViolationException;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import com.fasterxml.jackson.databind.ObjectMapper;
import br.com.passebackend.club.*;
import br.com.passebackend.config.WebConfig;
import br.com.passebackend.player.*;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** MVC slice with real services, mocked repositories: NOT persistence integration. */
@WebMvcTest(controllers = {PlayerController.class, ClubController.class},
        properties = "app.cors-origin=http://localhost:5173")
@Import({PlayerService.class, ClubService.class, WebConfig.class})
class AuditApiTests {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @MockitoBean PlayerRepository players;
    @MockitoBean ClubRepository clubs;
    @MockitoBean ContractService contracts;
    @MockitoBean LineupRepository lineups;
    private Map<Integer, Player> playerRows;
    private Map<Integer, Club> clubRows;

    @BeforeEach
    void repositories() {
        playerRows = new HashMap<>();
        clubRows = new HashMap<>();
        AtomicInteger playerIds = new AtomicInteger();
        AtomicInteger clubIds = new AtomicInteger();
        when(players.findActivePlayers(any(), any(), any(), any(), any(), any())).thenAnswer(i -> {
            List<Player> result = new ArrayList<>();
            PlayerPosition position = i.getArgument(0);
            PlayerCondition condition = i.getArgument(1);
            Boolean free = i.getArgument(2);
            Integer clubId = i.getArgument(3);
            Integer minAge = i.getArgument(4);
            Integer maxAge = i.getArgument(5);
            for (Player player : playerRows.values()) {
                if (player.getDeletedAt() != null) continue;
                if (position != null && player.getPosition() != position) continue;
                if (condition != null && player.getCondition() != condition) continue;
                if (free != null && free != (player.getClub() == null)) continue;
                if (clubId != null && (player.getClub() == null || !clubId.equals(player.getClub().getId()))) continue;
                if (minAge != null && player.getAge() < minAge) continue;
                if (maxAge != null && player.getAge() > maxAge) continue;
                result.add(player);
            }
            return result;
        });
        when(players.findByClubIdAndDeletedAtIsNull(any())).thenAnswer(i -> {
            List<Player> result = new ArrayList<>();
            for (Player player : playerRows.values()) {
                if (player.getDeletedAt() == null && player.getClub() != null
                        && player.getClub().getId().equals(i.getArgument(0))) result.add(player);
            }
            return result;
        });
        when(players.findByClubIdInAndDeletedAtIsNull(any())).thenAnswer(i -> {
            List<Integer> ids = i.getArgument(0);
            List<Player> result = new ArrayList<>();
            for (Player player : playerRows.values()) {
                if (player.getDeletedAt() == null && player.getClub() != null
                        && ids.contains(player.getClub().getId())) result.add(player);
            }
            return result;
        });
        when(players.findById(any())).thenAnswer(i -> Optional.ofNullable(playerRows.get(i.getArgument(0))));
        when(players.findActiveForUpdate(any())).thenAnswer(i -> Optional.ofNullable(playerRows.get(i.getArgument(0))));
        when(players.save(any())).thenAnswer(i -> {
            Player p = i.getArgument(0);
            if (p.getId() == null) p.setId(playerIds.incrementAndGet());
            playerRows.put(p.getId(), p);
            return p;
        });
        when(clubs.findAll()).thenAnswer(i -> new ArrayList<>(clubRows.values()));
        when(clubs.existsByName(any())).thenAnswer(i -> clubRows.values().stream()
                .anyMatch(club -> club.getName().equalsIgnoreCase(i.getArgument(0))));
        when(clubs.existsByAcronym(any())).thenAnswer(i -> clubRows.values().stream()
                .anyMatch(club -> club.getAcronym().equals(i.getArgument(0))));
        when(clubs.findById(any())).thenAnswer(i -> Optional.ofNullable(clubRows.get(i.getArgument(0))));
        when(clubs.existsById(any())).thenAnswer(i -> clubRows.containsKey(i.getArgument(0)));
        when(clubs.count()).thenAnswer(i -> (long) clubRows.size());
        when(clubs.save(any())).thenAnswer(i -> {
            Club c = i.getArgument(0);
            if (c.getId() == null) c.setId(clubIds.incrementAndGet());
            clubRows.put(c.getId(), c);
            return c;
        });
    }

    private Map<String, Object> valid() {
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Meia Lua"); body.put("position", "MEI");
        body.put("agility", 85); body.put("age", 25);
        body.put("pace", 70); body.put("shooting", 68); body.put("passing", 82);
        body.put("dribbling", 79); body.put("defending", 55); body.put("physical", 64);
        body.put("potential", 86);
        return body;
    }

    private void create() throws Exception {
        mvc.perform(post("/api/v1/players").contentType("application/json")
                .content(mapper.writeValueAsString(valid())))
                .andExpect(status().isCreated()).andExpect(header().string("Location", "/api/v1/players/1"))
                .andExpect(jsonPath("$.base_value").value(40)).andExpect(jsonPath("$.overall").value(75))
                .andExpect(jsonPath("$.condition").value("APTO"));
    }

    @Test void createReadUpdateAndIgnoreControlledFields() throws Exception {
        Map<String, Object> body = valid();
        body.put("base_value", 500); body.put("club_id", 99); body.put("condition", "DOENTE");
        body.put("overall", 1); body.put("id", 99); body.put("market_value", 500);
        body.put("name", "  Meia   Lua ");
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").value(1))
                .andExpect(jsonPath("$.name").value("Meia Lua")).andExpect(jsonPath("$.base_value").value(40))
                .andExpect(jsonPath("$.club_id").isEmpty()).andExpect(jsonPath("$.condition").value("APTO"));
        mvc.perform(get("/api/v1/players/1")).andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"));
        mvc.perform(put("/api/v1/players/1").contentType("application/json")
                .content("{\"name\":\"Meia Lua\",\"position\":\"ATA\",\"agility\":80,\"age\":33,\"pace\":1,\"potential\":1,\"base_value\":1}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.base_value").value(40))
                .andExpect(jsonPath("$.pace").value(70)).andExpect(jsonPath("$.potential").value(86))
                .andExpect(jsonPath("$.overall").value(72));
    }

    @ParameterizedTest @ValueSource(strings = {"[]", "10", "\"x\"", "null", "{", "", "{}"})
    void invalidBodies(String body) throws Exception {
        mvc.perform(post("/api/v1/players").contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        verify(players, never()).save(any());
    }

    @ParameterizedTest @ValueSource(strings = {"name", "position", "agility", "age", "pace", "shooting", "passing", "dribbling", "defending", "physical", "potential"})
    void missingAndNullRequiredFields(String field) throws Exception {
        Map<String, Object> body = valid();
        body.remove(field);
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        body.put(field, null);
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        verify(players, never()).save(any());
    }

    @ParameterizedTest @ValueSource(strings = {"A", "Fulano", "   ", "Joao 1Silva", "Joao\tSilva", "Joao\nSilva", "Joao -"})
    void invalidPlayerNames(String name) throws Exception {
        Map<String, Object> body = valid(); body.put("name", name);
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(body)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        verify(players, never()).save(any());
    }

    @ParameterizedTest @ValueSource(strings = {"agility", "age", "pace", "shooting", "passing", "dribbling", "defending", "physical", "potential"})
    void rejectsTextAndFractions(String field) throws Exception {
        for (Object value : List.of("50", 50.5, true)) {
            Map<String, Object> body = valid(); body.put(field, value);
            mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(body)))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        }
        verify(players, never()).save(any());
    }

    @Test void numericBoundariesAndCrossFieldRules() throws Exception {
        for (int age : new int[]{15,46}) reject("age", age);
        for (int agility : new int[]{0,101}) reject("agility", agility);
        for (String field : List.of("pace","shooting","passing","dribbling","defending","physical","potential")) {
            reject(field, 0); reject(field, 100);
        }
        reject("potential", 81);
        reject("age", 35); // agility 85 is valid, but potential 86 != maximum 82 at age 35
        Map<String,Object> b = valid(); b.put("age", 35); b.put("potential",82); b.put("agility",86);
        rejected(b);
        b = valid(); for (String field : List.of("pace","shooting","passing","dribbling","defending","physical")) b.put(field,81);
        rejected(b);
        b = valid(); b.put("agility",50.0); b.put("age",16.0);
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(b))).andExpect(status().isCreated());
    }
    private void reject(String field, Object value) throws Exception {
        Map<String,Object> b = valid(); b.put(field,value); rejected(b);
    }
    private void rejected(Map<String,Object> b) throws Exception {
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(b)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @ParameterizedTest @ValueSource(strings = {"abc","0","-1","01","1.5","2147483648","999"})
    void invalidAndMissingIds(String id) throws Exception {
        mvc.perform(get("/api/v1/players/"+id)).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(get("/api/v1/clubs/"+id)).andExpect(status().isNotFound()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test void conditionConflictsAndDelete() throws Exception {
        create();
        for (String c : List.of("DOENTE", "DOENTE")) {
            mvc.perform(patch("/api/v1/players/1/condition").contentType("application/json").content("{\"condition\":\""+c+"\",\"name\":\"Ignore Me\"}"))
                    .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Meia Lua"));
        }
        mvc.perform(patch("/api/v1/players/1/condition").contentType("application/json").content("{\"condition\":\"APTO\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(patch("/api/v1/players/1/condition").contentType("application/json").content("{\"condition\":\"MAL_CONDICIONADO\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.market_value").value(37));
        mvc.perform(delete("/api/v1/players/1")).andExpect(status().isNoContent()).andExpect(content().string(""));
        assertThat(playerRows.get(1).getDeletedAt()).isNotNull();
        mvc.perform(get("/api/v1/players/1")).andExpect(status().isNotFound());
        mvc.perform(delete("/api/v1/players/1")).andExpect(status().isNotFound());
        mvc.perform(put("/api/v1/players/1").contentType("application/json").content(mapper.writeValueAsString(valid()))).andExpect(status().isNotFound());
        mvc.perform(patch("/api/v1/players/1/condition").contentType("application/json").content("{\"condition\":\"APTO\"}")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/players")).andExpect(jsonPath("$.meta.total_items").value(0));
        verify(players, never()).delete(any(Player.class));
    }

    @Test void putConflicts() throws Exception {
        create(); Map<String,Object> b=valid(); b.put("age",24);
        mvc.perform(put("/api/v1/players/1").contentType("application/json").content(mapper.writeValueAsString(b)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        Club c=new Club(1,"Aguias FC","AGU",new BigDecimal("300"),null); playerRows.get(1).setClub(c);
        b=valid(); b.put("position","ATA");
        mvc.perform(put("/api/v1/players/1").contentType("application/json").content(mapper.writeValueAsString(b))).andExpect(status().isConflict());
        mvc.perform(delete("/api/v1/players/1")).andExpect(status().isConflict());
        assertThat(playerRows.get(1).getDeletedAt()).isNull();
    }

    @ParameterizedTest @ValueSource(strings = {"position=mei","condition=apto","free=TRUE","page=01","page=0","limit=51","min_age=15","max_age=46","min_age=30&max_age=20","min_value=2&max_value=1","min_value=01","min_value=1e2","max_value=551","min_value=0.001","sort=value_asc,value_desc","sort=name,age_asc,position","search=+","free=true&club_id=1","club_id=0"})
    void invalidQuery(String query) throws Exception {
        mvc.perform(get("/api/v1/players?"+query)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test void listingFiltersSortingAndPagination() throws Exception {
        create(); playerRows.get(1).setName("João Silva");
        Map<String,Object> b=valid(); b.put("name","Ana Lima"); b.put("age",26);
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(b))).andExpect(status().isCreated());
        mvc.perform(get("/api/v1/players?search=joao&free=true&position=MEI&condition=APTO&min_age=25&max_age=25&min_value=40&max_value=40"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].name").value("João Silva")).andExpect(jsonPath("$.meta.total_items").value(1));
        mvc.perform(get("/api/v1/players?sort=value_desc,age_asc&limit=1&page=2"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data[0].name").value("Ana Lima"))
                .andExpect(jsonPath("$.meta.total_items").value(2)).andExpect(jsonPath("$.meta.total_pages").value(2));
        mvc.perform(get("/api/v1/players?page=2147483647&limit=50")).andExpect(status().isOk()).andExpect(jsonPath("$.data").isEmpty());
        mvc.perform(get("/api/v1/players?club_id=999")).andExpect(status().isNotFound());
    }

    @Test void clubsCreationDuplicatesLimitAndValues() throws Exception {
        mvc.perform(post("/api/v1/clubs").contentType("application/json").content("{\"name\":\"  Águias   FC \",\"acronym\":\"AGU\",\"cash\":1}"))
                .andExpect(status().isCreated()).andExpect(header().string("Location","/api/v1/clubs/1"))
                .andExpect(jsonPath("$.cash").value(300)).andExpect(jsonPath("$.squad_value").value(0))
                .andExpect(jsonPath("$.net_worth").value(300));
        mvc.perform(post("/api/v1/clubs").contentType("application/json").content("{\"name\":\"águias fc\",\"acronym\":\"AGF\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
        mvc.perform(post("/api/v1/clubs").contentType("application/json").content("{\"name\":\"Aguias FC\",\"acronym\":\"AGF\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/clubs").contentType("application/json").content("{\"name\":\"Aguias Clube\",\"acronym\":\"AGU\"}"))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/v1/clubs?sort=name")).andExpect(status().isOk()).andExpect(jsonPath("$[0].id").value(1));
        mvc.perform(get("/api/v1/clubs/1")).andExpect(status().isOk()).andExpect(jsonPath("$.players").isEmpty());
        mvc.perform(get("/api/v1/clubs?sort=invalid")).andExpect(status().isBadRequest());
        when(clubs.count()).thenReturn(20L);
        mvc.perform(post("/api/v1/clubs").contentType("application/json").content("{\"name\":\"Delta FC\",\"acronym\":\"DEL\"}"))
                .andExpect(status().isConflict());
    }

    @ParameterizedTest @ValueSource(strings = {"Águias -", "Águias .", "Águias -- ..."})
    void clubMustHaveAtLeastTwoWordsContainingLetters(String name) throws Exception {
        mvc.perform(post("/api/v1/clubs").contentType("application/json")
                .content(mapper.writeValueAsString(Map.of("name",name,"acronym","AGU"))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        verify(clubs, never()).save(any());
    }

    @Test void corsAndPrefix() throws Exception {
        mvc.perform(options("/api/v1/players").header("Origin","http://localhost:5173")
                .header("Access-Control-Request-Method","POST").header("Access-Control-Request-Headers","Content-Type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:5173"));
        mvc.perform(options("/api/v1/players").header("Origin","https://invalid.example")
                .header("Access-Control-Request-Method","POST")).andExpect(status().isForbidden());
        mvc.perform(get("/players")).andExpect(status().isNotFound());
        mvc.perform(get("/api/v1/api/v1/players")).andExpect(status().isNotFound());
    }

    @Test void rejectsMultipleJsonValuesInOneBody() throws Exception {
        mvc.perform(post("/api/v1/players").contentType("application/json")
                .content(mapper.writeValueAsString(valid()) + " {}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        verify(players, never()).save(any());
    }

    @ParameterizedTest @ValueSource(strings = {"{}", "{\"condition\":null}", "{\"condition\":\"apto\"}", "[]"})
    void invalidConditionBody(String body) throws Exception {
        create();
        mvc.perform(patch("/api/v1/players/1/condition").contentType("application/json").content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        assertThat(playerRows.get(1).getCondition().getCode()).isEqualTo("APTO");
    }

    @ParameterizedTest @ValueSource(strings = {"name", "position", "agility", "age"})
    void putRequiresAllEditableFields(String field) throws Exception {
        create(); Map<String,Object> b=valid(); b.remove(field);
        mvc.perform(put("/api/v1/players/1").contentType("application/json").content(mapper.writeValueAsString(b)))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test void acceptsInclusiveBoundariesAndHomonyms() throws Exception {
        for (int age : new int[]{16,21,22,32,33,35,45}) {
            Map<String,Object> b=valid(); b.put("age",age); b.put("potential",82);
            b.put("agility",age>=35?85:100);
            mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(b)))
                    .andExpect(status().isCreated());
        }
        Map<String,Object> b=valid();
        b.put("name","A " + "b".repeat(98)); b.put("agility",1); b.put("potential",99);
        for (String f : List.of("pace","shooting","passing","dribbling","defending","physical")) b.put(f,80);
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(b))).andExpect(status().isCreated());
        b.put("physical",81); rejected(b); // sum 481
        b=valid(); b.put("name","A " + "b".repeat(99)); rejected(b);
    }

    @ParameterizedTest @ValueSource(strings = {"agility", "age", "pace", "potential"})
    void wrongCaseDoesNotSupplyRequiredField(String field) throws Exception {
        Map<String,Object> b=valid(); Object value=b.remove(field);
        b.put(Character.toUpperCase(field.charAt(0))+field.substring(1),value); rejected(b);
    }

    @ParameterizedTest @ValueSource(strings = {"agu", "AAA", "ÁGU", "AG", "AGUU", "GUA", "AZZ"})
    void invalidAcronyms(String acronym) throws Exception {
        mvc.perform(post("/api/v1/clubs").contentType("application/json")
                .content(mapper.writeValueAsString(Map.of("name","Águias FC","acronym",acronym))))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        verify(clubs,never()).save(any());
    }

    @Test void searchMustPreserveUnicodeMarksOutsideMn() throws Exception {
        // V4 removes Mn only. Devanagari vowel signs AA/I are Mc, not Mn.
        Map<String,Object> b=valid(); b.put("name","\u0915\u093e Silva");
        mvc.perform(post("/api/v1/players").contentType("application/json").content(mapper.writeValueAsString(b)))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/v1/players").param("search","\u0915\u093f"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.meta.total_items").value(0));
    }

    @Test void clubIntegrityConflictReturns409() throws Exception {
        doThrow(new DataIntegrityViolationException("duplicate key")).when(clubs).save(any());
        mvc.perform(post("/api/v1/clubs").contentType("application/json")
                .content("{\"name\":\"Águias FC\",\"acronym\":\"AGU\"}"))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test void clubCountsOnlySequencesContainingLetters() throws Exception {
        mvc.perform(post("/api/v1/clubs").contentType("application/json")
                .content("{\"name\":\"Águias FC - . - .\",\"acronym\":\"AGU\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.name").value("Águias FC - . - ."));
    }
}
