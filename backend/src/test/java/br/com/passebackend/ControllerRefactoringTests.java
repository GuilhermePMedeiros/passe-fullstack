package br.com.passebackend;

import java.util.Map;
import org.springframework.http.ResponseEntity;

import java.sql.SQLException;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.passebackend.club.ClubController;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.club.dto.ClubResponseDTO;
import br.com.passebackend.nucleo.base.BaseController;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ControllerRefactoringTests {

    private ClubService service;
    private MockMvc mvc;
    private final String body = "{\"name\":\"Águias FC\",\"acronym\":\"AGU\"}";

    @BeforeEach
    void setup() {
        service = mock(ClubService.class);
        ClubController controller = new ClubController();
        ReflectionTestUtils.setField(controller, "service", service);
        ReflectionTestUtils.setField(controller, "objectMapper", new ObjectMapper());
        mvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void createdKeepsLocationAndUnwrappedDto() throws Exception {
        ClubResponseDTO club = new ClubResponseDTO();
        club.setId(7);
        club.setName("Águias FC");
        when(service.createClub(any())).thenReturn(club);
        mvc.perform(post("/clubs").contentType("application/json").content(body))
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", "/api/v1/clubs/7"))
                .andExpect(jsonPath("$.id").value(7))
                .andExpect(jsonPath("$.data").doesNotExist());
    }

    @Test
    void duplicateSqlKeyReturnsConflictWithoutDatabaseDetails() throws Exception {
        when(service.createClub(any())).thenThrow(new DataIntegrityViolationException(
                "private SQL", new SQLException("private detail", "23000", 1062)));
        mvc.perform(post("/clubs").contentType("application/json").content(body))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Nome ou sigla de clube já cadastrados."))
                .andExpect(jsonPath("$.trace").doesNotExist());
    }

    @Test
    void springDuplicateKeyReturnsConflict() throws Exception {
        when(service.createClub(any())).thenThrow(new DuplicateKeyException("private detail"));
        mvc.perform(post("/clubs").contentType("application/json").content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @ParameterizedTest
    @ValueSource(ints = {1048, 1406, 1452})
    void otherIntegrityFailuresAreNotMaskedAsConflicts(int code) {
        var failure = new DataIntegrityViolationException("unexpected database failure",
                new SQLException("private detail", "23000", code));
        when(service.createClub(any())).thenThrow(failure);
        assertThatThrownBy(() -> mvc.perform(post("/clubs").contentType("application/json").content(body)))
                .hasCause(failure);
    }

    @Test
    void unknownIntegrityFailureIsPropagated() {
        var failure = new DataIntegrityViolationException("unexpected database failure");
        when(service.createClub(any())).thenThrow(failure);
        assertThatThrownBy(() -> mvc.perform(post("/clubs").contentType("application/json").content(body)))
                .hasCause(failure);
    }

    @Test
    void unexpectedServiceFailureIsPropagated() {
        var failure = new IllegalStateException("unexpected service failure");
        when(service.createClub(any())).thenThrow(failure);
        assertThatThrownBy(() -> mvc.perform(post("/clubs").contentType("application/json").content(body)))
                .hasCause(failure);
    }

    @Test
    void concatenatedJsonIsRejectedBeforeServiceCall() throws Exception {
        mvc.perform(post("/clubs").contentType("application/json").content(body + "{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").isNotEmpty());
        verifyNoInteractions(service);
    }

    @Test
    void sharedResponsesKeepCodesBodiesAndErrorFallback() {
        BaseController base = new BaseController() {};
        var ok = ReflectionTestUtils.invokeMethod(base, "success", "body");
        assertThat(ok).isEqualTo(ResponseEntity.ok("body"));
        ResponseEntity<?> empty = ReflectionTestUtils.invokeMethod(base, "success");
        assertThat(empty.getStatusCode().value()).isEqualTo(204);
        assertThat(empty.getBody()).isNull();
        ResponseEntity<?> error = ReflectionTestUtils.invokeMethod(
                base, "error", HttpStatus.BAD_REQUEST, " ");
        assertThat(error.getStatusCode().value()).isEqualTo(400);
        assertThat(error.getBody()).isEqualTo(Map.of("message", "Requisição inválida."));
    }

    @ParameterizedTest
    @ValueSource(strings = {"0", "01", "2147483648", "1.0"})
    void invalidUrlIdStillUsesNotFound(String id) throws Exception {
        mvc.perform(get("/clubs/" + id)).andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Recurso não encontrado."));
        verifyNoInteractions(service);
    }
}
