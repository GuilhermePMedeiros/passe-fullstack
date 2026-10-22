package br.com.passebackend.lineup;

import java.io.Serializable;
import java.util.Objects;

public class LineupId implements Serializable {
    private static final long serialVersionUID = 1L;
    private Integer club;
    private Integer player;

    public LineupId() { }

    public LineupId(Integer club, Integer player) {
        this.club = club;
        this.player = player;
    }

    public Integer getClub() { return club; }
    public void setClub(Integer club) { this.club = club; }
    public Integer getPlayer() { return player; }
    public void setPlayer(Integer player) { this.player = player; }

    @Override
    public boolean equals(Object other) {
        if (this == other) return true;
        if (!(other instanceof LineupId that)) return false;
        return Objects.equals(club, that.club) && Objects.equals(player, that.player);
    }

    @Override
    public int hashCode() { return Objects.hash(club, player); }
}
