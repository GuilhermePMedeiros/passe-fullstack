package br.com.passebackend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.passebackend.player.converter.PlayerConditionConverter;
import br.com.passebackend.player.converter.PlayerPositionConverter;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

import static org.assertj.core.api.Assertions.*;

class PlayerEnumConverterTests {

    private final ObjectMapper mapper = new ObjectMapper();
    private final PlayerConditionConverter conditions = new PlayerConditionConverter();
    private final PlayerPositionConverter positions = new PlayerPositionConverter();

    @ParameterizedTest
    @CsvSource({"APTO,FIT", "MAL_CONDICIONADO,UNFIT", "DOENTE,SICK"})
    void conditionKeepsOfficialCodeInJsonAndDatabase(String code, PlayerCondition expected) throws Exception {
        assertThat(PlayerCondition.fromCode(code)).isEqualTo(expected);
        assertThat(mapper.readValue("\"" + code + "\"", PlayerCondition.class)).isEqualTo(expected);
        assertThat(mapper.writeValueAsString(expected)).isEqualTo("\"" + code + "\"");
        assertThat(conditions.convertToDatabaseColumn(expected)).isEqualTo(code);
        assertThat(conditions.convertToEntityAttribute(code)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"GOL,GOALKEEPER", "ZAG,CENTER_BACK", "LAT,FULL_BACK", "MEI,MIDFIELDER", "ATA,STRIKER"})
    void positionKeepsOfficialCodeInJsonAndDatabase(String code, PlayerPosition expected) throws Exception {
        assertThat(PlayerPosition.fromCode(code)).isEqualTo(expected);
        assertThat(mapper.readValue("\"" + code + "\"", PlayerPosition.class)).isEqualTo(expected);
        assertThat(mapper.writeValueAsString(expected)).isEqualTo("\"" + code + "\"");
        assertThat(positions.convertToDatabaseColumn(expected)).isEqualTo(code);
        assertThat(positions.convertToEntityAttribute(code)).isEqualTo(expected);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"apto", "FIT", "APTO "})
    void invalidConditionCodeIsNotCoerced(String code) {
        assertThatThrownBy(() -> PlayerCondition.fromCode(code)).isInstanceOf(IllegalArgumentException.class);
        if (code != null) {
            assertThatThrownBy(() -> conditions.convertToEntityAttribute(code)).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> mapper.readValue(mapper.writeValueAsString(code), PlayerCondition.class))
                    .isInstanceOf(JsonProcessingException.class);
        }
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"mei", "MIDFIELDER", "MEI "})
    void invalidPositionCodeIsNotCoerced(String code) {
        assertThatThrownBy(() -> PlayerPosition.fromCode(code)).isInstanceOf(IllegalArgumentException.class);
        if (code != null) {
            assertThatThrownBy(() -> positions.convertToEntityAttribute(code)).isInstanceOf(IllegalArgumentException.class);
            assertThatThrownBy(() -> mapper.readValue(mapper.writeValueAsString(code), PlayerPosition.class))
                    .isInstanceOf(JsonProcessingException.class);
        }
    }

    @Test
    void jpaConvertersKeepNullHandling() {
        assertThat(conditions.convertToDatabaseColumn(null)).isNull();
        assertThat(conditions.convertToEntityAttribute(null)).isNull();
        assertThat(positions.convertToDatabaseColumn(null)).isNull();
        assertThat(positions.convertToEntityAttribute(null)).isNull();
    }
}
