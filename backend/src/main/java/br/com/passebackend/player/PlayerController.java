package br.com.passebackend.player;

import java.math.BigDecimal;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import br.com.passebackend.nucleo.base.BaseController;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.nucleo.util.StringUtils;
import br.com.passebackend.nucleo.util.NumberUtils;
import br.com.passebackend.nucleo.util.MoneyUtils;
import br.com.passebackend.player.converter.PlayerRequestConverter;
import br.com.passebackend.player.dto.PlayerRequestDTO;
import br.com.passebackend.player.dto.PlayerResponseDTO;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;

@RestController
@RequestMapping("/players")
public class PlayerController extends BaseController {

    @Autowired
    private PlayerService service;

    @GetMapping
    public ResponseEntity<Object> listPlayers(@RequestParam Map<String, String> params) {

        try {
            String search = params.get("search");

            if (search != null) {
                search = StringUtils.normalizeSearch(search);
            }

            PlayerPosition position = params.containsKey("position")
                    ? PlayerPosition.fromCode(params.get("position")) : null;

            PlayerCondition condition = params.containsKey("condition")
                    ? PlayerCondition.fromCode(params.get("condition")) : null;

            Boolean free = params.containsKey("free")
                    ? StringUtils.parseBoolean(params.get("free")) : null;

            Integer clubId = params.containsKey("club_id")
                    ? NumberUtils.parsePositiveInteger(params.get("club_id")) : null;

            Integer minAge = params.containsKey("min_age")
                    ? NumberUtils.parsePositiveInteger(params.get("min_age")) : null;

            Integer maxAge = params.containsKey("max_age")
                    ? NumberUtils.parsePositiveInteger(params.get("max_age")) : null;

            BigDecimal minValue = params.containsKey("min_value")
                    ? MoneyUtils.parseMoney(params.get("min_value")) : null;

            BigDecimal maxValue = params.containsKey("max_value")
                    ? MoneyUtils.parseMoney(params.get("max_value")) : null;

            Integer page = params.containsKey("page")
                    ? NumberUtils.parsePositiveInteger(params.get("page")) : null;

            Integer limit = params.containsKey("limit")
                    ? NumberUtils.parsePositiveInteger(params.get("limit")) : null;

            return success(service.listPlayers(search, position, condition, free,
                    clubId, minAge, maxAge, minValue, maxValue, params.get("sort"), page, limit));

        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
     
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Object> getPlayerById(@PathVariable String id) {

        try {
            return success(service.getPlayerById(parseId(id)));

        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        }
    }

    @PostMapping
    public ResponseEntity<Object> createPlayer(@RequestBody(required = false) String body) {
        try {
            PlayerRequestDTO request = PlayerRequestConverter.fromJson(parseBody(body), true);
            PlayerResponseDTO player = service.createPlayer(request);

            return success(player, "/api/v1/players/" + player.getId());

        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }

    }

    @PutMapping("/{id}")
    public ResponseEntity<Object> updatePlayer(@PathVariable String id,
            @RequestBody(required = false) String body) {

        try {
            Integer playerId = parseId(id);
            PlayerRequestDTO request = PlayerRequestConverter.fromJson(parseBody(body), false);

            return success(service.updatePlayer(playerId, request));
        
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        
        } catch (BusinessConflictException exception) {
            return error(HttpStatus.CONFLICT, exception.getMessage());
        
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }

    }

    @PatchMapping("/{id}/condition")
    public ResponseEntity<Object> updatePlayerCondition(@PathVariable String id,
            @RequestBody(required = false) String body) {

        try {

            Integer playerId = parseId(id);
            JsonNode json = parseBody(body);
            PlayerCondition condition = PlayerCondition.fromCode(requiredText(json, "condition"));

            return success(service.updatePlayerCondition(playerId, condition));
        } catch (ResourceNotFoundException exception) {

            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        } catch (BusinessConflictException exception) {

            return error(HttpStatus.CONFLICT, exception.getMessage());
        } catch (IllegalArgumentException exception) {

            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Object> deletePlayer(@PathVariable String id) {
        try {
            service.deletePlayer(parseId(id));

            return success();
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());

        } catch (BusinessConflictException exception) {
            return error(HttpStatus.CONFLICT, exception.getMessage());
        }
    }

}
