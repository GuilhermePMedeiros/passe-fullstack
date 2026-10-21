package br.com.passebackend.match;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.lineup.LineupRepository;
import br.com.passebackend.lineup.LineupService;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.match.dto.MatchClubDTO;
import br.com.passebackend.match.dto.MatchRequestDTO;
import br.com.passebackend.match.dto.MatchResponseDTO;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerService;

@Service
public class MatchService {
    private static final int DUELS_PER_MATCH = 6;

    @Autowired
    private MatchRepository repository;

    @Autowired
    private MatchDuelService duels;

    @Autowired
    private LineupService lineups;

    @Autowired
    private LineupRepository lineupRepository;

    @Autowired
    private ClubService clubs;

    @Autowired
    private PlayerService players;

    @Transactional
    public MatchResponseDTO play(MatchRequestDTO request) {
        validateRequest(request);
        List<Integer> clubIds = List.of(request.getHomeClubId(), request.getAwayClubId());
        validateClubs(clubIds);

        List<Integer> initialPlayers = lockLineupPlayers(clubIds);
        List<Club> lockedClubs = lockClubs(clubIds);
        validateUnchangedLineups(clubIds, initialPlayers);

        Club home = findClub(lockedClubs, request.getHomeClubId());
        Club away = findClub(lockedClubs, request.getAwayClubId());
        List<MatchDuel> results = simulate(home, away);
        Match match = createMatch(home, away, results);

        repository.saveAndFlush(match);
        duels.saveForMatch(match, results);

        MatchResponseDTO response = toResponse(match);
        response.setDuels(results.stream().map(duels::toResponse).toList());
        return response;
    }

    private void validateRequest(MatchRequestDTO request) {
        if (request == null || !positive(request.getHomeClubId()) || !positive(request.getAwayClubId())
                || request.getHomeClubId().equals(request.getAwayClubId())) {
            throw new IllegalArgumentException("Informe dois clubes distintos com ids positivos.");
        }
    }

    private boolean positive(Integer id) {
        return id != null && id > 0;
    }

    private void validateClubs(List<Integer> clubIds) {
        for (Integer id : clubIds) {
            if (!clubs.existsClubById(id)) {
                throw new ResourceNotFoundException("Clube não encontrado.");
            }
        }
    }

    private List<Integer> lockLineupPlayers(List<Integer> clubIds) {
        List<Integer> ids = lineupRepository.findPlayerIdsByClubIds(clubIds);
        for (Integer id : ids.stream().sorted().toList()) {
            try {
                players.getActivePlayerForUpdate(id);
            } catch (ResourceNotFoundException exception) {
                throw new BusinessConflictException("Escalação mudou; escale novamente.");
            }
        }
        return ids;
    }

    private List<Club> lockClubs(List<Integer> clubIds) {
        List<Club> locked = new ArrayList<>();
        for (Integer id : clubIds.stream().sorted().toList()) {
            locked.add(clubs.getClubForUpdate(id));
        }
        return locked;
    }

    private void validateUnchangedLineups(List<Integer> clubIds, List<Integer> initialPlayers) {
        List<Integer> currentPlayers = lineupRepository.findCurrentPlayerIdsForUpdate(clubIds);
        if (!new HashSet<>(initialPlayers).equals(new HashSet<>(currentPlayers))) {
            throw new BusinessConflictException("Escalação mudou durante a operação; tente novamente.");
        }
    }

    private Club findClub(List<Club> locked, Integer id) {
        return locked.stream().filter(club -> club.getId().equals(id)).findFirst().orElseThrow();
    }

    private List<MatchDuel> simulate(Club home, Club away) {
        List<Player> homePlayers = lineups.getCompletePlayersForMatch(home);
        List<Player> awayPlayers = lineups.getCompletePlayersForMatch(away);
        List<MatchDuel> results = duels.createDuels(home, homePlayers, away, awayPlayers);

        if (results.size() != DUELS_PER_MATCH) {
            throw new IllegalStateException("Partida deve possuir exatamente seis duelos.");
        }
        return results;
    }

    private Match createMatch(Club home, Club away, List<MatchDuel> results) {
        Match match = new Match();
        match.setHomeClub(home);
        match.setAwayClub(away);
        match.setHomeFormation(Formation.fromCode(home.getFormation()));
        match.setAwayFormation(Formation.fromCode(away.getFormation()));
        match.setHomeGoals(countGoals(results, home.getId()));
        match.setAwayGoals(countGoals(results, away.getId()));
        match.setPlayedAt(DateTimeUtils.now().withNano(0));
        return match;
    }

    private int countGoals(List<MatchDuel> results, Integer clubId) {
        return Math.toIntExact(results.stream().filter(duel -> duel.getGoal()
                && duel.getAttackingClub().getId().equals(clubId)).count());
    }

    @Transactional(readOnly = true)
    public List<MatchResponseDTO> list(Integer clubId) {
        if (clubId == null) {
            return repository.findAllByOrderByPlayedAtDescIdDesc().stream().map(this::toResponse).toList();
        }
        validateClubs(List.of(clubId));
        return repository.findByHomeClubIdOrAwayClubIdOrderByPlayedAtDescIdDesc(clubId, clubId)
                .stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public MatchResponseDTO get(Integer id) {
        Match match = repository.findWithClubsById(id).orElseThrow(
                () -> new ResourceNotFoundException("Partida não encontrada."));
        MatchResponseDTO response = toResponse(match);
        response.setDuels(duels.getByMatchId(id));
        return response;
    }

    private MatchResponseDTO toResponse(Match match) {
        MatchResponseDTO response = new MatchResponseDTO();
        response.setId(match.getId());
        response.setPlayedAt(DateTimeUtils.format(match.getPlayedAt()));
        response.setHome(clubResponse(match.getHomeClub(), match.getHomeFormation(), match.getHomeGoals()));
        response.setAway(clubResponse(match.getAwayClub(), match.getAwayFormation(), match.getAwayGoals()));
        response.setResult(result(match));
        return response;
    }

    private MatchClubDTO clubResponse(Club club, Formation formation, int goals) {
        MatchClubDTO response = new MatchClubDTO();
        response.setClubId(club.getId());
        response.setClubName(club.getName());
        response.setFormation(formation.getCode());
        response.setGoals(goals);
        return response;
    }

    private String result(Match match) {
        int comparison = Integer.compare(match.getHomeGoals(), match.getAwayGoals());
        if (comparison > 0) {
            return "MANDANTE";
        }
        if (comparison < 0) {
            return "VISITANTE";
        }
        return "EMPATE";
    }
}
