package br.com.passebackend.market.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class BuyRequestDTO {
    
    private Integer clubId;
    
    private java.time.LocalDateTime loyaltyUntil;

    public Integer getClubId() {
        return clubId;
    }

    public void setClubId(Integer clubId) {
        this.clubId = clubId;
    }

    public java.time.LocalDateTime getLoyaltyUntil() {
        return loyaltyUntil;
    }

    public void setLoyaltyUntil(java.time.LocalDateTime loyaltyUntil) {
        this.loyaltyUntil = loyaltyUntil;
    }
}
