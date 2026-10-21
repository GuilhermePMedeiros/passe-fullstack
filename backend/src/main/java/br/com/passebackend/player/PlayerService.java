package br.com.passebackend.player;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;



import br.com.passebackend.nucleo.util.StringUtils;
import br.com.passebackend.nucleo.util.NumberUtils;
import br.com.passebackend.nucleo.util.MoneyUtils;
import br.com.passebackend.player.dto.PlayerRequestDTO;
import br.com.passebackend.player.dto.PlayerResponseDTO;
import br.com.passebackend.player.enums.PlayerCondition;
import br.com.passebackend.player.enums.PlayerPosition;
import br.com.passebackend.club.ClubService;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.nucleo.exception.BusinessConflictException;

@Service

public class PlayerService {

    @Autowired
    private PlayerRepository repository;

    @Autowired
    private ClubService clubService;

    @Transactional
    public Player getActivePlayerForUpdate(Integer id) {
        if (id == null || id <= 0) throw new ResourceNotFoundException("Jogador não encontrado.");
        Player player = repository.findActiveForUpdate(id).orElseThrow(
                () -> new ResourceNotFoundException("Jogador não encontrado."));
        if (player.getDeletedAt() != null) throw new ResourceNotFoundException("Jogador não encontrado.");
        return player;
    }

    @Transactional(readOnly = true)
    public long countPlayersByClubId(Integer clubId) {
        return repository.countByClubIdAndDeletedAtIsNull(clubId);
    }

    @Transactional
    public PlayerResponseDTO createPlayer(PlayerRequestDTO request) {
        validatePlayerCreate(request);

        Player player = converterPlayerRequestDTOToPlayerPost(request);

        int overall = calculateOverall(player);
        player.setBaseValue(calculateBaseValue(overall, player.getAge(), player.getPotential()));

        return toResponse(repository.save(player));
    }

    @Transactional(readOnly = true)
    public PlayerResponseDTO getPlayerById(Integer id) {
    	return toResponse(findActivePlayer(id));
    }
    
    @Transactional(readOnly = true)
    public List<Player> getPlayersByClubId(Integer clubId) {
        return repository.findByClubIdAndDeletedAtIsNull(clubId);
    }

    @Transactional(readOnly = true)
    public List<Player> getPlayersByClubIds(List<Integer> clubIds) {

        if (clubIds.isEmpty()) {
            return new ArrayList<>();
        }

        return repository.findByClubIdInAndDeletedAtIsNull(clubIds);
    }

    @Transactional
    public PlayerResponseDTO updatePlayer(Integer id, PlayerRequestDTO request) {
        Player player = getActivePlayerForUpdate(id);

        validatePlayerPut(request, player);

        converterPlayerRequestDTOToPlayerPut(request, player);

        return toResponse(repository.save(player));
    }

    @Transactional
    public PlayerResponseDTO updatePlayerCondition(Integer id, PlayerCondition condition) {
        Player player = getActivePlayerForUpdate(id);

        if (condition == null) {
            throw new IllegalArgumentException("Condição obrigatória.");
        }

        if (player.getCondition() == PlayerCondition.SICK && condition == PlayerCondition.FIT) {
            throw new BusinessConflictException("Não é permitido alterar diretamente de DOENTE para APTO.");
        }

        player.setCondition(condition);

        
        return toResponse(repository.save(player));
    }

    @Transactional
    public void deletePlayer(Integer id) {

        Player player = getActivePlayerForUpdate(id);

        if (player.getClub() != null) {

            throw new BusinessConflictException("Não é permitido excluir um jogador vinculado a um clube.");

        }

        player.setDeletedAt(LocalDateTime.now());

        repository.save(player);

    }

    private Player findActivePlayer(Integer id) {

    	if (id == null || id <= 0) {
            throw new ResourceNotFoundException("Jogador não encontrado.");
        }

        Player player = repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Jogador não encontrado."));

        if (player.getDeletedAt() != null) {
            throw new ResourceNotFoundException("Jogador não encontrado.");
        }

        return player;
    }

