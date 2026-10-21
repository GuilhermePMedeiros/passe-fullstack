package br.com.passebackend.lineup.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Formation {
    THREE_ONE("3-1", 3, 0, 1),
    TWO_TWO("2-2", 2, 0, 2),
    TWO_ONE_ONE("2-1-1", 2, 1, 1),
    ONE_TWO_ONE("1-2-1", 1, 2, 1);

    private final String code;
    private final int defenders;
    private final int midfielders;
    private final int strikers;

    Formation(String code, int defenders, int midfielders, int strikers) {
        this.code = code;
        this.defenders = defenders;
        this.midfielders = midfielders;
        this.strikers = strikers;
    }

    public int getDefenders() { return defenders; }
    public int getMidfielders() { return midfielders; }
    public int getStrikers() { return strikers; }

    @JsonValue
    public String getCode() { return code; }

    @JsonCreator
    public static Formation fromCode(String code) {
        for (Formation value : values()) {
            if (value.code.equals(code)) return value;
        }
        throw new IllegalArgumentException("Invalid Formation: " + code);
    }
}
