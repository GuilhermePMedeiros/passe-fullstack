package br.com.passebackend.match;

/** Projection of aggregate values, without loading matches or player relationships. */
public interface StandingTotals {
    Integer getClubId();
    String getClubName();
    Long getPlayed();
    Long getWins();
    Long getDraws();
    Long getLosses();
    Long getGoalsFor();
    Long getGoalsAgainst();
}
