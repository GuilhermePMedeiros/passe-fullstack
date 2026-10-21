package br.com.passebackend.transaction;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, Integer>,
        org.springframework.data.jpa.repository.JpaSpecificationExecutor<Transaction> {
    boolean existsByClubIdAndPlayerIdAndType(Integer clubId, Integer playerId,
            br.com.passebackend.transaction.enums.TransactionType type);
}
