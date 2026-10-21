package br.com.passebackend.contract;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.passebackend.club.Club;
import br.com.passebackend.contract.dto.ContractResponseDTO;
import br.com.passebackend.contract.enums.ContractStatus;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import br.com.passebackend.nucleo.util.MoneyUtils;
import br.com.passebackend.player.Player;

@Service
public class ContractService {
    private static final int MAX_LOYALTY_DAYS = 1095;
    private static final int SHORT_LOYALTY_DAYS = 30;
    private static final int MEDIUM_LOYALTY_DAYS = 180;
    private static final BigDecimal MAX_PENALTY = new BigDecimal("10.00");

    @Autowired
    private ContractRepository repository;

    public void validateLoyalty(LocalDateTime loyalty, LocalDateTime now) {
        if (loyalty == null || !loyalty.isAfter(now) || loyalty.isAfter(now.plusDays(MAX_LOYALTY_DAYS))) {
            throw new IllegalArgumentException("Fidelidade deve ser futura e de no máximo 1.095 dias.");
        }
    }

    public int remainingDays(LocalDateTime loyalty, LocalDateTime now) {
        if (!loyalty.isAfter(now)) {
            return 0;
        }

        Duration remaining = Duration.between(now, loyalty);

        return roundUpDays(remaining);
    }

    private int roundUpDays(Duration remaining) {
        long wholeDays = remaining.toDays();
        boolean hasPartialDay = !remaining.minusDays(wholeDays).isZero();

        if (hasPartialDay) {
            wholeDays++;
        }

        return Math.toIntExact(wholeDays);
    }

    public int penaltyRate(int days) {
        if (days == 0) {
            return 0;
        }

        if (days <= SHORT_LOYALTY_DAYS) {
            return 5;
        }

        if (days <= MEDIUM_LOYALTY_DAYS) {
            return 10;
        }

        return 20;
    }

    public BigDecimal penalty(BigDecimal value, int rate) {
        BigDecimal percentage = BigDecimal.valueOf(rate).movePointLeft(2);
        BigDecimal calculatedPenalty = value.multiply(percentage);
        BigDecimal roundedPenalty = MoneyUtils.round(calculatedPenalty);

        return roundedPenalty.min(MAX_PENALTY);
    }

    @Transactional
    public Contract create(Player player, Club club, BigDecimal value, LocalDateTime loyalty, LocalDateTime now) {
        validateNoActiveContract(player.getId());

        Contract contract = createActiveContract(player, club, value, loyalty, now);

        return repository.save(contract);
    }

    private void validateNoActiveContract(Integer playerId) {
        if (repository.existsByPlayerIdAndStatus(playerId, ContractStatus.ACTIVE)) {
            throw new BusinessConflictException("Jogador já possui contrato ativo.");
        }
    }

    private Contract createActiveContract(Player player, Club club, BigDecimal value,
            LocalDateTime loyalty, LocalDateTime now) {
     
        Contract contract = new Contract();
        contract.setPlayer(player);
        contract.setClub(club);
        contract.setPurchaseValue(value);
        contract.setLoyaltyUntil(loyalty);
        contract.setStatus(ContractStatus.ACTIVE);
        contract.setStartedAt(now.withNano(0));
     
        return contract;
    }

    @Transactional(readOnly = true)
    public Contract getActive(Integer playerId, Integer clubId) {
        List<Contract> contracts = repository.findByPlayerIdAndStatus(playerId, ContractStatus.ACTIVE);
        validateActiveContract(contracts, clubId);

        return contracts.getFirst();
    }

    private void validateActiveContract(List<Contract> contracts, Integer clubId) {
        if (contracts.size() != 1 || !contracts.getFirst().getClub().getId().equals(clubId)) {
            throw new BusinessConflictException("Contrato ativo do jogador inconsistente.");
        }
    }

    @Transactional
    public void close(Contract contract, BigDecimal penalty, LocalDateTime now) {
        contract.setStatus(closedStatus(penalty));
        contract.setEndedAt(now.withNano(0));
    }

    private ContractStatus closedStatus(BigDecimal penalty) {
        if (penalty.signum() > 0) {
            return ContractStatus.TERMINATED;
        }

        return ContractStatus.CLOSED;
    }

    @Transactional(readOnly = true)
    public Map<Integer, ContractResponseDTO> getClubContracts(Integer clubId) {
        Map<Integer, ContractResponseDTO> result = new HashMap<>();
        LocalDateTime now = DateTimeUtils.now();

        for (Contract contract : repository.findByClubIdAndStatus(clubId, ContractStatus.ACTIVE)) {
            result.put(contract.getPlayer().getId(), toClubResponse(contract, now));
        }

        return result;
    }

    private ContractResponseDTO toClubResponse(Contract contract, LocalDateTime now) {
        int days = remainingDays(contract.getLoyaltyUntil(), now);

        ContractResponseDTO response = toResponse(contract);
        response.setRemainingDays(days);
        response.setPenaltyRate(penaltyRate(days));

        return response;
    }

    public ContractResponseDTO toResponse(Contract contract) {
        ContractResponseDTO dto = new ContractResponseDTO();
    
        dto.setPurchaseValue(contract.getPurchaseValue());
        dto.setLoyaltyUntil(DateTimeUtils.format(contract.getLoyaltyUntil()));

        return dto;
    }
}
