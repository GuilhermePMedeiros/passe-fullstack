package br.com.passebackend.lineup.enums;

public enum Formation {
    THREE_ONE("3-1"), TWO_TWO("2-2"), TWO_ONE_ONE("2-1-1"), ONE_TWO_ONE("1-2-1");
    private final String code;
    Formation(String code) { this.code = code; }
    public String getCode() { return code; }
    public static Formation fromCode(String code) {
        for (Formation value : values()) {
            if (value.code.equals(code)) return value;
        }
        throw new IllegalArgumentException("Invalid Formation: " + code);
    }
}
