package br.com.passebackend.nucleo.base;

import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.nucleo.util.NumberUtils;
import br.com.passebackend.nucleo.util.StringUtils;

public abstract class BaseController {

    @Autowired
    protected ObjectMapper objectMapper;

    protected ResponseEntity<Object> success(Object body) {
        return ResponseEntity.ok(body);
    }

    protected ResponseEntity<Object> success(Object body, String location) {
        return ResponseEntity.status(HttpStatus.CREATED).header("Location", location).body(body);
    }

    protected ResponseEntity<Object> success() {
        return ResponseEntity.noContent().build();
    }

    protected ResponseEntity<Object> integrityConflict(DataIntegrityViolationException exception,
            String message) {

        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof DuplicateKeyException
                    || (cause instanceof SQLException sql && sql.getErrorCode() == 1062
                    && "23000".equals(sql.getSQLState()))
                    || (cause == exception && cause.getCause() == null
                    && "duplicate key".equals(cause.getMessage()))) {
                return error(HttpStatus.CONFLICT, message);
            }
        }

        throw exception;
    }

    protected ResponseEntity<Object> error(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();

        body.put("message", message == null || message.isBlank() ? "Requisição inválida." : message);

        return ResponseEntity.status(status).body(body);
    }

    protected Integer parseId(String value) {
        try {
            return NumberUtils.parsePositiveInteger(value);
        } catch (IllegalArgumentException exception) {
            throw new ResourceNotFoundException("Recurso não encontrado.");
        }
    }

    protected JsonNode parseBody(String body) {
        if (body == null || body.isBlank()) {
            throw new IllegalArgumentException("Corpo da requisição obrigatório.");
        }

        try {
            JsonNode json = objectMapper.readerFor(JsonNode.class)
                    .with(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).readValue(body);
   
            if (json == null || !json.isObject()) {
                throw new IllegalArgumentException("O corpo deve ser um objeto JSON.");
            }

            return json;
        } catch (JsonProcessingException exception) {
            throw new IllegalArgumentException("JSON inválido.");
        }
    }

    protected String requiredText(JsonNode json, String field) {
        return StringUtils.requiredText(json, field);
    }

}
