package br.com.passebackend.transaction;

import br.com.passebackend.transaction.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import org.springframework.data.jpa.repository.JpaRepository;

public interface TransactionRepository extends JpaRepository<Transaction, Integer>,
        JpaSpecificationExecutor<Transaction> {
    boolean existsByClubIdAndPlayerIdAndType(Integer clubId, Integer playerId,
            TransactionType type);
}
