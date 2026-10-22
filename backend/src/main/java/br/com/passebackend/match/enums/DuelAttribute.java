package br.com.passebackend.match.enums;

public enum DuelAttribute {
    SHOOTING("shooting"),
    PASSING("passing"),
    DRIBBLING("dribbling"),
    DEFENDING("defending");

    private final String code;

    DuelAttribute(String code) { this.code = code; }

    public String getCode() { return code; }

    public static DuelAttribute fromCode(String code) {
        for (DuelAttribute value : values()) {
            if (value.code.equals(code)) return value;
        }
        throw new IllegalArgumentException("Invalid DuelAttribute: " + code);
    }
}
