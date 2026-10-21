package br.com.passebackend.nucleo.util;

import com.fasterxml.jackson.databind.JsonNode;

public final class StringUtils {
	
	public static boolean isBlank(String str) {
		return str == null || str.isEmpty() || str.isBlank();
	}
	
    public static String normalizeName(String name) {
        if (name == null) {
            return null;
        }

        return normalizeSpaces(name, "Nome contém caracteres de controle.");
    }

    private static String normalizeSpaces(String value, String controlMessage) {

        if (value.codePoints().anyMatch(Character::isISOControl)) {
            throw new IllegalArgumentException(controlMessage);
        }

        return value.trim().replaceAll(" +", " ");
    }

    public static String normalizeSearch(String value) {

        String search = normalizeSpaces(value, "Busca contém caractere de controle.");

        if (search.isEmpty()) {
            throw new IllegalArgumentException("Busca obrigatória.");
        }

        return search;
    }

    public static Boolean parseBoolean(String value) {

        if ("true".equals(value)) {
            return true;
        }

        if ("false".equals(value)) {
            return false;
        }

        throw new IllegalArgumentException("Parâmetro booleano inválido.");

    }

    public static String requiredText(JsonNode json, String field) {

        JsonNode value = json.get(field);

        if (value == null || !value.isTextual()) {
            throw new IllegalArgumentException("Campo inválido: " + field);
        }

        return value.textValue();
    }

}
