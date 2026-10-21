package br.com.passebackend.match.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class MatchResponseDTO {
    private Integer id;
    private String playedAt;
    private MatchClubDTO home;
    private MatchClubDTO away;
    private String result;
    @com.fasterxml.jackson.annotation.JsonInclude(com.fasterxml.jackson.annotation.JsonInclude.Include.NON_NULL)
    private java.util.List<MatchDuelDTO> duels;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getPlayedAt() {
        return playedAt;
    }

    public void setPlayedAt(String playedAt) {
        this.playedAt = playedAt;
    }

    public MatchClubDTO getHome() {
        return home;
    }

    public void setHome(MatchClubDTO home) {
        this.home = home;
    }

    public MatchClubDTO getAway() {
        return away;
    }

    public void setAway(MatchClubDTO away) {
        this.away = away;
    }

    public String getResult() {
        return result;
    }

    public void setResult(String result) {
        this.result = result;
    }

    public java.util.List<MatchDuelDTO> getDuels() {
        return duels;
    }

    public void setDuels(java.util.List<MatchDuelDTO> duels) {
        this.duels = duels;
    }
}
