package br.com.passebackend.club.converter;

import com.fasterxml.jackson.databind.JsonNode;

import br.com.passebackend.club.dto.ClubRequestDTO;
import br.com.passebackend.nucleo.util.StringUtils;

public final class ClubRequestConverter {

    private ClubRequestConverter() {
    }

    public static ClubRequestDTO fromJson(JsonNode json) {

        ClubRequestDTO request = new ClubRequestDTO();

        request.setName(StringUtils.requiredText(json, "name"));
        request.setAcronym(StringUtils.requiredText(json, "acronym"));

        return request;
    }

}
