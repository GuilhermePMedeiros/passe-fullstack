package br.com.passebackend.lineup.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class LineupResponseDTO {
    private Integer clubId;
    private String formation;
    private boolean complete;
    private java.util.List<br.com.passebackend.player.dto.PlayerResponseDTO> players;

    public Integer getClubId() {
        return clubId;
    }

    public void setClubId(Integer clubId) {
        this.clubId = clubId;
    }

    public String getFormation() {
        return formation;
    }

    public void setFormation(String formation) {
        this.formation = formation;
    }

    public boolean getComplete() {
        return complete;
    }

    public void setComplete(boolean complete) {
        this.complete = complete;
    }

    public java.util.List<br.com.passebackend.player.dto.PlayerResponseDTO> getPlayers() {
        return players;
    }

    public void setPlayers(java.util.List<br.com.passebackend.player.dto.PlayerResponseDTO> players) {
        this.players = players;
    }
}
