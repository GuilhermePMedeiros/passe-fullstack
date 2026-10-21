package br.com.passebackend;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import br.com.passebackend.club.Club;
import br.com.passebackend.club.ClubRepository;
import br.com.passebackend.player.PlayerRepository;
import br.com.passebackend.player.PlayerService;
import br.com.passebackend.player.dto.PlayerRequestDTO;
import br.com.passebackend.player.enums.PlayerPosition;
import static org.assertj.core.api.Assertions.*;

/** Real MySQL application schema. Every business write is rolled back by Spring Test. */
@SpringBootTest(properties = "spring.jpa.hibernate.ddl-auto=none")
@Transactional
class AuditPersistenceTests {
    @DynamicPropertySource
    static void applicationDatabase(DynamicPropertyRegistry properties) {
        // Compose's tools service provides TEST_DB_URL with the container hostname.
        String url = System.getenv("DB_URL");
        if (url == null) url = System.getenv("TEST_DB_URL");
        if (url == null) url = "jdbc:mysql://localhost:3307/passedb";
        final String applicationUrl = url.replace("/passedb_test", "/passedb");
        properties.add("spring.datasource.url", () -> applicationUrl);
        properties.add("spring.datasource.username", () -> System.getenv().getOrDefault("DB_USERNAME", "passe_app"));
        properties.add("spring.datasource.password", () -> System.getenv().getOrDefault("DB_PASSWORD", "passe_app_local"));
        properties.add("spring.datasource.hikari.read-only", () -> false);
    }
    @Autowired PlayerService service;
    @Autowired PlayerRepository players;
    @Autowired ClubRepository clubs;
    @Autowired JdbcTemplate jdbc;

    @Test void playerPersistenceUpdateAndLogicalDeletion() {
        PlayerRequestDTO r=new PlayerRequestDTO();
        r.setName("Auditoria Jogador"); r.setPosition(PlayerPosition.MIDFIELDER);
        r.setAgility(85); r.setAge(25); r.setPace(70); r.setShooting(68);
        r.setPassing(82); r.setDribbling(79); r.setDefending(55); r.setPhysical(64); r.setPotential(86);
        var created=service.createPlayer(r); players.flush();
        assertThat(jdbc.queryForObject("SELECT valor_base FROM jogadores WHERE id=?",BigDecimal.class,created.getId()))
                .isEqualByComparingTo("40");
        r.setAge(33); r.setPosition(PlayerPosition.STRIKER); r.setPace(1);
        var updated=service.updatePlayer(created.getId(),r); players.flush();
        assertThat(updated.getBaseValue()).isEqualByComparingTo("40");
        assertThat(updated.getPace()).isEqualTo(70);
        service.deletePlayer(created.getId()); players.flush();
        assertThat(jdbc.queryForObject("SELECT excluido_em IS NOT NULL FROM jogadores WHERE id=?",Boolean.class,created.getId())).isTrue();
        assertThatThrownBy(()->service.getPlayerById(created.getId()))
                .isInstanceOf(br.com.passebackend.nucleo.exception.ResourceNotFoundException.class);
    }

    @Test void requiredSevenTablesExist() {
        var tables=jdbc.queryForList("SELECT table_name FROM information_schema.tables WHERE table_schema=DATABASE()",String.class);
        assertThat(tables).contains("jogadores","clubes","contratos","transacoes","escalacoes","partidas","duelos_partida");
    }

    private Club club(String name,String acronym) {
        Club c=new Club(); c.setName(name); c.setAcronym(acronym); c.setCash(new BigDecimal("300")); return c;
    }

    @Test void databaseNameUniquenessIgnoresCase() {
        String suffix=UUID.randomUUID().toString();
        clubs.saveAndFlush(club("Águias Auditoria "+suffix,"XQZ"));
        assertThatThrownBy(()->clubs.saveAndFlush(club("águias auditoria "+suffix,"XQY")))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test void databaseNameUniquenessPreservesAccents() {
        String suffix=UUID.randomUUID().toString();
        clubs.saveAndFlush(club("Águias Auditoria "+suffix,"XQZ"));
        assertThatCode(()->clubs.saveAndFlush(club("Aguias Auditoria "+suffix,"XQY"))).doesNotThrowAnyException();
    }

    @Test void databaseAcronymMustBeUnique() {
        String suffix=UUID.randomUUID().toString();
        clubs.saveAndFlush(club("Auditoria Primeiro "+suffix,"XQZ"));
        assertThatThrownBy(()->clubs.saveAndFlush(club("Auditoria Segundo "+suffix,"XQZ")))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test void migrationRejectsDuplicatesWithoutChangingRows() throws Exception {
        verifyMigration(true);
    }

    @Test void migrationPreservesDistinctAccentedNamesAndAddsUnique() throws Exception {
        verifyMigration(false);
    }

    private void verifyMigration(boolean duplicate) throws Exception {
        String table="clubes_mig_"+UUID.randomUUID().toString().replace("-", "");
        String script=java.nio.file.Files.readString(java.nio.file.Path.of("scripts", "001-clubes-nome-unico.sql"));
        String statements=script.lines().filter(line->!line.stripLeading().startsWith("--"))
                .collect(java.util.stream.Collectors.joining("\n")).replace("clubes",table);
        // Temporary tables belong only to this MySQL session; no application rows are changed.
        jdbc.execute((org.springframework.jdbc.core.ConnectionCallback<Void>) connection -> {
            try (var statement=connection.createStatement()) {
                statement.execute("CREATE TEMPORARY TABLE "+table+" (nome VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL)");
                try (var insert=connection.prepareStatement("INSERT INTO "+table+" (nome) VALUES (?), (?)")) {
                    insert.setString(1,"Águias FC");
                    insert.setString(2,duplicate?"águias fc":"Aguias FC");
                    insert.executeUpdate();
                }
                org.assertj.core.api.ThrowableAssert.ThrowingCallable migrate=()-> {
                    for (String sql : statements.split(";")) {
                        if (!sql.isBlank()) statement.execute(sql);
                    }
                };
                if (duplicate) {
                    assertThatThrownBy(migrate).isInstanceOf(java.sql.SQLException.class)
                            .hasMessageContaining("Duplicate entry");
                } else {
                    assertThatCode(migrate).doesNotThrowAnyException();
                    assertThatThrownBy(()->statement.execute("INSERT INTO "+table+" (nome) VALUES ('águias fc')"))
                            .isInstanceOf(java.sql.SQLException.class).hasMessageContaining("Duplicate entry");
                }
                try (var rows=statement.executeQuery("SELECT COUNT(*) FROM "+table)) {
                    rows.next(); assertThat(rows.getInt(1)).isEqualTo(2);
                }
            }
            return null;
        });
    }
}
