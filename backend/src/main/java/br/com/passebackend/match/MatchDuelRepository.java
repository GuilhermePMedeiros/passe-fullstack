package br.com.passebackend.match;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchDuelRepository extends JpaRepository<MatchDuel, Integer> {
    List<MatchDuel> findByMatchIdOrderByOrderAsc(Integer matchId);
}
