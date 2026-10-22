package br.com.passebackend.market.dto;

import java.time.LocalDateTime;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BuyRequestDTO {
    
    private Integer clubId;
    
    private LocalDateTime loyaltyUntil;

    public Integer getClubId() {
        return clubId;
    }

    public void setClubId(Integer clubId) {
        this.clubId = clubId;
    }

    public LocalDateTime getLoyaltyUntil() {
        return loyaltyUntil;
    }

    public void setLoyaltyUntil(LocalDateTime loyaltyUntil) {
        this.loyaltyUntil = loyaltyUntil;
    }
}
