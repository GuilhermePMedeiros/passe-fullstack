package br.com.passebackend.lineup;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.lineup.dto.LineupRequestDTO;
import br.com.passebackend.lineup.dto.LineupResponseDTO;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import br.com.passebackend.nucleo.util.StringUtils;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

@Service
public class LineupService {
    private static final int STARTERS = 5;

    @Autowired
    private LineupRepository repository;

    @Autowired
    private ClubService clubs;

    @Autowired
    private PlayerService players;

    @Transactional
    public LineupResponseDTO update(Integer clubId, LineupRequestDTO request) {
        validateRequest(request);
        List<Player> starters = lockPlayers(request.getPlayerIds());
        Club club = clubs.getClubForUpdate(clubId);

        validatePlayers(club, starters, request.getFormation());
        replaceLineup(club, starters, request.getFormation());

        return toResponse(club, orderedPlayers(starters));
    }

    private void validateRequest(LineupRequestDTO request) {
        if (request == null || request.getFormation() == null || request.getPlayerIds() == null) {
            throw new IllegalArgumentException("Formação e jogadores são obrigatórios.");
        }

        List<Integer> ids = request.getPlayerIds();
        if (ids.size() != STARTERS || new HashSet<>(ids).size() != STARTERS
                || ids.stream().anyMatch(id -> id == null || id <= 0)) {
            throw new IllegalArgumentException("Informe cinco ids distintos e positivos.");
        }
    }

    private List<Player> lockPlayers(List<Integer> ids) {
        List<Player> starters = new ArrayList<>();
        for (Integer id : ids.stream().sorted().toList()) {
            starters.add(players.getActivePlayerForUpdate(id));
        }
        return starters;
    }

    private void replaceLineup(Club club, List<Player> starters, Formation formation) {
        repository.deleteByClubId(club.getId());
        repository.flush();

        LocalDateTime now = DateTimeUtils.now().withNano(0);
        List<Lineup> entries = new ArrayList<>();
        for (Player player : starters) {
            entries.add(createEntry(club, player, now));
        }

        club.setFormation(formation.getCode());
        repository.saveAllAndFlush(entries);
    }

    private Lineup createEntry(Club club, Player player, LocalDateTime now) {
        Lineup entry = new Lineup();
        entry.setClub(club);
        entry.setPlayer(player);
        entry.setCreatedAt(now);
        return entry;
    }

    @Transactional(readOnly = true)
    public LineupResponseDTO get(Integer clubId) {
        Club club = clubs.getClubEntityById(clubId);
        List<Player> starters = repository.findWithPlayersByClubId(clubId).stream()
                .map(Lineup::getPlayer).toList();

        return toResponse(club, orderedPlayers(starters));
    }

    @Transactional
    public List<Player> getCompletePlayersForMatch(Club club) {
        List<Player> starters = repository.findWithPlayersForUpdate(club.getId()).stream()
                .map(Lineup::getPlayer).toList();

        if (club.getFormation() == null || starters.size() != STARTERS) {
            throw new BusinessConflictException("Clube não possui escalação completa.");
        }

        validatePlayers(club, starters, Formation.fromCode(club.getFormation()));
        return orderedPlayers(starters);
    }

    private void validatePlayers(Club club, List<Player> starters, Formation formation) {
        for (Player player : starters) {
            validateEligibility(club, player);
        }
        validateFormation(starters, formation);
    }

    private void validateEligibility(Club club, Player player) {
        if (player.getDeletedAt() != null || player.getClub() == null
                || !player.getClub().getId().equals(club.getId())) {
            throw new BusinessConflictException("Titular deve pertencer ao elenco do clube.");
        }
        if (player.getCondition() == PlayerCondition.SICK) {
            throw new BusinessConflictException("Jogador DOENTE não pode ser escalado.");
        }
    }

    private void validateFormation(List<Player> starters, Formation formation) {
        long defenders = countPosition(starters, PlayerPosition.CENTER_BACK)
                + countPosition(starters, PlayerPosition.FULL_BACK);
        boolean matches = countPosition(starters, PlayerPosition.GOALKEEPER) == 1
                && defenders == formation.getDefenders()
                && countPosition(starters, PlayerPosition.MIDFIELDER) == formation.getMidfielders()
                && countPosition(starters, PlayerPosition.STRIKER) == formation.getStrikers();

        if (!matches) {
            throw new BusinessConflictException("Posições dos titulares não correspondem à formação.");
        }
    }

    private long countPosition(List<Player> starters, PlayerPosition position) {
        return starters.stream().filter(player -> player.getPosition() == position).count();
    }

    public List<Player> orderedPlayers(List<Player> starters) {
        List<Player> ordered = new ArrayList<>(starters);
        ordered.sort(Comparator.comparingInt((Player player) -> player.getPosition().getOrder())
                .thenComparing(Player::getName, StringUtils::compareNames)
                .thenComparing(Player::getId));
        return ordered;
    }

    private LineupResponseDTO toResponse(Club club, List<Player> starters) {
        LineupResponseDTO response = new LineupResponseDTO();
        response.setClubId(club.getId());
        response.setFormation(club.getFormation());
        response.setComplete(starters.size() == STARTERS);
        response.setPlayers(starters.stream().map(players::toResponse).toList());
        return response;
    }
}
