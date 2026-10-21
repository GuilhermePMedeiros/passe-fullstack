package br.com.passebackend;

import java.sql.SQLException;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import br.com.passebackend.club.ClubService;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ControllerErrorRuntimeTests {

    @Autowired
    private TestRestTemplate client;

    @MockitoBean
    private ClubService service;

    @Test
    void unexpectedIntegrityFailureReturns500WithoutTrace() {
        when(service.createClub(any())).thenThrow(new DataIntegrityViolationException(
                "Falha inesperada de integridade.", new SQLException("test failure", "23000", 1048)));
        assertUnexpectedFailure();
    }

    @Test
    void unexpectedServiceFailureReturns500WithoutTrace() {
        when(service.createClub(any())).thenThrow(new IllegalStateException("Falha inesperada."));
        assertUnexpectedFailure();
    }

    private void assertUnexpectedFailure() {
        var response = client.postForEntity("/api/v1/clubs",
                Map.of("name", "Águias FC", "acronym", "AGU"), Map.class);
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().get("message")).isInstanceOf(String.class);
        assertThat((String) response.getBody().get("message")).isNotBlank();
        assertThat(response.getBody()).doesNotContainKeys("trace", "exception");
    }
}
