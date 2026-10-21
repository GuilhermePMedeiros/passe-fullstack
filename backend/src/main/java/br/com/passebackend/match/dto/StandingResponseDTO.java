package br.com.passebackend.match.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class StandingResponseDTO {
    private Integer position;
    private Integer clubId;
    private String clubName;
    private Integer played;
    private Integer wins;
    private Integer draws;
    private Integer losses;
    private Integer goalsFor;
    private Integer goalsAgainst;
    private Integer goalDifference;
    private Integer points;

    public Integer getPosition() {
        return position;
    }

    public void setPosition(Integer position) {
        this.position = position;
    }

    public Integer getClubId() {
        return clubId;
    }

    public void setClubId(Integer clubId) {
        this.clubId = clubId;
    }

    public String getClubName() {
        return clubName;
    }

    public void setClubName(String clubName) {
        this.clubName = clubName;
    }

    public Integer getPlayed() {
        return played;
    }

    public void setPlayed(Integer played) {
        this.played = played;
    }

    public Integer getWins() {
        return wins;
    }

    public void setWins(Integer wins) {
        this.wins = wins;
    }

    public Integer getDraws() {
        return draws;
    }

    public void setDraws(Integer draws) {
        this.draws = draws;
    }

    public Integer getLosses() {
        return losses;
    }

    public void setLosses(Integer losses) {
        this.losses = losses;
    }

    public Integer getGoalsFor() {
        return goalsFor;
    }

    public void setGoalsFor(Integer goalsFor) {
        this.goalsFor = goalsFor;
    }

    public Integer getGoalsAgainst() {
        return goalsAgainst;
    }

    public void setGoalsAgainst(Integer goalsAgainst) {
        this.goalsAgainst = goalsAgainst;
    }

    public Integer getGoalDifference() {
        return goalDifference;
    }

    public void setGoalDifference(Integer goalDifference) {
        this.goalDifference = goalDifference;
    }

    public Integer getPoints() {
        return points;
    }

    public void setPoints(Integer points) {
        this.points = points;
    }
}
