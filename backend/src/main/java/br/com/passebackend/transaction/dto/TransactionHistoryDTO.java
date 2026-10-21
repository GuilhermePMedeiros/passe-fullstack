package br.com.passebackend.transaction.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class TransactionHistoryDTO {
    private java.util.List<TransactionResponseDTO> data;
    private TransactionSummaryDTO summary;

    public java.util.List<TransactionResponseDTO> getData() {
        return data;
    }

    public void setData(java.util.List<TransactionResponseDTO> data) {
        this.data = data;
    }

    public TransactionSummaryDTO getSummary() {
        return summary;
    }

    public void setSummary(TransactionSummaryDTO summary) {
        this.summary = summary;
    }
}
