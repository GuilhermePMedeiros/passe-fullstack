package br.com.passebackend.player.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PlayerCondition {

    FIT("APTO"),
    UNFIT("MAL_CONDICIONADO"),
    SICK("DOENTE");

    private final String code;

    PlayerCondition(String code) {
        this.code = code;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static PlayerCondition fromCode(String code) {
        for (PlayerCondition condition : values()) {
            if (condition.code.equals(code)) {
                return condition;
            }
        }
        throw new IllegalArgumentException("Condição inválida.");
    }
}
