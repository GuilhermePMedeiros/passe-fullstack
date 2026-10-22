package br.com.passebackend.match.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class MatchRequestDTO {
    private Integer homeClubId;
    private Integer awayClubId;

    public Integer getHomeClubId() {
        return homeClubId;
    }

    public void setHomeClubId(Integer homeClubId) {
        this.homeClubId = homeClubId;
    }

    public Integer getAwayClubId() {
        return awayClubId;
    }

    public void setAwayClubId(Integer awayClubId) {
        this.awayClubId = awayClubId;
    }
}
