package br.com.passebackend.match;

import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import br.com.passebackend.match.converter.MatchRequestConverter;
import br.com.passebackend.match.dto.MatchResponseDTO;
import br.com.passebackend.nucleo.base.BaseController;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.nucleo.util.NumberUtils;

@RestController
@RequestMapping("/matches")
public class MatchController extends BaseController {
    @Autowired
    private MatchService service;

    @PostMapping
    public ResponseEntity<Object> play(@RequestBody(required = false) String body) {
        try {
            MatchResponseDTO response = service.play(MatchRequestConverter.fromJson(parseBody(body)));
            return success(response, "/api/v1/matches/" + response.getId());
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        } catch (BusinessConflictException exception) {
            return error(HttpStatus.CONFLICT, exception.getMessage());
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    @GetMapping
    public ResponseEntity<Object> list(@RequestParam Map<String, String> params) {
        try {
            Integer clubId = params.containsKey("club_id")
                    ? NumberUtils.parsePositiveInteger(params.get("club_id")) : null;
            return success(service.list(clubId));
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> get(@PathVariable String id) {
        try {
            return success(service.get(parseId(id)));
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        }
    }
}
