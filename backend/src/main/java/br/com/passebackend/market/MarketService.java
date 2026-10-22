package br.com.passebackend.market;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.contract.Contract;
import br.com.passebackend.contract.ContractService;
import br.com.passebackend.lineup.LineupRepository;
import br.com.passebackend.market.dto.BuyRequestDTO;
import br.com.passebackend.market.dto.MarketResponseDTO;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import br.com.passebackend.nucleo.util.MoneyUtils;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.transaction.Transaction;
import br.com.passebackend.transaction.TransactionRepository;
import br.com.passebackend.transaction.dto.TransactionHistoryDTO;
import br.com.passebackend.transaction.dto.TransactionResponseDTO;
import br.com.passebackend.transaction.dto.TransactionSummaryDTO;
import br.com.passebackend.transaction.enums.TransactionType;
import jakarta.persistence.criteria.Predicate;

@Service
public class MarketService {

    private static final BigDecimal ZERO_MONEY = new BigDecimal("0.00");
    private static final BigDecimal PURCHASE_FEE_THRESHOLD = new BigDecimal("30.00");
    private static final BigDecimal PURCHASE_FEE_RATE = new BigDecimal("0.05");
    private static final BigDecimal COMMISSION_FIRST_BRACKET = new BigDecimal("10.00");
    private static final BigDecimal COMMISSION_FIRST_RATE = new BigDecimal("0.10");
    private static final BigDecimal COMMISSION_SECOND_RATE = new BigDecimal("0.20");
    private static final String CSV_HEADER =
            "data_hora;tipo;jogador;valor;taxa_ou_comissao;multa;lucro;variacao_caixa\n";

    @Autowired
    private PlayerService players;

    @Autowired
    private ClubService clubs;

    @Autowired
    private ContractService contracts;

    @Autowired
    private TransactionRepository repository;

    @Autowired
    private LineupRepository lineups;

    @Transactional
    public MarketResponseDTO buy(Integer playerId, BuyRequestDTO request) {
        validateBuyRequest(request);

        Player player = players.getActivePlayerForUpdate(playerId);
        Club club = clubs.getClubForUpdate(request.getClubId());
        LocalDateTime now = DateTimeUtils.now();

        validatePurchase(player, club, request, now);

        BigDecimal value = players.calculateMarketValue(player);
        BigDecimal fee = purchaseFee(value);
        BigDecimal cost = value.add(fee);
        validatePurchaseCost(club, cost);

        Contract contract = contracts.create(player, club, value, request.getLoyaltyUntil(), now);
        applyPurchase(player, club, cost);

        Transaction transaction = record(player, club, TransactionType.PURCHASE, value, fee,
                ZERO_MONEY, null, cost.negate(), now);

        return purchaseResponse(transaction, club, contract);
    }

    private void validateBuyRequest(BuyRequestDTO request) {
        if (request == null || request.getClubId() == null || request.getClubId() <= 0) {
            throw new IllegalArgumentException("Clube comprador obrigatório.");
        }
    }

    private void validatePurchase(Player player, Club club, BuyRequestDTO request, LocalDateTime now) {
        contracts.validateLoyalty(request.getLoyaltyUntil(), now);

        if (player.getClub() != null) {
            throw new BusinessConflictException("Jogador não está livre.");
        }

        if (players.countPlayersByClubId(club.getId()) >= 12) {
            throw new BusinessConflictException("Elenco já possui 12 jogadores.");
        }

        if (repository.existsByClubIdAndPlayerIdAndType(club.getId(), player.getId(), TransactionType.SALE)) {
            throw new BusinessConflictException("Clube não pode recomprar jogador que já vendeu.");
        }
    }

    private void validatePurchaseCost(Club club, BigDecimal cost) {
        BigDecimal cashLimit = club.getCash().divide(BigDecimal.valueOf(2));

        if (cost.compareTo(cashLimit) > 0) {
            throw new BusinessConflictException("Custo ultrapassa 50% do caixa.");
        }
    }

    private void applyPurchase(Player player, Club club, BigDecimal cost) {

        club.setCash(club.getCash().subtract(cost));
        player.setClub(club);

    }

    private MarketResponseDTO purchaseResponse(Transaction transaction, Club club, Contract contract) {
 
        MarketResponseDTO response = operationResponse(transaction, club);
 
        var contractResponse = contracts.toResponse(contract);
 
        contractResponse.setStatus(contract.getStatus().getCode());
        response.setContract(contractResponse);

        return response;
    }

