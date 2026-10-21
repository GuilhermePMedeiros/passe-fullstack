package br.com.passebackend.lineup;

import br.com.passebackend.club.Club;
import br.com.passebackend.player.Player;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(name = "escalacoes", uniqueConstraints = @UniqueConstraint(name = "uk_escalacoes_jogador", columnNames = {"jogador_id"}))
@IdClass(LineupId.class)
public class Lineup {

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "clube_id", nullable = false)
    private Club club;

    @Id
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "jogador_id", nullable = false)
    private Player player;

    @Column(name = "criado_em", nullable = false, columnDefinition = "TIMESTAMP")
    private LocalDateTime createdAt;

    public Lineup() {
    }

    public Club getClub() { return club; }

    public void setClub(Club club) { this.club = club; }

    public Player getPlayer() { return player; }

    public void setPlayer(Player player) { this.player = player; }

    public LocalDateTime getCreatedAt() { return createdAt; }

    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
