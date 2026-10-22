package br.com.passebackend.market.dto;

import br.com.passebackend.contract.dto.ContractResponseDTO;
import br.com.passebackend.transaction.dto.TransactionResponseDTO;
import com.fasterxml.jackson.annotation.JsonInclude;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;
import java.math.BigDecimal;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class MarketResponseDTO extends TransactionResponseDTO {
    
    private BigDecimal clubCash;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private ContractResponseDTO contract;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private BigDecimal purchaseValue;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer remainingDays;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private Integer penaltyRate;
    
    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String contractStatus;

    public BigDecimal getClubCash() {
        return clubCash;
    }

    public void setClubCash(BigDecimal clubCash) {
        this.clubCash = clubCash;
    }

    public ContractResponseDTO getContract() {
        return contract;
    }

    public void setContract(ContractResponseDTO contract) {
        this.contract = contract;
    }

    public BigDecimal getPurchaseValue() {
        return purchaseValue;
    }

    public void setPurchaseValue(BigDecimal purchaseValue) {
        this.purchaseValue = purchaseValue;
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

    public String getContractStatus() {
        return contractStatus;
    }

    public void setContractStatus(String contractStatus) {
        this.contractStatus = contractStatus;
    }
}
