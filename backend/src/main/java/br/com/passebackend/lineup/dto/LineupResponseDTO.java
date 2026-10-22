package br.com.passebackend.lineup.dto;

import br.com.passebackend.player.dto.PlayerResponseDTO;
import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class LineupResponseDTO {
    private Integer clubId;
    private String formation;
    private boolean complete;
    private List<PlayerResponseDTO> players;

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

    public List<PlayerResponseDTO> getPlayers() {
        return players;
    }

    public void setPlayers(List<PlayerResponseDTO> players) {
        this.players = players;
    }
}
