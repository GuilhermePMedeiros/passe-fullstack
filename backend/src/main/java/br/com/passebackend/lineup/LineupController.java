package br.com.passebackend.lineup;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import br.com.passebackend.lineup.converter.LineupRequestConverter;
import br.com.passebackend.nucleo.base.BaseController;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/clubs/{id}/lineup")
public class LineupController extends BaseController {
    @Autowired
    private LineupService service;

    @PutMapping
    public ResponseEntity<Object> update(@PathVariable String id, @RequestBody(required = false) String body) {
        try {
            return success(service.update(parseId(id), LineupRequestConverter.fromJson(parseBody(body))));
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        } catch (BusinessConflictException exception) {
            return error(HttpStatus.CONFLICT, exception.getMessage());
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Object> get(@PathVariable String id) {
        try {
            return success(service.get(parseId(id)));
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        }
    }
}