    private void validateRequestBody(PlayerRequestDTO request) {

        if (request == null) {
            throw new IllegalArgumentException("Corpo da requisição obrigatório.");
        }

    }

    private void validatePlayerName(String rawName) {

        String name = StringUtils.normalizeName(rawName);

        if (StringUtils.isBlank(name)) {
            throw new IllegalArgumentException("Nome obrigatório.");
        }

        int length = name.codePointCount(0, name.length());

        if (length < 3 || length > 100) {
            throw new IllegalArgumentException("Nome deve ter entre 3 e 100 caracteres.");
        }

        String[] words = name.split(" ");

        if (words.length < 2) {
            throw new IllegalArgumentException("Nome deve conter pelo menos duas palavras.");
        }

        for (String word : words) {
            boolean hasLetter = false;

            for (int i = 0; i < word.length();) {
                int character = word.codePointAt(i);

                if (Character.isLetter(character)) {
                    hasLetter = true;
                }

                if (character >= '0' && character <= '9') {
                    throw new IllegalArgumentException("Nome não pode conter números.");
                }

                i += Character.charCount(character);
            }

            if (!hasLetter) {
                throw new IllegalArgumentException("Cada palavra do nome deve conter uma letra.");
            }

        }

    }

    private void validateEditableFields(PlayerRequestDTO request) {

        validateRequestBody(request);

        validatePlayerName(request.getName());

        if (request.getPosition() == null) {
            throw new IllegalArgumentException("Posição obrigatória.");
        }

        if (!NumberUtils.isBetween(request.getAge(), 16, 45)) {
            throw new IllegalArgumentException("Idade deve estar entre 16 e 45.");
        }

        if (!NumberUtils.isBetween(request.getAgility(), 1, 100)) {
            throw new IllegalArgumentException("Agilidade deve estar entre 1 e 100.");
        }

        if (request.getAge() >= 35 && request.getAgility() > 85) {
            throw new IllegalArgumentException("Jogadores com 35 anos ou mais podem ter agilidade máxima de 85.");
        }

    }

    private void validatePlayerCreate(PlayerRequestDTO request) {

        validateEditableFields(request);

        Integer[] attributes = {
                request.getPace(), request.getShooting(), request.getPassing(),
                request.getDribbling(), request.getDefending(), request.getPhysical()
        };

        int sum = 0;
        int maximum = 0;

        for (Integer attribute : attributes) {
            if (!NumberUtils.isBetween(attribute, 1, 99)) {
                throw new IllegalArgumentException("Indicadores devem estar entre 1 e 99.");
            }

            sum += attribute;

            if (attribute > maximum) {
                maximum = attribute;
            }

        }

        if (sum > 480) {
            throw new IllegalArgumentException("Soma dos indicadores não pode ultrapassar 480.");
        }

        if (!NumberUtils.isBetween(request.getPotential(), 1, 99)) {
            throw new IllegalArgumentException("Potencial deve estar entre 1 e 99.");
        }

        if (request.getPotential() < maximum) {
            throw new IllegalArgumentException("Potencial não pode ser menor que o maior indicador.");
        }

        if (request.getAge() >= 33 && request.getPotential() != maximum) {
            throw new IllegalArgumentException(
                    "A partir dos 33 anos, o potencial deve ser igual ao maior indicador.");
        }

    }

    private void validatePlayerPut(PlayerRequestDTO request, Player player) {

        validateEditableFields(request);

        if (request.getAge() < player.getAge()) {
            throw new BusinessConflictException("Idade não pode diminuir.");
        }

        if (player.getClub() != null && request.getPosition() != player.getPosition()) {
            throw new BusinessConflictException("Jogador contratado não pode mudar de posição.");
        }

    }

