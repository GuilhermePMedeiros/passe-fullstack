package br.com.passebackend.contract;

import br.com.passebackend.contract.enums.ContractStatus;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractRepository extends JpaRepository<Contract, Integer> {
    List<Contract> findByPlayerIdAndStatus(Integer playerId,
            ContractStatus status);

    List<Contract> findByClubIdAndStatus(Integer clubId,
            ContractStatus status);

    boolean existsByPlayerIdAndStatus(Integer playerId,
            ContractStatus status);
}
