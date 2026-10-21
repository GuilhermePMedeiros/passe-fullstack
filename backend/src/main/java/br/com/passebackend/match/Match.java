package br.com.passebackend.match;

import br.com.passebackend.club.Club;
import br.com.passebackend.lineup.converter.FormationConverter;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.nucleo.base.ObjectBase;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import org.hibernate.annotations.Check;

@Entity
@Table(name = "partidas")
@Check(constraints = "mandante_id <> visitante_id AND gols_mandante BETWEEN 0 AND 3 AND gols_visitante BETWEEN 0 AND 3 AND formacao_mandante IN ('3-1','2-2','2-1-1','1-2-1') AND formacao_visitante IN ('3-1','2-2','2-1-1','1-2-1')")
public class Match extends ObjectBase {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "mandante_id", nullable = false)
    private Club homeClub;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "visitante_id", nullable = false)
    private Club awayClub;

    @Column(name = "gols_mandante", nullable = false)
    private Integer homeGoals;

    @Column(name = "gols_visitante", nullable = false)
    private Integer awayGoals;

    @Convert(converter = FormationConverter.class)
    @Column(name = "formacao_mandante", nullable = false, length = 5)
    private Formation homeFormation;

    @Convert(converter = FormationConverter.class)
    @Column(name = "formacao_visitante", nullable = false, length = 5)
    private Formation awayFormation;

    @Column(name = "jogada_em", nullable = false, columnDefinition = "TIMESTAMP")
    private LocalDateTime playedAt;

    public Match() {
    }

    public Club getHomeClub() { return homeClub; }

    public void setHomeClub(Club homeClub) { this.homeClub = homeClub; }

    public Club getAwayClub() { return awayClub; }

    public void setAwayClub(Club awayClub) { this.awayClub = awayClub; }

    public Integer getHomeGoals() { return homeGoals; }

    public void setHomeGoals(Integer homeGoals) { this.homeGoals = homeGoals; }

    public Integer getAwayGoals() { return awayGoals; }

    public void setAwayGoals(Integer awayGoals) { this.awayGoals = awayGoals; }

    public Formation getHomeFormation() { return homeFormation; }

    public void setHomeFormation(Formation homeFormation) { this.homeFormation = homeFormation; }

    public Formation getAwayFormation() { return awayFormation; }

    public void setAwayFormation(Formation awayFormation) { this.awayFormation = awayFormation; }

    public LocalDateTime getPlayedAt() { return playedAt; }

    public void setPlayedAt(LocalDateTime playedAt) { this.playedAt = playedAt; }
}
