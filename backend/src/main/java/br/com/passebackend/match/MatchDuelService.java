package br.com.passebackend.match;

import java.util.ArrayList;
import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import br.com.passebackend.club.Club;
import br.com.passebackend.match.dto.DuelPlayerDTO;
import br.com.passebackend.match.dto.MatchDuelDTO;
import br.com.passebackend.match.enums.DuelAttribute;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

@Service
public class MatchDuelService {
    private static final int ATTACKS_PER_CLUB = 3;
    private static final int UNFIT_ATTRIBUTE_PERCENT = 85;
    private static final int PERCENT_DENOMINATOR = 100;

    @Autowired
    private MatchDuelRepository repository;

    public List<MatchDuel> createDuels(Club home, List<Player> homePlayers, Club away, List<Player> awayPlayers) {
        List<MatchDuel> duels = new ArrayList<>();
        addAttacks(duels, home, homePlayers, awayPlayers);
        addAttacks(duels, away, awayPlayers, homePlayers);
        return duels;
    }

    private void addAttacks(List<MatchDuel> duels, Club attackingClub, List<Player> attackers, List<Player> defenders) {
        for (int index = 0; index < ATTACKS_PER_CLUB; index++) {
            Player attacker = attackers.get(4 - index);
            Player defender = defenders.get(index);
            duels.add(createDuel(duels.size() + 1, attackingClub, attacker, defender));
        }
    }

    private MatchDuel createDuel(int order, Club club, Player attacker, Player defender) {
        MatchDuel duel = new MatchDuel();
        duel.setOrder(order);
        duel.setAttackingClub(club);
        copyAttacker(duel, attacker);
        copyDefender(duel, defender);
        duel.setGoal(duel.getAttackValue() > duel.getDefenseValue());
        return duel;
    }

    private void copyAttacker(MatchDuel duel, Player player) {
        DuelAttribute attribute = attackAttribute(player.getPosition());
        duel.setAttacker(player);
        duel.setAttackerName(player.getName());
        duel.setAttackerPosition(player.getPosition());
        duel.setAttackerCondition(player.getCondition());
        duel.setAttackAttribute(attribute);
        duel.setAttackValue(effectiveAttribute(attackValue(player, attribute), player.getCondition()));
    }

    private void copyDefender(MatchDuel duel, Player player) {
        duel.setDefender(player);
        duel.setDefenderName(player.getName());
        duel.setDefenderPosition(player.getPosition());
        duel.setDefenderCondition(player.getCondition());
        duel.setDefenseAttribute(DuelAttribute.DEFENDING);
        duel.setDefenseValue(effectiveAttribute(player.getDefending(), player.getCondition()));
    }

    public DuelAttribute attackAttribute(PlayerPosition position) {
        return switch (position) {
            case STRIKER -> DuelAttribute.SHOOTING;
            case MIDFIELDER -> DuelAttribute.PASSING;
            case CENTER_BACK, FULL_BACK -> DuelAttribute.DRIBBLING;
            case GOALKEEPER -> throw new IllegalArgumentException("Goleiro não inicia ataque.");
        };
    }

    private int attackValue(Player player, DuelAttribute attribute) {
        return switch (attribute) {
            case SHOOTING -> player.getShooting();
            case PASSING -> player.getPassing();
            case DRIBBLING -> player.getDribbling();
            case DEFENDING -> player.getDefending();
        };
    }

    public int effectiveAttribute(int value, PlayerCondition condition) {
        if (condition == PlayerCondition.FIT) {
            return value;
        }
        if (condition != PlayerCondition.UNFIT) {
            throw new IllegalArgumentException("Jogador inelegível para duelo.");
        }
        return (value * UNFIT_ATTRIBUTE_PERCENT + PERCENT_DENOMINATOR / 2) / PERCENT_DENOMINATOR;
    }

    @Transactional
    public void saveForMatch(Match match, List<MatchDuel> duels) {
        for (MatchDuel duel : duels) {
            duel.setMatch(match);
        }
        repository.saveAllAndFlush(duels);
    }

    @Transactional(readOnly = true)
    public List<MatchDuelDTO> getByMatchId(Integer matchId) {
        return repository.findByMatchIdOrderByOrderAsc(matchId).stream().map(this::toResponse).toList();
    }

    public MatchDuelDTO toResponse(MatchDuel duel) {
        MatchDuelDTO response = new MatchDuelDTO();
        response.setOrder(duel.getOrder());
        response.setAttackingClubId(duel.getAttackingClub().getId());
        response.setAttacker(attackerResponse(duel));
        response.setDefender(defenderResponse(duel));
        response.setGoal(duel.getGoal());
        return response;
    }

    private DuelPlayerDTO attackerResponse(MatchDuel duel) {
        DuelPlayerDTO response = new DuelPlayerDTO();
        response.setPlayerId(duel.getAttacker().getId());
        response.setPlayerName(duel.getAttackerName());
        response.setPosition(duel.getAttackerPosition().getCode());
        response.setCondition(duel.getAttackerCondition().getCode());
        response.setAttribute(duel.getAttackAttribute().getCode());
        response.setValue(duel.getAttackValue());
        return response;
    }

    private DuelPlayerDTO defenderResponse(MatchDuel duel) {
        DuelPlayerDTO response = new DuelPlayerDTO();
        response.setPlayerId(duel.getDefender().getId());
        response.setPlayerName(duel.getDefenderName());
        response.setPosition(duel.getDefenderPosition().getCode());
        response.setCondition(duel.getDefenderCondition().getCode());
        response.setAttribute(duel.getDefenseAttribute().getCode());
        response.setValue(duel.getDefenseValue());
        return response;
    }
}
