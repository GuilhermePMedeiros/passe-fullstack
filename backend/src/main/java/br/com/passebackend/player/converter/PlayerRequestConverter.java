package br.com.passebackend.player.converter;

import com.fasterxml.jackson.databind.JsonNode;

import br.com.passebackend.nucleo.util.NumberUtils;
import br.com.passebackend.nucleo.util.StringUtils;
import br.com.passebackend.player.dto.PlayerRequestDTO;
import br.com.passebackend.player.enums.PlayerPosition;

public final class PlayerRequestConverter {

    private PlayerRequestConverter() {
    }

    public static PlayerRequestDTO fromJson(JsonNode json, boolean create) {

        PlayerRequestDTO request = new PlayerRequestDTO();

        request.setName(StringUtils.requiredText(json, "name"));
        request.setPosition(PlayerPosition.fromCode(StringUtils.requiredText(json, "position")));
        request.setAgility(NumberUtils.requiredInteger(json, "agility"));
        request.setAge(NumberUtils.requiredInteger(json, "age"));

        if (create) {

            request.setPace(NumberUtils.requiredInteger(json, "pace"));
            request.setShooting(NumberUtils.requiredInteger(json, "shooting"));
            request.setPassing(NumberUtils.requiredInteger(json, "passing"));
            request.setDribbling(NumberUtils.requiredInteger(json, "dribbling"));
            request.setDefending(NumberUtils.requiredInteger(json, "defending"));
            request.setPhysical(NumberUtils.requiredInteger(json, "physical"));
            request.setPotential(NumberUtils.requiredInteger(json, "potential"));
        }

        return request;
    }

}
