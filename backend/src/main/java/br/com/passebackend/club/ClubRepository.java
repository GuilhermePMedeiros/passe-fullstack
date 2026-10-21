package br.com.passebackend.club;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ClubRepository 
	extends JpaRepository<Club, Integer> {

    boolean existsByName(String name);

    boolean existsByAcronym(String acronym);

}
