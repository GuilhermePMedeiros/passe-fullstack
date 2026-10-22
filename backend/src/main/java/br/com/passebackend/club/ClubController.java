package br.com.passebackend.club;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import br.com.passebackend.club.converter.ClubRequestConverter;
import br.com.passebackend.club.dto.ClubRequestDTO;
import br.com.passebackend.club.dto.ClubResponseDTO;
import br.com.passebackend.nucleo.base.BaseController;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;

@RestController
@RequestMapping("/clubs")
public class ClubController extends BaseController {

    @Autowired
    private ClubService service;

    @GetMapping
    public ResponseEntity<Object> listClubs(@RequestParam(required = false) String sort) {
        try {
            return success(service.listClubs(sort));
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getClubById(@PathVariable String id) {
        try {
            return success(service.getClubById(parseId(id)));
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Object> createClub(@RequestBody(required = false) String body) {
        try {
            ClubRequestDTO request = ClubRequestConverter.fromJson(parseBody(body));
            ClubResponseDTO club = service.createClub(request);

            return success(club, "/api/v1/clubs/" + club.getId());

        } catch (BusinessConflictException exception) {
            return error(HttpStatus.CONFLICT, exception.getMessage());

        } catch (DataIntegrityViolationException exception) {
            return integrityConflict(exception, "Nome ou sigla de clube já cadastrados.");

        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }

    }

}
