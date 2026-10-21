package br.com.passebackend.player.converter;

import br.com.passebackend.player.enums.PlayerPosition;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;

@Converter
public class PlayerPositionConverter
        implements AttributeConverter<PlayerPosition, String> {

    @Override
    public String convertToDatabaseColumn(PlayerPosition position) {
        return position == null ? null : position.getCode();
    }

    @Override
    public PlayerPosition convertToEntityAttribute(String code) {
        return code == null ? null : PlayerPosition.fromCode(code);
    }
}