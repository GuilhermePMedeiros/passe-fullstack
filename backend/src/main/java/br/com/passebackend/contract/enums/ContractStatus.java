package br.com.passebackend.contract.enums;

public enum ContractStatus {
    ACTIVE("ATIVO"),
    CLOSED("ENCERRADO"),
    TERMINATED("RESCINDIDO");

    private final String code;

    ContractStatus(String code) { this.code = code; }

    public String getCode() { return code; }

    public static ContractStatus fromCode(String code) {
        for (ContractStatus value : values()) {
            if (value.code.equals(code)) return value;
        }
        throw new IllegalArgumentException("Invalid ContractStatus: " + code);
    }
}
