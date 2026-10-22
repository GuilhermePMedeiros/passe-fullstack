package br.com.passebackend;

import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.test.context.ActiveProfiles;
import static org.assertj.core.api.Assertions.assertThat;

/** Real embedded HTTP server and MySQL profile; does not write business data. */
@ActiveProfiles("test")
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class AuditRuntimeTests {
    @Autowired TestRestTemplate client;

    @Test void unknownRouteMustReturnMessage() {
        var response = client.getForEntity("/api/v1/inexistente", Map.class);
        assertThat(response.getStatusCode().value()).isEqualTo(404);
        assertThat(response.getBody()).containsKey("message");
        assertThat(response.getBody().get("message")).isInstanceOf(String.class);
        assertThat((String) response.getBody().get("message")).isNotBlank();
        assertThat(response.getBody()).doesNotContainKeys("trace", "exception");
    }
}
