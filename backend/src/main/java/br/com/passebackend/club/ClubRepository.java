package br.com.passebackend.club;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubRepository 
	extends JpaRepository<Club, Integer> {

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select c from Club c where c.id = :id")
    java.util.Optional<Club> findForUpdate(@org.springframework.data.repository.query.Param("id") Integer id);

    boolean existsByName(String name);

    boolean existsByAcronym(String acronym);

}
