package br.com.passebackend.market.converter;

import com.fasterxml.jackson.databind.JsonNode;
import br.com.passebackend.market.dto.BuyRequestDTO;
import br.com.passebackend.nucleo.util.DateTimeUtils;
import br.com.passebackend.nucleo.util.NumberUtils;
import br.com.passebackend.nucleo.util.StringUtils;

public final class BuyRequestConverter {
    private BuyRequestConverter() { }

    public static BuyRequestDTO fromJson(JsonNode json) {
        BuyRequestDTO dto = new BuyRequestDTO();
        int clubId = NumberUtils.requiredInteger(json, "club_id");
        if (clubId <= 0) throw new IllegalArgumentException("Clube deve ter id positivo.");
        dto.setClubId(clubId);
        dto.setLoyaltyUntil(DateTimeUtils.parseLoyalty(StringUtils.requiredText(json, "loyalty_until")));
        return dto;
    }
}
