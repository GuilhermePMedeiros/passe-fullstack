package br.com.passebackend.lineup.converter;

import java.util.ArrayList;
import com.fasterxml.jackson.databind.JsonNode;
import br.com.passebackend.lineup.dto.LineupRequestDTO;
import br.com.passebackend.lineup.enums.Formation;
import br.com.passebackend.nucleo.util.StringUtils;

public final class LineupRequestConverter {
    private LineupRequestConverter() { }

    public static LineupRequestDTO fromJson(JsonNode json) {
        LineupRequestDTO request = new LineupRequestDTO();
        request.setFormation(Formation.fromCode(StringUtils.requiredText(json, "formation")));
        JsonNode ids = json.get("player_ids");

        if (ids == null || !ids.isArray()) {
            throw new IllegalArgumentException("player_ids deve ser uma lista de inteiros.");
        }

        var playerIds = new ArrayList<Integer>();
        for (JsonNode id : ids) {
            playerIds.add(parsePlayerId(id));
        }
        request.setPlayerIds(playerIds);
        return request;
    }

    private static Integer parsePlayerId(JsonNode id) {
        if (!id.isNumber()) {
            throw new IllegalArgumentException("Id do jogador deve ser inteiro positivo.");
        }
        try {
            return id.decimalValue().intValueExact();
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException("Id do jogador deve ser inteiro positivo.");
        }
    }
}
