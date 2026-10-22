package br.com.passebackend.club.dto;

import java.math.BigDecimal;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

import br.com.passebackend.player.dto.PlayerResponseDTO;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class ClubResponseDTO {

    private Integer id;
    private String name;
    private String acronym;
    private BigDecimal cash;
    private BigDecimal squadValue;
    private BigDecimal netWorth;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private List<PlayerResponseDTO> players;

    public ClubResponseDTO() {
    }

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getAcronym() {
        return acronym;
    }

    public void setAcronym(String acronym) {
        this.acronym = acronym;
    }

    public BigDecimal getCash() {
        return cash;
    }

    public void setCash(BigDecimal cash) {
        this.cash = cash;
    }

    public BigDecimal getSquadValue() {
        return squadValue;
    }

    public void setSquadValue(BigDecimal squadValue) {
        this.squadValue = squadValue;
    }

    public BigDecimal getNetWorth() {
        return netWorth;
    }

    public void setNetWorth(BigDecimal netWorth) {
        this.netWorth = netWorth;
    }

    public List<PlayerResponseDTO> getPlayers() {
        return players;
    }

    public void setPlayers(List<PlayerResponseDTO> players) {
        this.players = players;
    }
}
