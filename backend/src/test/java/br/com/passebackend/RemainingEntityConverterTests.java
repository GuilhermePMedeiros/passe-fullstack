package br.com.passebackend;

import static org.assertj.core.api.Assertions.*;

import java.util.stream.Stream;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;

import br.com.passebackend.contract.converter.ContractStatusConverter;
import br.com.passebackend.lineup.converter.FormationConverter;
import br.com.passebackend.match.converter.DuelAttributeConverter;
import br.com.passebackend.transaction.converter.TransactionTypeConverter;
import jakarta.persistence.AttributeConverter;

class RemainingEntityConverterTests {
    static Stream<Object[]> converters() {
        return Stream.of(
                new Object[] {new ContractStatusConverter(), new String[] {"ATIVO", "ENCERRADO", "RESCINDIDO"}},
                new Object[] {new TransactionTypeConverter(), new String[] {"COMPRA", "VENDA"}},
                new Object[] {new FormationConverter(), new String[] {"3-1", "2-2", "2-1-1", "1-2-1"}},
                new Object[] {new DuelAttributeConverter(), new String[] {"shooting", "passing", "dribbling", "defending"}});
    }

    @ParameterizedTest
    @MethodSource("converters")
    <T> void officialCodesRoundTripAndInvalidCodesAreRejected(AttributeConverter<T, String> converter, String[] codes) {
        for (String code : codes) {
            assertThat(converter.convertToDatabaseColumn(converter.convertToEntityAttribute(code))).isEqualTo(code);
        }
        assertThat(converter.convertToDatabaseColumn(null)).isNull();
        assertThat(converter.convertToEntityAttribute(null)).isNull();
        assertThatThrownBy(() -> converter.convertToEntityAttribute("invalid")).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> converter.convertToEntityAttribute(" ")).isInstanceOf(IllegalArgumentException.class);
    }
}
