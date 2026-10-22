package br.com.passebackend.transaction;

import br.com.passebackend.club.Club;
import br.com.passebackend.nucleo.base.ObjectBase;
import br.com.passebackend.player.Player;
import br.com.passebackend.transaction.converter.TransactionTypeConverter;
import br.com.passebackend.transaction.enums.TransactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.hibernate.annotations.Check;

@Entity
@Table(name = "transacoes")
@Check(constraints = "tipo IN ('COMPRA','VENDA')")
public class Transaction extends ObjectBase {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "clube_id", nullable = false)
    private Club club;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "jogador_id", nullable = false)
    private Player player;

    @Column(name = "nome_jogador", nullable = false, length = 100)
    private String playerName;

    @Convert(converter = TransactionTypeConverter.class)
    @Column(name = "tipo", nullable = false, length = 6)
    private TransactionType type;

    @Column(name = "valor", nullable = false, precision = 6, scale = 2)
    private BigDecimal value;

    @Column(name = "taxa", nullable = false, precision = 6, scale = 2)
    private BigDecimal fee;

    @Column(name = "multa", nullable = false, precision = 6, scale = 2)
    private BigDecimal penalty;

    @Column(name = "lucro", nullable = true, precision = 7, scale = 2)
    private BigDecimal profit;

    @Column(name = "variacao_caixa", nullable = false, precision = 8, scale = 2)
    private BigDecimal cashChange;

    @Column(name = "criado_em", nullable = false, columnDefinition = "TIMESTAMP")
    private LocalDateTime createdAt;

    public Transaction() {
    }

    public Club getClub() { return club; }

    public void setClub(Club club) { this.club = club; }

    public Player getPlayer() { return player; }

    public void setPlayer(Player player) { this.player = player; }

    public String getPlayerName() { return playerName; }

    public void setPlayerName(String playerName) { this.playerName = playerName; }

    public TransactionType getType() { return type; }

    public void setType(TransactionType type) { this.type = type; }

    public BigDecimal getValue() { return value; }

    public void setValue(BigDecimal value) { this.value = value; }

    public BigDecimal getFee() { return fee; }

    public void setFee(BigDecimal fee) { this.fee = fee; }

    public BigDecimal getPenalty() { return penalty; }

    public void setPenalty(BigDecimal penalty) { this.penalty = penalty; }

    public BigDecimal getProfit() { return profit; }

    public void setProfit(BigDecimal profit) { this.profit = profit; }

    public BigDecimal getCashChange() { return cashChange; }

    public void setCashChange(BigDecimal cashChange) { this.cashChange = cashChange; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
