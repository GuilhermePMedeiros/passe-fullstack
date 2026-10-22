package br.com.passebackend.match.converter;

import com.fasterxml.jackson.databind.JsonNode;
import br.com.passebackend.match.dto.MatchRequestDTO;
import br.com.passebackend.nucleo.util.NumberUtils;

public final class MatchRequestConverter {
    private MatchRequestConverter() { }

    public static MatchRequestDTO fromJson(JsonNode json) {
        MatchRequestDTO request = new MatchRequestDTO();
        request.setHomeClubId(NumberUtils.requiredInteger(json, "home_club_id"));
        request.setAwayClubId(NumberUtils.requiredInteger(json, "away_club_id"));
        return request;
    }
}
