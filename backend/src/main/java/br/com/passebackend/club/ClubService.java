package br.com.passebackend.club;

import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import br.com.passebackend.nucleo.exception.BusinessConflictException;
import br.com.passebackend.nucleo.exception.ResourceNotFoundException;
import br.com.passebackend.club.dto.ClubRequestDTO;
import br.com.passebackend.club.dto.ClubResponseDTO;
import br.com.passebackend.player.Player;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.dto.PlayerResponseDTO;

@Service
public class ClubService {

    @Autowired
    private ClubRepository repository;

    @Autowired
    @Lazy
    private PlayerService playerService;

    @Autowired
    private br.com.passebackend.contract.ContractService contractService;

    @Transactional
    public Club getClubForUpdate(Integer id) {
        return repository.findForUpdate(id).orElseThrow(
                () -> new ResourceNotFoundException("Clube não encontrado."));
    }

    @Transactional
    public ClubResponseDTO createClub(ClubRequestDTO request) {
        if (request == null) {
            throw new IllegalArgumentException("Corpo da requisição obrigatório.");
        }

        String normalizedName = validateClubName(request.getName());
        validateClubAcronym(normalizedName, request.getAcronym());

        if (repository.count() >= 20) {
            throw new BusinessConflictException("A liga permite no máximo 20 clubes.");
        }

        if (repository.existsByName(normalizedName)) {
            throw new BusinessConflictException("Nome de clube já cadastrado.");
        }

        if (repository.existsByAcronym(request.getAcronym())) {
            throw new BusinessConflictException("Sigla de clube já cadastrada.");
        }

        Club club = converterClubRequestDTOToClubPost(request, normalizedName);

        return toResponse(repository.save(club), false, new ArrayList<>());
    }

    @Transactional(readOnly = true)
    public boolean existsClubById(Integer id) {
        if (id == null || id <= 0) {
            return false;
        }

        return repository.existsById(id);
    }

    @Transactional(readOnly = true)
    public Club getClubEntityById(Integer id) {
        if (id == null || id <= 0) {
            throw new ResourceNotFoundException("Clube não encontrado.");
        }

        return repository.findById(id).orElseThrow(
                () -> new ResourceNotFoundException("Clube não encontrado."));
    }

    @Transactional(readOnly = true)
    public ClubResponseDTO getClubById(Integer id) {

        return toResponse(getClubEntityById(id), true);
    }

    @Transactional(readOnly = true)
    public List<ClubResponseDTO> listClubs(String sort) {

        if (sort == null) {
            sort = "name";
        }

        if (!sort.equals("name") && !sort.equals("net_worth_asc")
                && !sort.equals("net_worth_desc")) {

            throw new IllegalArgumentException("Ordenação inválida.");
        }

        List<Club> entities = repository.findAll();
        List<Integer> clubIds = new ArrayList<>();

        for (Club club : entities) {
            clubIds.add(club.getId());
        }

        Map<Integer, List<Player>> squads = new HashMap<>();

        for (Player player : playerService.getPlayersByClubIds(clubIds)) {
            squads.computeIfAbsent(player.getClub().getId(), id -> new ArrayList<>()).add(player);
        }

        List<ClubResponseDTO> clubs = new ArrayList<>();

        for (Club club : entities) {
            clubs.add(toResponse(club, false, squads.getOrDefault(club.getId(), new ArrayList<>())));
        }

        Comparator<ClubResponseDTO> byName = (first, second) -> {
            String firstName = normalizeForSort(first.getName());
            String secondName = normalizeForSort(second.getName());
            
            int comparison = firstName.compareTo(secondName);

            if (comparison != 0) {
                return comparison;
            }

            return Integer.compare(first.getId(), second.getId());
        };

        if (sort.equals("net_worth_asc")) {

            clubs.sort(Comparator.comparing(ClubResponseDTO::getNetWorth).thenComparing(byName));

        } else if (sort.equals("net_worth_desc")) {

            clubs.sort(Comparator.comparing(ClubResponseDTO::getNetWorth).reversed().thenComparing(byName));
        
        } else {
            clubs.sort(byName);
        }

        return clubs;
    }

