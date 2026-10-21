package br.com.passebackend.player;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import jakarta.persistence.criteria.Predicate;

public interface PlayerRepository 
	extends JpaRepository<Player, Integer>,
			JpaSpecificationExecutor<Player> {
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from Player p where p.id = :id and p.deletedAt is null")
    java.util.Optional<Player> findActiveForUpdate(@org.springframework.data.repository.query.Param("id") Integer id);

    long countByClubIdAndDeletedAtIsNull(Integer clubId);

    List<Player> findByClubIdAndDeletedAtIsNull(Integer clubId);

    List<Player> findByClubIdInAndDeletedAtIsNull(List<Integer> clubIds);

    default List<Player> findActivePlayers(PlayerPosition position, PlayerCondition condition,
            Boolean free, Integer clubId, Integer minAge, Integer maxAge) {

        return findAll((root, query, builder) -> {
            List<Predicate> filters = new ArrayList<>();

            filters.add(builder.isNull(root.get("deletedAt")));

            if (position != null) {
                filters.add(builder.equal(root.get("position"), position));
            }

            if (condition != null) {
                filters.add(builder.equal(root.get("condition"), condition));
            }

            if (free != null) {
                filters.add(free ? builder.isNull(root.get("club")) : builder.isNotNull(root.get("club")));
            }

            if (clubId != null) {
                filters.add(builder.equal(root.get("club").get("id"), clubId));
            }

            if (minAge != null) {
                filters.add(builder.greaterThanOrEqualTo(root.get("age"), minAge));
            }

            if (maxAge != null) {
                filters.add(builder.lessThanOrEqualTo(root.get("age"), maxAge));
            }

            return builder.and(filters.toArray(Predicate[]::new));
        });
    }

}
