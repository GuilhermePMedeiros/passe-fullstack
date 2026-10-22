package br.com.passebackend.match.converter;

import br.com.passebackend.match.enums.DuelAttribute;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class DuelAttributeConverter implements AttributeConverter<DuelAttribute, String> {
    @Override
    public String convertToDatabaseColumn(DuelAttribute value) {
        return value == null ? null : value.getCode();
    }

    @Override
    public DuelAttribute convertToEntityAttribute(String code) {
        return code == null ? null : DuelAttribute.fromCode(code);
    }
}