    private String validateClubName(String rawName) {

        if (rawName == null || rawName.isBlank()) {
            throw new IllegalArgumentException("Nome do clube obrigatório.");
        }

        for (int index = 0; index < rawName.length(); index++) {

            if (Character.isISOControl(rawName.charAt(index))) {
                throw new IllegalArgumentException("Nome do clube contém caractere de controle.");
            }

        }

        String name = rawName.trim().replaceAll(" +", " ");

        int length = name.codePointCount(0, name.length());

        if (length < 3 || length > 60) {
            throw new IllegalArgumentException("Nome do clube deve ter entre 3 e 60 caracteres.");
        }

        String[] words = name.split(" ");

        int wordCount = 0;

        for (String word : words) {
            if (word.codePoints().anyMatch(Character::isLetter)) {
                wordCount++;
            }
        }

        if (wordCount < 2 || wordCount > 5) {
            throw new IllegalArgumentException("Nome do clube deve ter entre 2 e 5 palavras.");
        }

        for (int index = 0; index < name.length();) {

            int character = name.codePointAt(index);

            if (!Character.isLetter(character) && character != ' '
                    && character != '-' && character != '.') {

                throw new IllegalArgumentException("Nome do clube contém caracteres inválidos.");

            }
            index += Character.charCount(character);
        }
        return name;

    }

    private void validateClubAcronym(String name, String acronym) {

        if (acronym == null || !acronym.matches("[A-Z]{3}")) {
            throw new IllegalArgumentException("Sigla deve conter exatamente três letras maiúsculas de A a Z.");
        }

        if (acronym.charAt(0) == acronym.charAt(1)
                && acronym.charAt(1) == acronym.charAt(2)) {

            throw new IllegalArgumentException("As três letras da sigla não podem ser iguais.");
        }

        String letters = Normalizer.normalize(name, Normalizer.Form.NFD)
                .replaceAll("\\p{Mn}+", "")
                .replaceAll("[^A-Za-z]", "")
                .toUpperCase(Locale.ROOT);

        if (letters.isEmpty() || acronym.charAt(0) != letters.charAt(0)) {
            throw new IllegalArgumentException("A sigla deve começar pela primeira letra do nome.");
        }

        int position = 0;

        for (int index = 0; index < letters.length() && position < 3; index++) {
            if (letters.charAt(index) == acronym.charAt(position)) {
                position++;
            }
        }

        if (position != 3) {
            throw new IllegalArgumentException("As letras da sigla devem aparecer em ordem no nome.");
        }

    }

    private Club converterClubRequestDTOToClubPost(ClubRequestDTO request, String normalizedName) {

        Club club = new Club();

        club.setName(normalizedName);
        club.setAcronym(request.getAcronym());
        club.setCash(new BigDecimal("300.00"));

        return club;
    }

    private ClubResponseDTO toResponse(Club club, boolean includePlayers) {

        return toResponse(club, includePlayers, playerService.getPlayersByClubId(club.getId()));
    }

    private ClubResponseDTO toResponse(Club club, boolean includePlayers, List<Player> players) {

        players.sort(Comparator.comparingInt((Player player) -> player.getPosition().getOrder())
                .thenComparing(player -> normalizeForSort(player.getName()))
                .thenComparing(Player::getId));

        BigDecimal squadValue = new BigDecimal("0.00");

        List<PlayerResponseDTO> squad = new ArrayList<>();

        Map<Integer, br.com.passebackend.contract.dto.ContractResponseDTO> contracts =
                includePlayers && !players.isEmpty() ? contractService.getClubContracts(club.getId()) : Map.of();

        for (Player player : players) {
            squadValue = squadValue.add(playerService.calculateMarketValue(player));

            if (includePlayers) {
                PlayerResponseDTO playerResponse = playerService.toResponse(player);
                playerResponse.setContract(contracts.get(player.getId()));
                squad.add(playerResponse);
            }
        }

        ClubResponseDTO response = new ClubResponseDTO();

        response.setId(club.getId());
        response.setName(club.getName());
        response.setAcronym(club.getAcronym());
        response.setCash(club.getCash());
        response.setSquadValue(squadValue);
        response.setNetWorth(club.getCash().add(squadValue));

        if (includePlayers) {
            response.setPlayers(squad);
        }

        return response;
    }

    private String normalizeForSort(String name) {
        String text = Normalizer.normalize(name, Normalizer.Form.NFD);
        text = text.replaceAll("\\p{Mn}+", "");

        return text.toLowerCase(Locale.ROOT);
    }
}
