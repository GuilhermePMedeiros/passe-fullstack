package br.com.passebackend.nucleo.util;

import com.fasterxml.jackson.databind.JsonNode;

public final class NumberUtils {
	
    public static boolean isBetween(
            Integer value, int minimum, int maximum) {

        if (value == null) {
            return false;
        }

        if (value < minimum || value > maximum) {
            return false;
        }

        return true;
    }

    public static int roundHalfUp(
            int numerator, int denominator) {

        if (numerator < 0 || denominator <= 0) {
            throw new IllegalArgumentException(
                "Valores inválidos para arredondamento.");
        }

        double result = (double) numerator / denominator;

        return (int) Math.floor(result + 0.5);
    }

    public static Integer requiredInteger(JsonNode json, String field) {
        JsonNode value = json.get(field);

        if (value == null || !value.isNumber() || !value.isIntegralNumber()
                && value.decimalValue().stripTrailingZeros().scale() > 0) {

            throw new IllegalArgumentException("Campo inválido: " + field);
        }

        try {
            return value.decimalValue().intValueExact();
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("Campo inválido: " + field);
        }

    }

    public static Integer parsePositiveInteger(String value) {
        if (value == null || !value.matches("[1-9][0-9]*")) {
            throw new IllegalArgumentException("Número inteiro inválido.");
        }

        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException exception) {
            throw new IllegalArgumentException("Número inteiro inválido.");
        }
    }
}
