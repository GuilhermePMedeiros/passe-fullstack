package br.com.passebackend;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.club.dto.ClubRequestDTO;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RepositoryOptimizationTests {

    @Mock private PlayerRepository players;
    @Mock private ClubRepository clubs;
    @Mock private ClubService clubReader;
    @Mock private PlayerService playerReader;
    @InjectMocks private PlayerService playerService;
    @InjectMocks private ClubService clubService;

    @ParameterizedTest
    @CsvSource({"GOL,0", "ZAG,1", "LAT,2", "MEI,3", "ATA,4"})
    void explicitPositionOrderDoesNotChangeJson(String code, int order) throws Exception {
        PlayerPosition position = PlayerPosition.fromCode(code);
        assertThat(position.getOrder()).isEqualTo(order);
        assertThat(new ObjectMapper().writeValueAsString(position)).isEqualTo("\"" + code + "\"");
    }

    @Test
    void clubRosterDelegatesToFilteredRepositoryQuery() {
        when(players.findByClubIdAndDeletedAtIsNull(7)).thenReturn(List.of());
        assertThat(playerService.getPlayersByClubId(7)).isEmpty();
        verify(players).findByClubIdAndDeletedAtIsNull(7);
        verify(players, never()).findAll();
    }

    @Test
    void listDelegatesSafeFiltersAndNeverUsesUnfilteredFindAll() {
        when(clubReader.existsClubById(7)).thenReturn(true);
        when(players.findActivePlayers(PlayerPosition.MIDFIELDER, PlayerCondition.UNFIT,
                false, 7, 20, 30)).thenReturn(List.of());

        playerService.listPlayers("joao", PlayerPosition.MIDFIELDER, PlayerCondition.UNFIT,
                false, 7, 20, 30, null, null, "name", null, null);

        verify(players).findActivePlayers(PlayerPosition.MIDFIELDER, PlayerCondition.UNFIT,
                false, 7, 20, 30);
        verify(players, never()).findAll();
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void uniquenessUsesExistenceQueriesWithoutLoadingAllClubs(boolean duplicateName) {
        ClubRequestDTO request = new ClubRequestDTO();
        request.setName("Águias FC");
        request.setAcronym("AGU");
        if (duplicateName) {
            when(clubs.existsByName("Águias FC")).thenReturn(true);
        } else {
            when(clubs.existsByAcronym("AGU")).thenReturn(true);
        }

        assertThatThrownBy(() -> clubService.createClub(request))
                .isInstanceOf(BusinessConflictException.class)
                .hasMessage(duplicateName ? "Nome de clube já cadastrado." : "Sigla de clube já cadastrada.");
        verify(clubs).count();
        verify(clubs, never()).findAll();
        verify(clubs, never()).save(any());
        verifyNoInteractions(playerReader);
    }

    @Test
    void emptyBulkRequestDoesNotQueryPlayers() {
        assertThat(playerService.getPlayersByClubIds(List.of())).isEmpty();
        verifyNoInteractions(players);
    }
}
