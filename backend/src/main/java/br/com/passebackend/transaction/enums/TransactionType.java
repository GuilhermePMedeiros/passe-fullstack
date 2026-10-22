package br.com.passebackend.transaction.enums;

public enum TransactionType {
    PURCHASE("COMPRA"),
    SALE("VENDA");

    private final String code;

    TransactionType(String code) { this.code = code; }

    public String getCode() { return code; }

    public static TransactionType fromCode(String code) {
        for (TransactionType value : values()) {
            if (value.code.equals(code)) return value;
        }
        throw new IllegalArgumentException("Invalid TransactionType: " + code);
    }
}
