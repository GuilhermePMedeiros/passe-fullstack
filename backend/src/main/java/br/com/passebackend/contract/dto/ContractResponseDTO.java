package br.com.passebackend.contract.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.math.BigDecimal;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ContractResponseDTO {
    private BigDecimal purchaseValue;
    private String loyaltyUntil;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer remainingDays;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer penaltyRate;
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String status;

    public BigDecimal getPurchaseValue() {
        return purchaseValue;
    }

    public void setPurchaseValue(BigDecimal purchaseValue) {
        this.purchaseValue = purchaseValue;
    }

    public String getLoyaltyUntil() {
        return loyaltyUntil;
    }

    public void setLoyaltyUntil(String loyaltyUntil) {
        this.loyaltyUntil = loyaltyUntil;
    }

    public Integer getRemainingDays() {
        return remainingDays;
    }

    public void setRemainingDays(Integer remainingDays) {
        this.remainingDays = remainingDays;
    }

    public Integer getPenaltyRate() {
        return penaltyRate;
    }

    public void setPenaltyRate(Integer penaltyRate) {
        this.penaltyRate = penaltyRate;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
