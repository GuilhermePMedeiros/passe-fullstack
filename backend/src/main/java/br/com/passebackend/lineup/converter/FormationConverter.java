package br.com.passebackend.lineup.converter;

import br.com.passebackend.lineup.enums.Formation;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class FormationConverter implements AttributeConverter<Formation, String> {
    @Override
    public String convertToDatabaseColumn(Formation value) {
        return value == null ? null : value.getCode();
    }

    @Override
    public Formation convertToEntityAttribute(String code) {
        return code == null ? null : Formation.fromCode(code);
    }
}
