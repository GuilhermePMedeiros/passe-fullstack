package br.com.passebackend;

import br.com.passebackend.contract.ContractService;
import java.util.Optional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.club.dto.ClubRequestDTO;
import br.com.passebackend.club.dto.ClubResponseDTO;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.dto.PlayerResponseDTO;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ClubDtoTests {

    @Mock
    private ClubRepository repository;

    @Mock
    private PlayerService playerService;

    @Mock
    private ContractService contractService;

    @InjectMocks
    private ClubService service;

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void requestDeserializesOnlyClubInputFields() throws Exception {
        ClubRequestDTO request = mapper.readValue(
                "{\"name\":\"Águias FC\",\"acronym\":\"AGU\",\"cash\":1,\"id\":99,\"formation\":\"2-2\"}",
                ClubRequestDTO.class);

        assertThat(request.getName()).isEqualTo("Águias FC");
        assertThat(request.getAcronym()).isEqualTo("AGU");
        assertThat(mapper.valueToTree(request).size()).isEqualTo(2);
    }

    @Test
    void summaryRoundTripPreservesSnakeCaseAndMoney() throws Exception {
        ClubResponseDTO response = new ClubResponseDTO();
        response.setId(1);
        response.setName("Águias FC");
        response.setAcronym("AGU");
        response.setCash(new BigDecimal("261.15"));
        response.setSquadValue(new BigDecimal("37.00"));
        response.setNetWorth(new BigDecimal("298.15"));

        var json = mapper.readTree(mapper.writeValueAsString(response));
        assertThat(json).isEqualTo(mapper.readTree(
                "{\"id\":1,\"name\":\"Águias FC\",\"acronym\":\"AGU\",\"cash\":261.15,\"squad_value\":37.00,\"net_worth\":298.15}"));

        ClubResponseDTO restored = mapper.treeToValue(json, ClubResponseDTO.class);
        assertThat(restored.getCash()).isEqualByComparingTo("261.15");
        assertThat(restored.getSquadValue()).isEqualByComparingTo("37.00");
        assertThat(restored.getNetWorth()).isEqualByComparingTo("298.15");
        assertThat(restored.getPlayers()).isNull();

        response.setPlayers(new ArrayList<>());
        assertThat(mapper.valueToTree(response).get("players").isArray()).isTrue();
        assertThat(mapper.valueToTree(response).get("players").size()).isZero();
    }

    @Test
    void createConvertsRequestAndNormalizesName() {
        ClubRequestDTO request = new ClubRequestDTO();
        request.setName("  Águias   FC ");
        request.setAcronym("AGU");

        when(repository.save(any())).thenAnswer(invocation -> {
            Club club = invocation.getArgument(0);
            assertThat(club.getName()).isEqualTo("Águias FC");
            assertThat(club.getAcronym()).isEqualTo("AGU");
            assertThat(club.getCash()).isEqualByComparingTo("300.00");
            club.setId(1);
            return club;
        });

        ClubResponseDTO response = service.createClub(request);

        assertThat(response.getId()).isEqualTo(1);
        assertThat(response.getName()).isEqualTo("Águias FC");
        assertThat(response.getCash()).isEqualByComparingTo("300.00");
        assertThat(response.getSquadValue()).isEqualByComparingTo("0.00");
        assertThat(response.getNetWorth()).isEqualByComparingTo("300.00");
        assertThat(response.getPlayers()).isNull();
    }

    @Test
    void nullRequestIsRejectedBeforeSaving() {
        assertThatThrownBy(() -> service.createClub(null)).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(repository, playerService);
    }

    @ParameterizedTest
    @CsvSource(value = {
            "NULL,1,2,3", "name,1,2,3", "net_worth_asc,3,1,2", "net_worth_desc,1,2,3"
    }, nullValues = "NULL")
    void clubSortingKeepsNameAndIdTieBreaks(String sort, int first, int second, int third) {
        Club one = new Club(1, "Águias FC", "AGU", new BigDecimal("300.00"), null);
        Club two = new Club(2, "Aguias FC", "AGF", new BigDecimal("300.00"), null);
        Club three = new Club(3, "Delta FC", "DEL", new BigDecimal("200.00"), null);
        when(repository.findAll()).thenReturn(List.of(three, two, one));
        when(playerService.getPlayersByClubIds(any())).thenReturn(new ArrayList<>());

        List<ClubResponseDTO> response = service.listClubs(sort);

        assertThat(response).extracting(ClubResponseDTO::getId).containsExactly(first, second, third);
        assertThat(response).allSatisfy(club -> assertThat(club.getPlayers()).isNull());
    }

    @Test
    void detailOrdersSquadAndDelegatesPlayerCalculations() throws Exception {
        Club club = new Club(1, "Águias FC", "AGU", new BigDecimal("261.15"), null);
        Player mei = player(4, "Meia Lua", PlayerPosition.MIDFIELDER, club);
        Player golLater = player(3, "Álvaro Silva", PlayerPosition.GOALKEEPER, club);
        Player golFirst = player(2, "Alvaro Silva", PlayerPosition.GOALKEEPER, club);
        Player ata = player(1, "Ana Lima", PlayerPosition.STRIKER, club);

        when(repository.findById(1)).thenReturn(Optional.of(club));
        when(playerService.getPlayersByClubId(1)).thenReturn(new ArrayList<>(List.of(ata, mei, golLater, golFirst)));
        when(playerService.calculateMarketValue(any())).thenReturn(new BigDecimal("8.79"));
        when(playerService.toResponse(any())).thenAnswer(invocation -> {
            Player player = invocation.getArgument(0);
            PlayerResponseDTO dto = new PlayerResponseDTO();
            dto.setId(player.getId());
            dto.setName(player.getName());
            dto.setPosition(player.getPosition());
            dto.setClubId(club.getId());
            return dto;
        });

        ClubResponseDTO response = service.getClubById(1);

        assertThat(response.getPlayers()).extracting(PlayerResponseDTO::getId).containsExactly(2, 3, 4, 1);
        assertThat(response.getSquadValue()).isEqualByComparingTo("35.16");
        assertThat(response.getNetWorth()).isEqualByComparingTo("296.31");
        var json = mapper.valueToTree(response);
        assertThat(json.size()).isEqualTo(7);
        assertThat(json.get("players").get(0).get("club_id").intValue()).isEqualTo(1);
        assertThat(json.has("formation")).isFalse();
        assertThat(json.has("created_at")).isFalse();
        assertThat(json.get("players").get(0).has("deleted_at")).isFalse();
        verify(playerService, times(4)).calculateMarketValue(any());
        verify(playerService, times(4)).toResponse(any());
    }

    private Player player(int id, String name, PlayerPosition position, Club club) {
        return new Player(id, name, position, 85, 25, new BigDecimal("40.00"),
                PlayerCondition.FIT, club, 70, 68, 82, 79, 55, 64, 86);
    }
}
