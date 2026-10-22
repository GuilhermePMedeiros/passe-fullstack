package br.com.passebackend.lineup;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LineupRepository extends JpaRepository<Lineup, LineupId> {
    void deleteByPlayerId(Integer playerId);

    void deleteByClubId(Integer clubId);

    @Query("select l from Lineup l join fetch l.player where l.club.id = :clubId")
    List<Lineup> findWithPlayersByClubId(@Param("clubId") Integer clubId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select l from Lineup l join fetch l.player where l.club.id = :clubId")
    List<Lineup> findWithPlayersForUpdate(@Param("clubId") Integer clubId);

    @Query("select l.player.id from Lineup l where l.club.id in :clubIds")
    List<Integer> findPlayerIdsByClubIds(@Param("clubIds") List<Integer> clubIds);

    @Query(value = "select jogador_id from escalacoes where clube_id in (:clubIds) order by jogador_id for update", nativeQuery = true)
    List<Integer> findCurrentPlayerIdsForUpdate(@Param("clubIds") List<Integer> clubIds);
}
