package br.com.passebackend.match;

import br.com.passebackend.club.Club;
import br.com.passebackend.match.converter.DuelAttributeConverter;
import br.com.passebackend.match.enums.DuelAttribute;
import br.com.passebackend.nucleo.base.ObjectBase;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.converter.PlayerConditionConverter;
import br.com.passebackend.player.converter.PlayerPositionConverter;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.hibernate.annotations.Check;

@Entity
@Table(name = "duelos_partida", uniqueConstraints = @UniqueConstraint(name = "uk_duelos_partida_ordem", columnNames = {"partida_id", "ordem"}))
@Check(constraints = "ordem BETWEEN 1 AND 6 AND posicao_atacante IN ('GOL','ZAG','LAT','MEI','ATA') AND posicao_defensor IN ('GOL','ZAG','LAT','MEI','ATA') AND condicao_atacante IN ('APTO','MAL_CONDICIONADO') AND condicao_defensor IN ('APTO','MAL_CONDICIONADO') AND atributo_ataque IN ('shooting','passing','dribbling','defending') AND atributo_defesa IN ('shooting','passing','dribbling','defending')")
public class MatchDuel extends ObjectBase {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "partida_id", nullable = false)
    private Match match;

    @Column(name = "ordem", nullable = false)
    private Integer order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "clube_atacante_id", nullable = false)
    private Club attackingClub;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "atacante_id", nullable = false)
    private Player attacker;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "defensor_id", nullable = false)
    private Player defender;

    @Column(name = "nome_atacante", nullable = false, length = 100)
    private String attackerName;

    @Column(name = "nome_defensor", nullable = false, length = 100)
    private String defenderName;

    @Convert(converter = PlayerPositionConverter.class)
    @Column(name = "posicao_atacante", nullable = false, length = 3)
    private PlayerPosition attackerPosition;

    @Convert(converter = PlayerPositionConverter.class)
    @Column(name = "posicao_defensor", nullable = false, length = 3)
    private PlayerPosition defenderPosition;

    @Convert(converter = PlayerConditionConverter.class)
    @Column(name = "condicao_atacante", nullable = false, length = 20)
    private PlayerCondition attackerCondition;

    @Convert(converter = PlayerConditionConverter.class)
    @Column(name = "condicao_defensor", nullable = false, length = 20)
    private PlayerCondition defenderCondition;

    @Convert(converter = DuelAttributeConverter.class)
    @Column(name = "atributo_ataque", nullable = false, length = 10)
    private DuelAttribute attackAttribute;

    @Convert(converter = DuelAttributeConverter.class)
    @Column(name = "atributo_defesa", nullable = false, length = 10)
    private DuelAttribute defenseAttribute;

    @Column(name = "valor_ataque", nullable = false)
    private Integer attackValue;

    @Column(name = "valor_defesa", nullable = false)
    private Integer defenseValue;

    @Column(name = "gol", nullable = false)
    private Boolean goal;

    public MatchDuel() {
    }

    public Match getMatch() { return match; }

    public void setMatch(Match match) { this.match = match; }

    public Integer getOrder() { return order; }

    public void setOrder(Integer order) { this.order = order; }

    public Club getAttackingClub() { return attackingClub; }

    public void setAttackingClub(Club attackingClub) { this.attackingClub = attackingClub; }

    public Player getAttacker() { return attacker; }

    public void setAttacker(Player attacker) { this.attacker = attacker; }

    public Player getDefender() { return defender; }

    public void setDefender(Player defender) { this.defender = defender; }

    public String getAttackerName() { return attackerName; }

    public void setAttackerName(String attackerName) { this.attackerName = attackerName; }

    public String getDefenderName() { return defenderName; }

    public void setDefenderName(String defenderName) { this.defenderName = defenderName; }

    public PlayerPosition getAttackerPosition() { return attackerPosition; }

    public void setAttackerPosition(PlayerPosition attackerPosition) { this.attackerPosition = attackerPosition; }

    public PlayerPosition getDefenderPosition() { return defenderPosition; }

    public void setDefenderPosition(PlayerPosition defenderPosition) { this.defenderPosition = defenderPosition; }

    public PlayerCondition getAttackerCondition() { return attackerCondition; }

    public void setAttackerCondition(PlayerCondition attackerCondition) { this.attackerCondition = attackerCondition; }

    public PlayerCondition getDefenderCondition() { return defenderCondition; }

    public void setDefenderCondition(PlayerCondition defenderCondition) { this.defenderCondition = defenderCondition; }

    public DuelAttribute getAttackAttribute() { return attackAttribute; }

    public void setAttackAttribute(DuelAttribute attackAttribute) { this.attackAttribute = attackAttribute; }

    public DuelAttribute getDefenseAttribute() { return defenseAttribute; }

    public void setDefenseAttribute(DuelAttribute defenseAttribute) { this.defenseAttribute = defenseAttribute; }

    public Integer getAttackValue() { return attackValue; }

    public void setAttackValue(Integer attackValue) { this.attackValue = attackValue; }

    public Integer getDefenseValue() { return defenseValue; }

    public void setDefenseValue(Integer defenseValue) { this.defenseValue = defenseValue; }

    public Boolean getGoal() { return goal; }

    public void setGoal(Boolean goal) { this.goal = goal; }
}
