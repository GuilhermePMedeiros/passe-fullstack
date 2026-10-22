package br.com.passebackend;

import static org.assertj.core.api.Assertions.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;
import br.com.passebackend.contract.ContractService;
import br.com.passebackend.market.MarketService;
import br.com.passebackend.nucleo.util.DateTimeUtils;

class MarketCalculationTests {
    private final MarketService market = new MarketService();
    private final ContractService contracts = new ContractService();
    private final LocalDateTime now = LocalDateTime.of(2026, 11, 5, 16, 40);

    @ParameterizedTest
    @CsvSource({"28,0", "30,0", "30.01,1.50", "47.62,2.38", "48,2.40", "105.32,5.27"})
    void officialPurchaseFees(String value, String expected) {
        assertThat(market.purchaseFee(new BigDecimal(value))).isEqualByComparingTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"-7.50,0", "0,0", "3,0.30", "3.85,0.39", "10,1", "10.01,1", "15,2"})
    void officialProgressiveCommission(String profit, String expected) {
        assertThat(market.saleCommission(new BigDecimal(profit))).isEqualByComparingTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"-1,0,0", "0,0,0", "1,1,5", "864000000000000,10,5",
            "871200000000000,11,5", "2592000000000000,30,5", "2592060000000000,31,10",
            "15552000000000000,180,10", "15552060000000000,181,20", "17280000000000000,200,20"})
    void exactNanosecondBoundariesForRemainingDays(long nanos, int days, int rate) {
        assertThat(contracts.remainingDays(now.plusNanos(nanos), now)).isEqualTo(days);
        assertThat(contracts.penaltyRate(days)).isEqualTo(rate);
    }

    @ParameterizedTest
    @CsvSource({"40,10,4", "42.50,20,8.50", "30,5,1.50", "25,0,0", "75,20,10", "7.70,5,0.39"})
    void officialPenaltyAndCeiling(String value, int rate, String expected) {
        assertThat(contracts.penalty(new BigDecimal(value), rate)).isEqualByComparingTo(expected);
    }

    @Test
    void loyaltyUsesExactInstantAndInclusive1095Days() {
        assertThatCode(() -> contracts.validateLoyalty(now.plusDays(1095), now)).doesNotThrowAnyException();
        assertThatCode(() -> contracts.validateLoyalty(now.plusNanos(1), now)).doesNotThrowAnyException();
        assertThatThrownBy(() -> contracts.validateLoyalty(now.plusDays(1095).plusNanos(1), now)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> contracts.validateLoyalty(now, now)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> contracts.validateLoyalty(now.minusNanos(1), now)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"2027-02-30T10:15-03:00", "2027-03-02T24:00-03:00", "2027-03-02T10:15",
            "2027-03-02T10:15:00-03:00", "2027-03-02T10:15Z", "2027-03-02T10:15-02:00",
            " 2027-03-02T10:15-03:00", "2027-3-02T10:15-03:00", "2027-03-02T10:60-03:00"})
    void rejectsNonOfficialOrImpossibleDates(String text) {
        assertThatThrownBy(() -> DateTimeUtils.parseLoyalty(text)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void parsesStrictMinutesAndFormatsSecondsWithBrasiliaOffset() {
        assertThat(DateTimeUtils.format(DateTimeUtils.parseLoyalty("2027-03-02T10:15-03:00")))
                .isEqualTo("2027-03-02T10:15:00-03:00");
    }
}