    private Player converterPlayerRequestDTOToPlayerPost(PlayerRequestDTO request) {

        Player player = new Player();

        player.setName(StringUtils.normalizeName(request.getName()));
        player.setPosition(request.getPosition());
        player.setAgility(request.getAgility());
        player.setAge(request.getAge());
        player.setPace(request.getPace());
        player.setShooting(request.getShooting());
        player.setPassing(request.getPassing());
        player.setDribbling(request.getDribbling());
        player.setDefending(request.getDefending());
        player.setPhysical(request.getPhysical());
        player.setPotential(request.getPotential());
        player.setCondition(PlayerCondition.FIT);

        return player;
    }

    private Player converterPlayerRequestDTOToPlayerPut(PlayerRequestDTO request, Player player) {

        player.setName(StringUtils.normalizeName(request.getName()));
        player.setPosition(request.getPosition());
        player.setAgility(request.getAgility());
        player.setAge(request.getAge());

        return player;

    }

    public int calculateOverall(Player player) {

        int[] weights;

        switch (player.getPosition()) {

            case GOALKEEPER: weights = new int[]{10, 0, 20, 0, 40, 30}; break;
            case CENTER_BACK: weights = new int[]{10, 0, 15, 0, 45, 30}; break;
            case FULL_BACK: weights = new int[]{25, 0, 20, 15, 25, 15}; break;
            case MIDFIELDER: weights = new int[]{10, 15, 35, 25, 5, 10}; break;
            case STRIKER: weights = new int[]{20, 40, 10, 20, 0, 10}; break;

            default: throw new IllegalArgumentException("Posição inválida.");

        }

        int weightedSum = player.getPace() * weights[0]
                + player.getShooting() * weights[1]
                + player.getPassing() * weights[2]
                + player.getDribbling() * weights[3]
                + player.getDefending() * weights[4]
                + player.getPhysical() * weights[5];

        return NumberUtils.roundHalfUp(weightedSum, 100);
    }

    public BigDecimal calculateBaseValue(int overall, int age, int potential) {

        BigDecimal value = BigDecimal.ZERO;

        if (overall > 40) {
            value = value.add(BigDecimal.valueOf(Math.min(overall, 60) - 40)
                    .multiply(new BigDecimal("0.50")));

        }

        if (overall > 60) {
            value = value.add(BigDecimal.valueOf(Math.min(overall, 75) - 60)
                    .multiply(new BigDecimal("2.00")));
        }

        if (overall > 75) {
            value = value.add(BigDecimal.valueOf(overall - 75)
                    .multiply(new BigDecimal("6.00")));
        }

        if (age <= 21) {
            int percentage = 100 + potential - overall;
            value = value.multiply(BigDecimal.valueOf(percentage))
                    .divide(BigDecimal.valueOf(100));
        }

        return MoneyUtils.minimum(MoneyUtils.round(value), MoneyUtils.MIN_VALUE);
    }

    public BigDecimal calculateMarketValue(Player player) {

        BigDecimal discount = BigDecimal.ZERO;

        if (player.getCondition() == PlayerCondition.UNFIT) {
            discount = new BigDecimal("15");
        } else if (player.getCondition() == PlayerCondition.SICK) {
            discount = new BigDecimal("30");
        }

        if (discount.compareTo(BigDecimal.ZERO) > 0) {
            if (player.getAgility() >= 80) {
                discount = discount.divide(BigDecimal.valueOf(2));
            } else if (player.getAgility() <= 30) {
                discount = discount.add(BigDecimal.TEN);
            }
        }

        int ageAdjustment = 0;

        if (player.getAge() <= 21) {
            ageAdjustment = 10;

        } else if (player.getAge() >= 32) {
            ageAdjustment = -10;
        }

        BigDecimal percentage = BigDecimal.valueOf(ageAdjustment).subtract(discount);

        if (percentage.compareTo(new BigDecimal("-40")) < 0) {
            percentage = new BigDecimal("-40");
        }

        BigDecimal value = player.getBaseValue()
                .multiply(BigDecimal.valueOf(100).add(percentage))
                .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);

