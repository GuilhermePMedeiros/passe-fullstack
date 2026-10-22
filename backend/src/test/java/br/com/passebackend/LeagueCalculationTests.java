package br.com.passebackend;

import static org.assertj.core.api.Assertions.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.match.MatchDuelService;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

class LeagueCalculationTests {
    private final MatchDuelService duels = new MatchDuelService();

    @ParameterizedTest
    @CsvSource({"74,63", "50,43", "1,1", "99,84", "70,60", "80,68"})
    void unfitAttributesRoundHalfUpWithoutChangingOriginal(int original, int expected) {
        assertThat(duels.effectiveAttribute(original, PlayerCondition.UNFIT)).isEqualTo(expected);
        assertThat(duels.effectiveAttribute(original, PlayerCondition.FIT)).isEqualTo(original);
        assertThatThrownBy(() -> duels.effectiveAttribute(original, PlayerCondition.SICK)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @CsvSource({"ATA,shooting", "MEI,passing", "ZAG,dribbling", "LAT,dribbling"})
    void attackUsesOnlyOfficialPositionAttribute(String position, String attribute) {
        assertThat(duels.attackAttribute(PlayerPosition.fromCode(position)).getCode()).isEqualTo(attribute);
    }

    @ParameterizedTest
    @CsvSource({"3-1,3,0,1", "2-2,2,0,2", "2-1-1,2,1,1", "1-2-1,1,2,1"})
    void formationCountsOnlyTheFourOutfieldPlayers(String code, int defenders, int midfielders, int strikers) {
        Formation formation = Formation.fromCode(code);
        assertThat(formation.getDefenders()).isEqualTo(defenders);
        assertThat(formation.getMidfielders()).isEqualTo(midfielders);
        assertThat(formation.getStrikers()).isEqualTo(strikers);
    }
}