    @Transactional
    public MarketResponseDTO sell(Integer playerId) {
        Player player = players.getActivePlayerForUpdate(playerId);
        validateSale(player);

        Club club = clubs.getClubForUpdate(player.getClub().getId());
        Contract contract = contracts.getActive(playerId, club.getId());
        LocalDateTime now = DateTimeUtils.now();

        int days = contracts.remainingDays(contract.getLoyaltyUntil(), now);
        int rate = contracts.penaltyRate(days);
        Transaction transaction = createSaleTransaction(player, club, contract, rate, now);

        applySale(player, club, contract, transaction, now);
        repository.saveAndFlush(transaction);

        return saleResponse(transaction, club, contract, days, rate);
    }

    private void validateSale(Player player) {
        if (player.getClub() == null) {
            throw new BusinessConflictException("Jogador está livre.");
        }
    }

    private Transaction createSaleTransaction(Player player, Club club, Contract contract,
            int rate, LocalDateTime now) {
 
        BigDecimal value = players.calculateMarketValue(player);
        BigDecimal penalty = contracts.penalty(value, rate);
        BigDecimal profit = value.subtract(contract.getPurchaseValue());
        BigDecimal fee = saleCommission(profit);
        BigDecimal credit = value.subtract(penalty).subtract(fee);

        return createTransaction(player, club, TransactionType.SALE, value, fee, penalty, profit, credit, now);
    }

    private void applySale(Player player, Club club, Contract contract, Transaction transaction,
            LocalDateTime now) {
 
        contracts.close(contract, transaction.getPenalty(), now);
 
        club.setCash(club.getCash().add(transaction.getCashChange()));
 
        lineups.deleteByPlayerId(player.getId());
 
        player.setClub(null);
    }

    private MarketResponseDTO saleResponse(Transaction transaction, Club club, Contract contract,
            int days, int rate) {
        MarketResponseDTO response = operationResponse(transaction, club);
        response.setPurchaseValue(contract.getPurchaseValue());
        response.setRemainingDays(days);
        response.setPenaltyRate(rate);
        response.setContractStatus(contract.getStatus().getCode());
        return response;
    }

    public BigDecimal purchaseFee(BigDecimal value) {
        if (value.compareTo(PURCHASE_FEE_THRESHOLD) <= 0) {
            return ZERO_MONEY;
        }

        return MoneyUtils.round(value.multiply(PURCHASE_FEE_RATE));
    }

    public BigDecimal saleCommission(BigDecimal profit) {
        if (profit.signum() <= 0) {
            return ZERO_MONEY;
        }

        BigDecimal firstBracket = profit.min(COMMISSION_FIRST_BRACKET).multiply(COMMISSION_FIRST_RATE);
        BigDecimal secondBracket = profit.subtract(COMMISSION_FIRST_BRACKET)
                .max(BigDecimal.ZERO).multiply(COMMISSION_SECOND_RATE);

        return MoneyUtils.round(firstBracket.add(secondBracket));
    }

    private Transaction record(Player player, Club club, TransactionType type, BigDecimal value, BigDecimal fee,
            BigDecimal penalty, BigDecimal profit, BigDecimal cashChange, LocalDateTime now) {
        Transaction transaction = createTransaction(player, club, type, value, fee, penalty, profit, cashChange, now);

        return repository.saveAndFlush(transaction);
    }

    private Transaction createTransaction(Player player, Club club, TransactionType type,
            BigDecimal value, BigDecimal fee, BigDecimal penalty, BigDecimal profit,
            BigDecimal cashChange, LocalDateTime now) {
        Transaction transaction = new Transaction();
        transaction.setPlayer(player);
        transaction.setClub(club);
        transaction.setPlayerName(player.getName());
        transaction.setType(type);
        transaction.setValue(value);
        transaction.setFee(fee);
        transaction.setPenalty(penalty);
        transaction.setProfit(profit);
        transaction.setCashChange(cashChange);
        transaction.setCreatedAt(now.withNano(0));
        return transaction;
    }

    @Transactional(readOnly = true)
    public TransactionHistoryDTO history(Integer clubId, List<TransactionType> types, Integer playerId) {
        List<TransactionResponseDTO> rows = filtered(clubId, types, playerId).stream().map(this::toResponse).toList();

        TransactionHistoryDTO response = new TransactionHistoryDTO();
        response.setData(rows);
        response.setSummary(calculateSummary(rows));

        return response;
    }

    private TransactionSummaryDTO calculateSummary(List<TransactionResponseDTO> rows) {
        TransactionSummaryDTO summary = emptySummary();

        for (TransactionResponseDTO row : rows) {
            addToSummary(summary, row);
        }

        roundSummary(summary);
        return summary;
    }

