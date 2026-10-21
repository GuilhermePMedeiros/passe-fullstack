package br.com.passebackend.match;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchRepository extends JpaRepository<Match, Integer> {
    @EntityGraph(attributePaths = {"homeClub", "awayClub"})
    List<Match> findAllByOrderByPlayedAtDescIdDesc();

    @EntityGraph(attributePaths = {"homeClub", "awayClub"})
    List<Match> findByHomeClubIdOrAwayClubIdOrderByPlayedAtDescIdDesc(Integer homeId, Integer awayId);

    @EntityGraph(attributePaths = {"homeClub", "awayClub"})
    Optional<Match> findWithClubsById(Integer id);

    @Query(value = """
            SELECT c.id AS clubId, c.nome AS clubName,
                   COALESCE(SUM(s.played),0) AS played, COALESCE(SUM(s.wins),0) AS wins,
                   COALESCE(SUM(s.draws),0) AS draws, COALESCE(SUM(s.losses),0) AS losses,
                   COALESCE(SUM(s.goals_for),0) AS goalsFor, COALESCE(SUM(s.goals_against),0) AS goalsAgainst
            FROM clubes c
            LEFT JOIN (
                SELECT mandante_id AS club_id, COUNT(*) AS played,
                       SUM(gols_mandante > gols_visitante) AS wins, SUM(gols_mandante = gols_visitante) AS draws,
                       SUM(gols_mandante < gols_visitante) AS losses,
                       SUM(gols_mandante) AS goals_for, SUM(gols_visitante) AS goals_against
                FROM partidas GROUP BY mandante_id
                UNION ALL
                SELECT visitante_id AS club_id, COUNT(*) AS played,
                       SUM(gols_visitante > gols_mandante) AS wins, SUM(gols_visitante = gols_mandante) AS draws,
                       SUM(gols_visitante < gols_mandante) AS losses,
                       SUM(gols_visitante) AS goals_for, SUM(gols_mandante) AS goals_against
                FROM partidas GROUP BY visitante_id
            ) s ON s.club_id = c.id
            GROUP BY c.id, c.nome
            """, nativeQuery = true)
    List<StandingTotals> aggregateStandings();
}
