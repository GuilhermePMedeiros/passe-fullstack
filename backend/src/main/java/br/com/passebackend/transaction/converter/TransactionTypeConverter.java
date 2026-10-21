package br.com.passebackend.transaction.converter;

import br.com.passebackend.transaction.enums.TransactionType;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class TransactionTypeConverter implements AttributeConverter<TransactionType, String> {
    @Override
    public String convertToDatabaseColumn(TransactionType value) {
        return value == null ? null : value.getCode();
    }

    @Override
    public TransactionType convertToEntityAttribute(String code) {
        return code == null ? null : TransactionType.fromCode(code);
    }
}
