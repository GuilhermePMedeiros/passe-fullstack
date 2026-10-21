package br.com.passebackend;

import java.sql.SQLException;
import java.util.Map;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import br.com.passebackend.club.ClubService;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ActiveProfiles("test")
@ExtendWith(OutputCaptureExtension.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ControllerErrorRuntimeTests {

    @Autowired
    private TestRestTemplate client;

    @MockitoBean
    private ClubService service;

    @Test
    void unexpectedIntegrityFailureReturns500WithoutTrace(CapturedOutput output) {
        when(service.createClub(any())).thenThrow(new DataIntegrityViolationException(
                "Falha inesperada de integridade.", new SQLException("test failure", "23000", 1048)));
        assertUnexpectedFailure(output);
    }

    @Test
    void unexpectedServiceFailureReturns500WithoutTrace(CapturedOutput output) {
        when(service.createClub(any())).thenThrow(new IllegalStateException("Falha inesperada."));
        assertUnexpectedFailure(output);
    }

    private void assertUnexpectedFailure(CapturedOutput output) {
        var response = client.postForEntity("/api/v1/clubs",
                Map.of("name", "Águias FC", "acronym", "AGU"), Map.class);
        assertThat(response.getStatusCode().value()).isEqualTo(500);
        assertThat(response.getBody().get("message")).isInstanceOf(String.class);
        assertThat((String) response.getBody().get("message")).isNotBlank();
        assertThat(response.getBody().get("message")).isEqualTo("Falha inesperada ao processar a requisição.");
        assertThat(response.getBody()).doesNotContainKeys("trace", "exception");
        assertThat(output.getOut().lines().filter(line -> line.contains("LogUtils")).toList())
                .singleElement().asString().endsWith("POST /api/v1/clubs 500");
    }
}
