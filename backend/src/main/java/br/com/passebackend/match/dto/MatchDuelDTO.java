package br.com.passebackend.match.dto;

import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.databind.annotation.JsonNaming;

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy.class)
public class MatchDuelDTO {
    private Integer order;
    private Integer attackingClubId;
    private DuelPlayerDTO attacker;
    private DuelPlayerDTO defender;
    private Boolean goal;

    public Integer getOrder() {
        return order;
    }

    public void setOrder(Integer order) {
        this.order = order;
    }

    public Integer getAttackingClubId() {
        return attackingClubId;
    }

    public void setAttackingClubId(Integer attackingClubId) {
        this.attackingClubId = attackingClubId;
    }

    public DuelPlayerDTO getAttacker() {
        return attacker;
    }

    public void setAttacker(DuelPlayerDTO attacker) {
        this.attacker = attacker;
    }

    public DuelPlayerDTO getDefender() {
        return defender;
    }

    public void setDefender(DuelPlayerDTO defender) {
        this.defender = defender;
    }

    public Boolean getGoal() {
        return goal;
    }

    public void setGoal(Boolean goal) {
        this.goal = goal;
    }
}
