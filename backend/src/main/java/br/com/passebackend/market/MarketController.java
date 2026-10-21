package br.com.passebackend.market;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import br.com.passebackend.market.converter.BuyRequestConverter;
import br.com.passebackend.nucleo.base.BaseController;
import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.nucleo.util.NumberUtils;
import br.com.passebackend.transaction.enums.TransactionType;

@RestController
public class MarketController extends BaseController {
    @Autowired 
    private MarketService service;

    @PostMapping("/players/{id}/buy")
    public ResponseEntity<Object> buy(@PathVariable String id, @RequestBody(required = false) String body) {
        try {
        
            return success(service.buy(parseId(id), BuyRequestConverter.fromJson(parseBody(body))));
        
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        } catch (BusinessConflictException exception) {
            return error(HttpStatus.CONFLICT, exception.getMessage());
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    @PostMapping("/players/{id}/sell")
    public ResponseEntity<Object> sell(@PathVariable String id) {
        try {
        
            return success(service.sell(parseId(id)));
        
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        } catch (BusinessConflictException exception) {
            return error(HttpStatus.CONFLICT, exception.getMessage());
        }
    }

    @GetMapping({"/clubs/{id}/transactions", "/clubs/{id}/transactions/export"})
    public ResponseEntity<Object> history(@PathVariable String id, @RequestParam Map<String, String> params,
            jakarta.servlet.http.HttpServletRequest request) {
        try {
            int clubId = parseId(id);

            List<TransactionType> types = parseTypes(params.get("type"));
            
            Integer playerId = params.containsKey("player_id") ? NumberUtils.parsePositiveInteger(params.get("player_id")) : null;
            
            if (request.getRequestURI().endsWith("/export")) {
                return ResponseEntity.ok().contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                        .header("Content-Disposition", "attachment; filename=transactions.csv")
                        .body(service.export(clubId, types, playerId).getBytes(StandardCharsets.UTF_8));
            }
            
            return success(service.history(clubId, types, playerId));
        } catch (ResourceNotFoundException exception) {
            return error(HttpStatus.NOT_FOUND, exception.getMessage());
        } catch (IllegalArgumentException exception) {
            return error(HttpStatus.BAD_REQUEST, exception.getMessage());
        }
    }

    private List<TransactionType> parseTypes(String raw) {
        if (raw == null) return null;
        
        List<TransactionType> types = new ArrayList<>();
        
        for (String code : raw.split(",", -1)) {
            TransactionType type = TransactionType.fromCode(code);
            if (types.contains(type)) throw new IllegalArgumentException("Tipo de transação repetido.");
            types.add(type);
        }
        
        return types;
    }
}
