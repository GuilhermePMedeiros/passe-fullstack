package br.com.passebackend.player.converter;

import br.com.passebackend.player.enums.PlayerCondition;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class PlayerConditionConverter
        implements AttributeConverter<PlayerCondition, String> {

    @Override
    public String convertToDatabaseColumn(PlayerCondition condition) {
        return condition == null ? null : condition.getCode();
    }

    @Override
    public PlayerCondition convertToEntityAttribute(String code) {
        return code == null ? null : PlayerCondition.fromCode(code);
    }
}