        return MoneyUtils.minimum(value, MoneyUtils.MIN_VALUE);
    }

    public PlayerResponseDTO toResponse(Player player) {

        PlayerResponseDTO response = new PlayerResponseDTO();

        response.setId(player.getId());
        response.setName(player.getName());
        response.setPosition(player.getPosition());
        response.setAgility(player.getAgility());
        response.setAge(player.getAge());
        response.setCondition(player.getCondition());
        response.setBaseValue(player.getBaseValue());
        response.setMarketValue(calculateMarketValue(player));
        response.setPace(player.getPace());
        response.setShooting(player.getShooting());
        response.setPassing(player.getPassing());
        response.setDribbling(player.getDribbling());
        response.setDefending(player.getDefending());
        response.setPhysical(player.getPhysical());
        response.setPotential(player.getPotential());
        response.setOverall(calculateOverall(player));
        response.setClubId(player.getClub() == null ? null : player.getClub().getId());

        return response;
    }

    @Transactional(readOnly = true)
    public Map<String, Object> listPlayers(String search, PlayerPosition position,
            PlayerCondition condition, Boolean free, Integer clubId,
            Integer minAge, Integer maxAge, BigDecimal minValue,
            BigDecimal maxValue, String sort, Integer page, Integer limit) {

        if (page == null) page = 1;

        if (limit == null) limit = 10;

        if (sort == null) sort = "name";

        validatePagination(page, limit);
        validateListFilters(search, free, clubId, minAge, maxAge, minValue, maxValue);
        String[] sortFields = validateSort(sort);

        List<Player> filtered = findFilteredPlayers(search, position, condition, free,
                clubId, minAge, maxAge, minValue, maxValue);
        filtered.sort(createPlayerComparator(sortFields));

        return paginatePlayers(filtered, page, limit);
    }

    private void validatePagination(int page, int limit) {

        if (page < 1 || limit < 1 || limit > 50) {
            throw new IllegalArgumentException("Página ou limite inválido.");
        }

    }

    private void validateListFilters(String search, Boolean free, Integer clubId,
            Integer minAge, Integer maxAge, BigDecimal minValue, BigDecimal maxValue) {

        if (search != null && (search.codePointCount(0, search.length()) < 2
                || search.codePointCount(0, search.length()) > 100)) {
            throw new IllegalArgumentException("Busca deve conter entre 2 e 100 caracteres.");
        }

        validateAgeRange(minAge, maxAge);
        validateMarketValueRange(minValue, maxValue);

        if (Boolean.TRUE.equals(free) && clubId != null) {
            throw new IllegalArgumentException("Não é permitido free=true com club_id.");
        }

        if (clubId != null && (clubId <= 0 || !clubService.existsClubById(clubId))) {
            throw new ResourceNotFoundException("Clube não encontrado.");
        }

    }

    private void validateAgeRange(Integer minAge, Integer maxAge) {

        if (minAge != null && (minAge < 16 || minAge > 45)) {
            throw new IllegalArgumentException("Idade mínima inválida.");
        }

        if (maxAge != null && (maxAge < 16 || maxAge > 45)) {
            throw new IllegalArgumentException("Idade máxima inválida.");
        }

        if (minAge != null && maxAge != null && minAge > maxAge) {
            throw new IllegalArgumentException("Faixa de idade inválida.");
        }

    }

    private void validateMarketValueRange(BigDecimal minValue, BigDecimal maxValue) {

        BigDecimal zero = BigDecimal.ZERO;

        BigDecimal maximumValue = new BigDecimal("550");

        if (minValue != null && (minValue.compareTo(zero) < 0
                || minValue.compareTo(maximumValue) > 0 || minValue.scale() > 2)) {
            throw new IllegalArgumentException("Valor mínimo inválido.");
        }

        if (maxValue != null && (maxValue.compareTo(zero) < 0
                || maxValue.compareTo(maximumValue) > 0 || maxValue.scale() > 2)) {
            throw new IllegalArgumentException("Valor máximo inválido.");
        }

        if (minValue != null && maxValue != null && minValue.compareTo(maxValue) > 0) {
            throw new IllegalArgumentException("Faixa de valor inválida.");
        }

    }

    private String[] validateSort(String sort) {

        String[] sortFields = sort.split(",", -1);

        if (sortFields.length < 1 || sortFields.length > 2) {
            throw new IllegalArgumentException("Ordenação inválida.");
        }

        Set<String> sortSet = new HashSet<>();

        for (String field : sortFields) {

            if (!field.equals("name") && !field.equals("value_asc")
                    && !field.equals("value_desc") && !field.equals("age_asc")
                    && !field.equals("age_desc") && !field.equals("position")) {
                throw new IllegalArgumentException("Ordenação inválida.");
            }

            String group = field;

            if (field.startsWith("value_")) group = "value";

            if (field.startsWith("age_")) group = "age";

            if (!sortSet.add(group)) {
                throw new IllegalArgumentException("Critérios de ordenação repetidos.");
            }
        }

        return sortFields;
    }

    private List<Player> findFilteredPlayers(String search, PlayerPosition position,
            PlayerCondition condition, Boolean free, Integer clubId,
            Integer minAge, Integer maxAge, BigDecimal minValue, BigDecimal maxValue) {

        List<Player> filtered = new ArrayList<>();

        String normalizedSearch = search == null ? null : normalizeForSearch(search);

        for (Player player : repository.findActivePlayers(position, condition, free, clubId, minAge, maxAge)) {

            if (normalizedSearch != null
                    && !normalizeForSearch(player.getName()).contains(normalizedSearch)) continue;

            BigDecimal marketValue = calculateMarketValue(player);

            if (minValue != null && marketValue.compareTo(minValue) < 0) continue;

            if (maxValue != null && marketValue.compareTo(maxValue) > 0) continue;

            filtered.add(player);
        }

        return filtered;
    }

    private Comparator<Player> createPlayerComparator(String[] sortFields) {

        Comparator<Player> comparator = (a, b) -> 0;

        for (String field : sortFields) {
            Comparator<Player> next;

            switch (field) {

                case "value_asc": next = (a, b) -> calculateMarketValue(a).compareTo(calculateMarketValue(b)); break;
                case "value_desc": next = (a, b) -> calculateMarketValue(b).compareTo(calculateMarketValue(a)); break;
                case "age_asc": next = Comparator.comparingInt(Player::getAge); break;
                case "age_desc": next = (a, b) -> Integer.compare(b.getAge(), a.getAge()); break;
                case "position": next = Comparator.comparingInt(a -> a.getPosition().getOrder()); break;

                default: next = Comparator.comparing(a -> normalizeForSearch(a.getName()));
            }

            comparator = comparator.thenComparing(next);
        }

        comparator = comparator.thenComparing(a -> normalizeForSearch(a.getName()))
                .thenComparing(Player::getId);

        return comparator;
    }

    private Map<String, Object> paginatePlayers(List<Player> filtered, int page, int limit) {

        long totalItems = filtered.size();
        long totalPages = (totalItems + limit - 1L) / limit;
        long start = ((long) page - 1L) * limit;

        List<PlayerResponseDTO> data = new ArrayList<>();

        if (start < totalItems) {
            int end = (int) Math.min(start + limit, totalItems);

            for (int i = (int) start; i < end; i++) {
                data.add(toResponse(filtered.get(i)));
            }

        }

        Map<String, Object> meta = new HashMap<>();

        meta.put("page", page);
        meta.put("limit", limit);
        meta.put("total_items", totalItems);
        meta.put("total_pages", totalPages);

        Map<String, Object> result = new HashMap<>();

        result.put("data", data);
        result.put("meta", meta);

        return result;
    }

    private String normalizeForSearch(String value) {
        String text = Normalizer.normalize(value, Normalizer.Form.NFD);
        text = text.replaceAll("\\p{Mn}+", "");

        return text.toLowerCase(java.util.Locale.ROOT);

    }

}
