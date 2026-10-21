package br.com.passebackend.club;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubRepository 
	extends JpaRepository<Club, Integer> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Club c where c.id = :id")
    Optional<Club> findForUpdate(@Param("id") Integer id);

    boolean existsByName(String name);

    boolean existsByAcronym(String acronym);

}
