package br.com.passebackend.lineup;
import org.springframework.data.jpa.repository.JpaRepository;
public interface LineupRepository extends JpaRepository<Lineup, LineupId> {
    void deleteByPlayerId(Integer playerId);
}
