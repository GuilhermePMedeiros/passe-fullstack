package br.com.passebackend.match;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import br.com.passebackend.nucleo.base.BaseController;

@RestController
@RequestMapping("/standings")
public class StandingsController extends BaseController {
    @Autowired
    private StandingsService service;

    @GetMapping
    public ResponseEntity<Object> get() {
        return success(service.get());
    }
}
