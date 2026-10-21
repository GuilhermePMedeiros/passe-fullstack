package br.com.passebackend.contract;

import br.com.passebackend.club.Club;
import br.com.passebackend.contract.converter.ContractStatusConverter;
import br.com.passebackend.contract.enums.ContractStatus;
import br.com.passebackend.nucleo.base.ObjectBase;
import br.com.passebackend.player.Player;
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
@Table(name = "contratos")
@Check(constraints = "situacao IN ('ATIVO','ENCERRADO','RESCINDIDO')")
public class Contract extends ObjectBase {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "jogador_id", nullable = false)
    private Player player;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "clube_id", nullable = false)
    private Club club;

    @Column(name = "valor_compra", nullable = false, precision = 6, scale = 2)
    private BigDecimal purchaseValue;

    @Column(name = "fidelidade_ate", nullable = false, columnDefinition = "TIMESTAMP")
    private LocalDateTime loyaltyUntil;

    @Convert(converter = ContractStatusConverter.class)
    @Column(name = "situacao", nullable = false, length = 12)
    private ContractStatus status;

    @Column(name = "iniciado_em", nullable = false, columnDefinition = "TIMESTAMP")
    private LocalDateTime startedAt;

    @Column(name = "encerrado_em", nullable = true, columnDefinition = "TIMESTAMP")
    private LocalDateTime endedAt;

    public Contract() {
    }

    public Player getPlayer() { return player; }

    public void setPlayer(Player player) { this.player = player; }

    public Club getClub() { return club; }

    public void setClub(Club club) { this.club = club; }

    public BigDecimal getPurchaseValue() { return purchaseValue; }

    public void setPurchaseValue(BigDecimal purchaseValue) { this.purchaseValue = purchaseValue; }

    public LocalDateTime getLoyaltyUntil() { return loyaltyUntil; }

    public void setLoyaltyUntil(LocalDateTime loyaltyUntil) { this.loyaltyUntil = loyaltyUntil; }

    public ContractStatus getStatus() { return status; }

    public void setStatus(ContractStatus status) { this.status = status; }

    public LocalDateTime getStartedAt() { return startedAt; }

    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }

    public LocalDateTime getEndedAt() { return endedAt; }

    public void setEndedAt(LocalDateTime endedAt) { this.endedAt = endedAt; }
}
