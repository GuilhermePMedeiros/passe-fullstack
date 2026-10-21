package br.com.passebackend.contract.converter;

import br.com.passebackend.contract.enums.ContractStatus;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class ContractStatusConverter implements AttributeConverter<ContractStatus, String> {
    @Override
    public String convertToDatabaseColumn(ContractStatus value) {
        return value == null ? null : value.getCode();
    }

    @Override
    public ContractStatus convertToEntityAttribute(String code) {
        return code == null ? null : ContractStatus.fromCode(code);
    }
}
