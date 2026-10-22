package br.com.passebackend.transaction.dto;

import java.util.List;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class TransactionHistoryDTO {
    private List<TransactionResponseDTO> data;
    private TransactionSummaryDTO summary;

    public List<TransactionResponseDTO> getData() {
        return data;
    }

    public void setData(List<TransactionResponseDTO> data) {
        this.data = data;
    }

    public TransactionSummaryDTO getSummary() {
        return summary;
    }

    public void setSummary(TransactionSummaryDTO summary) {
        this.summary = summary;
    }
}
