package br.com.passebackend;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.dto.PlayerResponseDTO;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest(properties = {"spring.jpa.hibernate.ddl-auto=none",
        "spring.jpa.properties.hibernate.generate_statistics=true"})
@Transactional
class RepositoryOptimizationIntegrationTests {

    @DynamicPropertySource
    static void applicationDatabase(DynamicPropertyRegistry properties) {
        AuditPersistenceTests.applicationDatabase(properties);
    }

    @Autowired private PlayerRepository players;
    @Autowired private ClubRepository clubs;
    @Autowired private PlayerService playerService;
    @Autowired private ClubService clubService;
    @Autowired private EntityManager entityManager;
    @Autowired private EntityManagerFactory entityManagerFactory;

    private Club club(String acronym) {
        return clubs.save(new Club(null, "Auditoria " + UUID.randomUUID(), acronym,
                new BigDecimal("300.00"), null));
    }

    private Player player(Club club, String name, PlayerPosition position, int age, String value) {
        return players.save(new Player(null, name, position, 85, age, new BigDecimal(value),
                PlayerCondition.FIT, club, 70, 70, 70, 70, 70, 70, 70));
    }

    private Statistics beginMeasurement() {
        entityManager.flush();
        entityManager.clear();
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.clear();
        return statistics;
    }

    @Test
    void clubQueryLoadsOnlyItsActivePlayersWithOneStatement() {
        Club selected = club("XQZ");
        Club other = club("XQY");
        List<Integer> expected = new ArrayList<>();
        for (int index = 0; index < 3; index++) {
            expected.add(player(selected, "Jogador Selecionado", PlayerPosition.MIDFIELDER, 25, "20").getId());
        }
        player(selected, "Jogador Excluído", PlayerPosition.MIDFIELDER, 25, "20")
                .setDeletedAt(LocalDateTime.now());
        for (int index = 0; index < 20; index++) {
            player(other, "Outro Jogador", PlayerPosition.STRIKER, 25, "20");
            player(null, "Jogador Livre", PlayerPosition.STRIKER, 25, "20");
        }
        int clubId = selected.getId();
        Statistics statistics = beginMeasurement();

        List<Player> result = playerService.getPlayersByClubId(clubId);

        assertThat(result).extracting(Player::getId).containsExactlyInAnyOrderElementsOf(expected);
        assertThat(result).allSatisfy(p -> assertThat(p.getClub().getId()).isEqualTo(clubId));
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        assertThat(statistics.getEntityLoadCount()).isEqualTo(3);
    }

    @Test
    void emptyClubDoesNotLoadOtherPlayers() {
        Club empty = club("XQZ");
        player(club("XQY"), "Outro Jogador", PlayerPosition.STRIKER, 25, "20");
        int clubId = empty.getId();
        Statistics statistics = beginMeasurement();

        assertThat(playerService.getPlayersByClubId(clubId)).isEmpty();
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        assertThat(statistics.getEntityLoadCount()).isZero();
    }

    @Test
    void combinedSpecificationFiltersBeforeLoadingEntities() {
        Club selected = club("XQZ");
        Club other = club("XQY");
        Player match = player(selected, "Jogador Correto", PlayerPosition.MIDFIELDER, 25, "20");
        match.setCondition(PlayerCondition.UNFIT);
        player(selected, "Posição Errada", PlayerPosition.STRIKER, 25, "20").setCondition(PlayerCondition.UNFIT);
        player(selected, "Idade Baixa", PlayerPosition.MIDFIELDER, 19, "20").setCondition(PlayerCondition.UNFIT);
        player(selected, "Idade Alta", PlayerPosition.MIDFIELDER, 31, "20").setCondition(PlayerCondition.UNFIT);
        player(selected, "Condição Errada", PlayerPosition.MIDFIELDER, 25, "20");
        player(other, "Outro Clube", PlayerPosition.MIDFIELDER, 25, "20").setCondition(PlayerCondition.UNFIT);
        Player deleted = player(selected, "Jogador Excluído", PlayerPosition.MIDFIELDER, 25, "20");
        deleted.setCondition(PlayerCondition.UNFIT);
        deleted.setDeletedAt(LocalDateTime.now());
        int clubId = selected.getId();
        int expected = match.getId();
        Statistics statistics = beginMeasurement();

        List<Player> result = players.findActivePlayers(PlayerPosition.MIDFIELDER,
                PlayerCondition.UNFIT, false, clubId, 20, 30);

        assertThat(result).extracting(Player::getId).containsExactly(expected);
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        assertThat(statistics.getEntityLoadCount()).isEqualTo(1);
    }

    @Test
    void freeFilterAndBothAgeBoundariesAreAppliedInDatabase() {
        Club club = club("XQZ");
        Player lower = player(null, "Limite Inferior", PlayerPosition.MIDFIELDER, 20, "20");
        Player upper = player(null, "Limite Superior", PlayerPosition.MIDFIELDER, 30, "20");
        player(club, "Jogador Vinculado", PlayerPosition.MIDFIELDER, 25, "20");
        player(null, "Fora Faixa", PlayerPosition.MIDFIELDER, 19, "20");
        List<Integer> expected = List.of(lower.getId(), upper.getId());
        Statistics statistics = beginMeasurement();

        assertThat(players.findActivePlayers(null, null, true, null, 20, 30))
                .extracting(Player::getId).containsExactlyInAnyOrderElementsOf(expected);
        assertThat(statistics.getEntityLoadCount()).isEqualTo(2);
    }

