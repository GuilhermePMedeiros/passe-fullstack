package br.com.passebackend.nucleo.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class MoneyUtils {

    public static final BigDecimal MIN_VALUE =
            new BigDecimal("1.00");

    private MoneyUtils() {
    }

    public static BigDecimal round(BigDecimal value) {

        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal minimum(
            BigDecimal value, BigDecimal minimum) {

        if (value.compareTo(minimum) < 0) {
            return minimum;
        }

        return value;
    }

    public static BigDecimal parseMoney(String value) {

        if (value == null || !value.matches("(?:0|[1-9][0-9]*)(?:\\.[0-9]{1,2})?")) {
            throw new IllegalArgumentException("Valor monetário inválido.");
        }

        return new BigDecimal(value);
    }

}
