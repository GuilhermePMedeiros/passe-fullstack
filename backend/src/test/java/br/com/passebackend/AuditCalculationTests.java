package br.com.passebackend;

import java.math.BigDecimal;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import static org.assertj.core.api.Assertions.assertThat;

/** Expected values: enunciado RN02-RN06 and ficha B05/B06. No database. */
class AuditCalculationTests {
    private final PlayerService service = new PlayerService();

    @ParameterizedTest
    @CsvSource({
        "82,APTO,20,25,82", "82,APTO,50,19,90.20",
        "82,MAL_CONDICIONADO,50,25,69.70", "82,MAL_CONDICIONADO,80,21,84.05",
        "82,MAL_CONDICIONADO,30,33,53.30", "82,DOENTE,90,25,69.70",
        "82,DOENTE,30,25,49.20", "82,DOENTE,10,40,49.20",
        "9.50,MAL_CONDICIONADO,85,25,8.79", "1,MAL_CONDICIONADO,50,35,1",
        "114,APTO,60,20,125.40", "88,MAL_CONDICIONADO,85,27,81.40",
        "46,DOENTE,20,34,27.60", "1.50,DOENTE,50,36,1",
        "9.50,MAL_CONDICIONADO,25,22,7.13",
        "100,MAL_CONDICIONADO,31,22,85", "100,MAL_CONDICIONADO,79,31,85",
        "100,MAL_CONDICIONADO,80,32,82.50", "100,APTO,1,21,110",
        "100,APTO,100,22,100", "100,APTO,85,45,90"
    })
    void marketValue(String base, String condition, int agility, int age, String expected) {
        Player p = new Player();
        p.setBaseValue(new BigDecimal(base));
        p.setCondition(PlayerCondition.fromCode(condition));
        p.setAgility(agility);
        p.setAge(age);
        assertThat(service.calculateMarketValue(p)).isEqualByComparingTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        "MEI,68,65,80,78,52,60,73", "ATA,78,75,73,82,48,68,76",
        "LAT,72,70,78,76,70,66,72", "ZAG,50,90,60,40,80,75,73",
        "GOL,55,30,65,40,72,68,68", "ZAG,60,30,55,40,81,77,74",
        "ATA,80,77,60,74,30,70,75", "LAT,60,40,60,60,62,60,61"
    })
    void overall(String position, int pace, int shooting, int passing, int dribbling,
            int defending, int physical, int expected) {
        Player p = new Player(1, "Meia Lua", PlayerPosition.fromCode(position), 50, 25,
                BigDecimal.ONE, PlayerCondition.FIT, null, pace, shooting, passing,
                dribbling, defending, physical, 99);
        assertThat(service.calculateOverall(p)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({
        "75,86,25,40", "60,70,30,10", "61,70,30,12", "76,80,22,46",
        "85,92,27,100", "70,84,21,34.20", "70,84,22,30",
        "45,90,18,3.63", "40,66,36,1", "41,50,22,1",
        "85,99,20,114", "83,88,27,88", "43,55,36,1.50", "99,99,22,184"
    })
    void baseValue(int overall, int potential, int age, String expected) {
        assertThat(service.calculateBaseValue(overall, age, potential)).isEqualByComparingTo(expected);
    }
}