    @Test
    @SuppressWarnings("unchecked")
    void unicodeAndMarketFiltersPrecedePaginationAndTotals() {
        Club club = club("XQZ");
        player(club, "Álvaro Lima", PlayerPosition.MIDFIELDER, 25, "10");
        Player expected = player(club, "Alvaro Silva", PlayerPosition.MIDFIELDER, 25, "20");
        expected.setCondition(PlayerCondition.UNFIT);
        player(club, "Alvaro Souza", PlayerPosition.MIDFIELDER, 25, "30");
        player(club, "Alvaro Excluído", PlayerPosition.MIDFIELDER, 25, "40")
                .setDeletedAt(LocalDateTime.now());
        int id = expected.getId();
        int clubId = club.getId();
        beginMeasurement();

        Map<String, Object> result = playerService.listPlayers("alvaro", null, null, false,
                clubId, null, null, new BigDecimal("15"), new BigDecimal("40"), "value_desc", 2, 1);

        assertThat((List<PlayerResponseDTO>) result.get("data"))
                .extracting(PlayerResponseDTO::getId).containsExactly(id);
        assertThat((Map<String, Object>) result.get("meta"))
                .containsEntry("total_items", 2L).containsEntry("total_pages", 2L);
        assertThat((List<?>) playerService.listPlayers("alvaro", null, null, false, clubId,
                null, null, new BigDecimal("15"), new BigDecimal("40"), "value_desc", 3, 1).get("data"))
                .isEmpty();
    }

    @Test
    @SuppressWarnings("unchecked")
    void searchPreservesMcWhileRemovingOnlyMn() {
        Club club = club("XQZ");
        Player bare = player(club, "क Lima", PlayerPosition.MIDFIELDER, 25, "20");
        player(club, "का Lima", PlayerPosition.MIDFIELDER, 25, "20");
        int clubId = club.getId();
        int expected = bare.getId();
        beginMeasurement();

        var result = playerService.listPlayers("क Lima", null, null, false, clubId,
                null, null, null, null, "name", null, null);
        assertThat((List<PlayerResponseDTO>) result.get("data"))
                .extracting(PlayerResponseDTO::getId).containsExactly(expected);
    }

    @ParameterizedTest
    @CsvSource(value = {"name|1,2,0", "age_asc|1,0,2", "age_desc|2,0,1", "position|0,1,2",
            "value_asc|1,2,0", "value_desc|2,0,1", "value_desc,age_asc|0,2,1"}, delimiter = '|')
    @SuppressWarnings("unchecked")
    void officialOrderingAndTiesArePreserved(String sort, String indices) {
        Club club = club("XQZ");
        List<Integer> ids = List.of(
                player(club, "Zeta Lima", PlayerPosition.GOALKEEPER, 25, "20").getId(),
                player(club, "Álvaro Lima", PlayerPosition.MIDFIELDER, 20, "10").getId(),
                player(club, "Alvaro Lima", PlayerPosition.STRIKER, 30, "20").getId());
        int clubId = club.getId();
        beginMeasurement();
        List<Integer> expected = new ArrayList<>();
        for (String index : indices.split(",")) expected.add(ids.get(Integer.parseInt(index)));

        var result = playerService.listPlayers(null, null, null, false, clubId,
                null, null, null, null, sort, null, null);
        assertThat((List<PlayerResponseDTO>) result.get("data"))
                .extracting(PlayerResponseDTO::getId).containsExactlyElementsOf(expected);
    }

    @Test
    void existenceQueriesUseColumnCollationWithoutLoadingClubs() {
        Club club = club("XQZ");
        String suffix = UUID.randomUUID().toString();
        club.setName("Águias " + suffix);
        Statistics statistics = beginMeasurement();

        assertThat(clubs.existsByName("águias " + suffix)).isTrue();
        assertThat(clubs.existsByName("Aguias " + suffix)).isFalse();
        assertThat(clubs.existsByAcronym("XQZ")).isTrue();
        assertThat(clubs.existsByAcronym("XQY")).isFalse();
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(4);
        assertThat(statistics.getEntityLoadCount()).isZero();
    }

    @Test
    void clubListingUsesTwoStatementsWithoutLazyNPlusOne() {
        Club first = club("XQZ");
        Club second = club("XQY");
        Club empty = club("XQX");
        player(first, "Primeiro Jogador", PlayerPosition.GOALKEEPER, 25, "20");
        player(second, "Segundo Jogador", PlayerPosition.STRIKER, 25, "10");
        player(second, "Jogador Excluído", PlayerPosition.STRIKER, 25, "50")
                .setDeletedAt(LocalDateTime.now());
        int firstId = first.getId();
        int emptyId = empty.getId();
        Statistics statistics = beginMeasurement();

        var result = clubService.listClubs("net_worth_desc");

        assertThat(result).filteredOn(dto -> dto.getId().equals(firstId)).singleElement()
                .satisfies(dto -> assertThat(dto.getNetWorth()).isEqualByComparingTo("320"));
        assertThat(result).filteredOn(dto -> dto.getId().equals(emptyId)).singleElement()
                .satisfies(dto -> assertThat(dto.getSquadValue()).isEqualByComparingTo("0"));
        assertThat(statistics.getPrepareStatementCount()).isEqualTo(2);
    }

    @Test
    void playerListingDoesNotFetchClubEntitiesForTheirIds() {
        Club first = club("XQZ");
        Club second = club("XQY");
        player(first, "Primeiro Jogador", PlayerPosition.GOALKEEPER, 25, "20");
        player(second, "Segundo Jogador", PlayerPosition.STRIKER, 25, "10");
        Statistics statistics = beginMeasurement();

        playerService.listPlayers(null, null, null, false, null,
                null, null, null, null, "name", null, null);

        assertThat(statistics.getPrepareStatementCount()).isEqualTo(1);
        assertThat(statistics.getEntityFetchCount()).isZero();
    }
}
