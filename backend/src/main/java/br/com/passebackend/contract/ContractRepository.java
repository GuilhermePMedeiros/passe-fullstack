package br.com.passebackend.contract;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ContractRepository extends JpaRepository<Contract, Integer> {
    java.util.List<Contract> findByPlayerIdAndStatus(Integer playerId,
            br.com.passebackend.contract.enums.ContractStatus status);

    java.util.List<Contract> findByClubIdAndStatus(Integer clubId,
            br.com.passebackend.contract.enums.ContractStatus status);

    boolean existsByPlayerIdAndStatus(Integer playerId,
            br.com.passebackend.contract.enums.ContractStatus status);
}
