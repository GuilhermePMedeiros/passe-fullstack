package br.com.passebackend;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.passebackend.club.converter.ClubRequestConverter;
import br.com.passebackend.nucleo.util.MoneyUtils;
import br.com.passebackend.nucleo.util.NumberUtils;
import br.com.passebackend.nucleo.util.StringUtils;
import br.com.passebackend.player.converter.PlayerRequestConverter;
import br.com.passebackend.player.enums.PlayerPosition;

import static org.assertj.core.api.Assertions.*;

class RequestConversionTests {

    private final ObjectMapper mapper = new ObjectMapper();

    @ParameterizedTest
    @ValueSource(strings = {"50", "50.0", "5e1"})
    void acceptsExactJsonIntegers(String number) throws Exception {
        assertThat(NumberUtils.requiredInteger(mapper.readTree("{\"age\":" + number + "}"), "age"))
                .isEqualTo(50);
    }

    @ParameterizedTest
    @ValueSource(strings = {"\"50\"", "50.5", "true", "null", "[]", "{}", "2147483648"})
    void rejectsCoercionFractionsAndOverflow(String number) throws Exception {
        var json = mapper.readTree("{\"age\":" + number + "}");
        assertThatThrownBy(() -> NumberUtils.requiredInteger(json, "age"))
                .isInstanceOf(IllegalArgumentException.class).hasMessage("Campo inválido: age");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"0", "01", "-1", "+1", "1.0", "1e1", " 1", "2147483648"})
    void queryIntegersKeepStrictSyntax(String value) {
        assertThatThrownBy(() -> NumberUtils.parsePositiveInteger(value))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void queryIntegerAcceptsInclusiveMaximum() {
        assertThat(NumberUtils.parsePositiveInteger("2147483647")).isEqualTo(Integer.MAX_VALUE);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"01", "-1", "+1", "1e1", "1,00", ".5", "1.", "1.001", " 1"})
    void moneyFiltersKeepStrictSyntax(String value) {
        assertThatThrownBy(() -> MoneyUtils.parseMoney(value)).isInstanceOf(IllegalArgumentException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "0.5", "10.55", "550.00"})
    void moneyFiltersPreserveExactValue(String value) {
        assertThat(MoneyUtils.parseMoney(value)).isEqualByComparingTo(value);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"TRUE", "False", "1", " true"})
    void booleansAreNotCoerced(String value) {
        assertThatThrownBy(() -> StringUtils.parseBoolean(value)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void booleanLiteralsAreAccepted() {
        assertThat(StringUtils.parseBoolean("true")).isTrue();
        assertThat(StringUtils.parseBoolean("false")).isFalse();
    }

    @Test
    void textNormalizationPreservesMarksAndAccents() {
        assertThat(StringUtils.normalizeSearch("  João   का  ")).isEqualTo("João का");
        assertThat(StringUtils.normalizeName("  João   Silva  ")).isEqualTo("João Silva");
        assertThat(StringUtils.normalizeName(null)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "   ", "João\tSilva", "João\nSilva", "João\u007fSilva"})
    void searchRejectsBlankAndControls(String value) {
        assertThatThrownBy(() -> StringUtils.normalizeSearch(value)).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void playerPutIgnoresIndicatorsAndControlledFields() throws Exception {
        var json = mapper.readTree("""
                {"name":"Meia Lua","position":"MEI","agility":50.0,"age":25,
                 "pace":"ignored","condition":{},"club_id":true,"base_value":[]}
                """);
        var request = PlayerRequestConverter.fromJson(json, false);
        assertThat(request.getPosition()).isEqualTo(PlayerPosition.MIDFIELDER);
        assertThat(request.getAgility()).isEqualTo(50);
        assertThat(request.getPace()).isNull();
        assertThat(request.getCondition()).isNull();
    }

    @Test
    void playerPostRequiresIndicators() throws Exception {
        var json = mapper.readTree("{\"name\":\"Meia Lua\",\"position\":\"MEI\",\"agility\":50,\"age\":25}");
        assertThatThrownBy(() -> PlayerRequestConverter.fromJson(json, true))
                .hasMessage("Campo inválido: pace");
    }

    @Test
    void clubConverterUsesOnlyItsRequestFields() throws Exception {
        var request = ClubRequestConverter.fromJson(mapper.readTree(
                "{\"name\":\"Águias FC\",\"acronym\":\"AGU\",\"cash\":{},\"players\":false}"));
        assertThat(request.getName()).isEqualTo("Águias FC");
        assertThat(request.getAcronym()).isEqualTo("AGU");
    }

    @ParameterizedTest
    @ValueSource(strings = {"{}", "{\"name\":null}", "{\"name\":42}", "{\"name\":true}"})
    void requiredTextsDoNotCoerceOtherTypes(String body) throws Exception {
        var json = mapper.readTree(body);
        assertThatThrownBy(() -> ClubRequestConverter.fromJson(json)).hasMessage("Campo inválido: name");
    }
}
