package br.com.passebackend.lineup.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class LineupRequestDTO {
    private br.com.passebackend.lineup.enums.Formation formation;
    private java.util.List<Integer> playerIds;

    public br.com.passebackend.lineup.enums.Formation getFormation() {
        return formation;
    }

    public void setFormation(br.com.passebackend.lineup.enums.Formation formation) {
        this.formation = formation;
    }

    public java.util.List<Integer> getPlayerIds() {
        return playerIds;
    }

    public void setPlayerIds(java.util.List<Integer> playerIds) {
        this.playerIds = playerIds;
    }
}
