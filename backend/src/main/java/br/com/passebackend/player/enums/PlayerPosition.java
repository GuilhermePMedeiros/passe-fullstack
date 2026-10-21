package br.com.passebackend.player.enums;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonValue;

public enum PlayerPosition {
	
    GOALKEEPER("GOL", 0),
    CENTER_BACK("ZAG", 1),
    FULL_BACK("LAT", 2),
    MIDFIELDER("MEI", 3),
    STRIKER("ATA", 4);

    private final String code;
    private final int order;

    PlayerPosition(String code, int order) {
        this.code = code;
        this.order = order;
    }

    public int getOrder() {
        return order;
    }

    @JsonValue
    public String getCode() {
        return code;
    }

    @JsonCreator
    public static PlayerPosition fromCode(String code) {
        for (PlayerPosition position : values()) {
            if (position.code.equals(code)) {
                return position;
            }
        }
        throw new IllegalArgumentException("Posição inválida.");
    }
    
}
