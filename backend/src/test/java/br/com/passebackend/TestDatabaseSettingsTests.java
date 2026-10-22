package br.com.passebackend;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.*;

class TestDatabaseSettingsTests {
    @ParameterizedTest
    @ValueSource(strings = {"jdbc:mysql://localhost:13308/passedb_test", "jdbc:mysql://tests-db:3306/passedb_test"})
    void acceptsOnlyTestSchema(String url) {
        assertThat(TestDatabaseSettings.url(url)).isEqualTo(url);
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"jdbc:mysql://localhost:3307/passedb", "jdbc:mysql://db:3306/passedb",
            "jdbc:mysql://db:3306/passedb_test_other", "jdbc:mysql://db:3306/passedb_test;other"})
    void refusesApplicationOrAmbiguousSchema(String url) {
        assertThatIllegalArgumentException().isThrownBy(() -> TestDatabaseSettings.url(url));
    }
}