    private TransactionSummaryDTO emptySummary() {
        TransactionSummaryDTO summary = new TransactionSummaryDTO();
        summary.setTotalSpent(ZERO_MONEY);
        summary.setTotalReceived(ZERO_MONEY);
        summary.setTotalFees(ZERO_MONEY);
        summary.setTotalPenalties(ZERO_MONEY);
        summary.setTotalProfit(ZERO_MONEY);
        return summary;
    }

    private void addToSummary(TransactionSummaryDTO summary, TransactionResponseDTO row) {
        summary.setTotalFees(summary.getTotalFees().add(row.getFee()));

        if (TransactionType.PURCHASE.getCode().equals(row.getType())) {
            summary.setTotalSpent(summary.getTotalSpent().add(row.getValue()).add(row.getFee()));
        } else {
            summary.setTotalReceived(summary.getTotalReceived().add(row.getCashChange()));
            summary.setTotalPenalties(summary.getTotalPenalties().add(row.getPenalty()));
            summary.setTotalProfit(summary.getTotalProfit().add(row.getProfit()));
        }
    }

    private void roundSummary(TransactionSummaryDTO summary) {
        summary.setTotalSpent(MoneyUtils.round(summary.getTotalSpent()));
        summary.setTotalReceived(MoneyUtils.round(summary.getTotalReceived()));
        summary.setTotalFees(MoneyUtils.round(summary.getTotalFees()));
        summary.setTotalPenalties(MoneyUtils.round(summary.getTotalPenalties()));
        summary.setTotalProfit(MoneyUtils.round(summary.getTotalProfit()));
    }

    private List<Transaction> filtered(Integer clubId, List<TransactionType> types, Integer playerId) {
        validateHistoryResources(clubId, playerId);
        Specification<Transaction> filter = transactionFilter(clubId, types, playerId);
        Sort order = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));

        return repository.findAll(filter, order);
    }

    private void validateHistoryResources(Integer clubId, Integer playerId) {
        if (!clubs.existsClubById(clubId)) {
            throw new ResourceNotFoundException("Clube não encontrado.");
        }

        if (playerId != null) {
            players.getPlayerById(playerId);
        }
    }

    private Specification<Transaction> transactionFilter(Integer clubId, List<TransactionType> types,
            Integer playerId) {
        return (root, query, builder) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(builder.equal(root.get("club").get("id"), clubId));

            if (types != null) {
                predicates.add(root.get("type").in(types));
            }

            if (playerId != null) {
                predicates.add(builder.equal(root.get("player").get("id"), playerId));
            }

            return builder.and(predicates.toArray(Predicate[]::new));
        };
    }

    @Transactional(readOnly = true)
    public String export(Integer clubId, List<TransactionType> types, Integer playerId) {
        StringBuilder csv = new StringBuilder(CSV_HEADER);

        for (Transaction transaction : filtered(clubId, types, playerId)) {
            csv.append(csvRow(transaction));
        }

        return csv.toString();
    }

    private String csvRow(Transaction transaction) {
        return String.join(";",
                DateTimeUtils.format(transaction.getCreatedAt()),
                transaction.getType().getCode(),

                escape(transaction.getPlayerName()),

                money(transaction.getValue()),
                money(transaction.getFee()),
                money(transaction.getPenalty()),
                money(transaction.getProfit()),
                money(transaction.getCashChange())) + "\n";
    }

    private String escape(String name) {
        if (name.contains(";") || name.contains("\"")) {
            return "\"" + name.replace("\"", "\"\"") + "\"";
        }

        return name;
    }

    private String money(BigDecimal value) {
        if (value == null) {
            return "";
        }

        return MoneyUtils.round(value).toPlainString().replace('.', ',');
    }

    private MarketResponseDTO operationResponse(Transaction transaction, Club club) {
        MarketResponseDTO response = new MarketResponseDTO();

        fillResponse(transaction, response);

        response.setClubCash(club.getCash());

        return response;
    }

    private TransactionResponseDTO toResponse(Transaction transaction) {
        TransactionResponseDTO response = new TransactionResponseDTO();

        fillResponse(transaction, response);

        return response;
    }

    private void fillResponse(Transaction transaction, TransactionResponseDTO response) {
        response.setId(transaction.getId());
        response.setClubId(transaction.getClub().getId());
        response.setPlayerId(transaction.getPlayer().getId());
        response.setPlayerName(transaction.getPlayerName());
        response.setType(transaction.getType().getCode());
        response.setValue(transaction.getValue());
        response.setFee(transaction.getFee());
        response.setPenalty(transaction.getPenalty());
        response.setProfit(transaction.getProfit());
        response.setCashChange(transaction.getCashChange());
        response.setCreatedAt(DateTimeUtils.format(transaction.getCreatedAt()));
    }
}
