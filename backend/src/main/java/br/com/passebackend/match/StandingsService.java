package br.com.passebackend.match;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.com.passebackend.match.dto.StandingResponseDTO;
import br.com.passebackend.nucleo.util.StringUtils;

@Service
public class StandingsService {
    private static final int WIN_POINTS = 3;

    @Autowired
    private MatchRepository repository;

    @Transactional(readOnly = true)
    public List<StandingResponseDTO> get() {
        List<StandingResponseDTO> standings = new ArrayList<>();
        for (StandingTotals totals : repository.aggregateStandings()) {
            standings.add(toResponse(totals));
        }

        standings.sort(standingOrder());
        assignPositions(standings);
        return standings;
    }

    private StandingResponseDTO toResponse(StandingTotals totals) {
        StandingResponseDTO response = new StandingResponseDTO();
        response.setClubId(totals.getClubId());
        response.setClubName(totals.getClubName());
        response.setPlayed(Math.toIntExact(totals.getPlayed()));
        response.setWins(Math.toIntExact(totals.getWins()));
        response.setDraws(Math.toIntExact(totals.getDraws()));
        response.setLosses(Math.toIntExact(totals.getLosses()));
        response.setGoalsFor(Math.toIntExact(totals.getGoalsFor()));
        response.setGoalsAgainst(Math.toIntExact(totals.getGoalsAgainst()));
        response.setGoalDifference(response.getGoalsFor() - response.getGoalsAgainst());
        response.setPoints(response.getWins() * WIN_POINTS + response.getDraws());
        return response;
    }

    private Comparator<StandingResponseDTO> standingOrder() {
        return Comparator.comparingInt(StandingResponseDTO::getPoints).reversed()
                .thenComparing(Comparator.comparingInt(StandingResponseDTO::getGoalDifference).reversed())
                .thenComparing(Comparator.comparingInt(StandingResponseDTO::getGoalsFor).reversed())
                .thenComparing(StandingResponseDTO::getClubName, StringUtils::compareNames)
                .thenComparing(StandingResponseDTO::getClubId);
    }

    private void assignPositions(List<StandingResponseDTO> standings) {
        for (int index = 0; index < standings.size(); index++) {
            standings.get(index).setPosition(index + 1);
        }
    }
}
