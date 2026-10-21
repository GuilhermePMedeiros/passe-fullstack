-- Bootstrap for a new application schema. Existing tables are not migrated.
SET NAMES utf8mb4;
CREATE TABLE IF NOT EXISTS clubes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL,
    sigla CHAR(3) NOT NULL,
    caixa DECIMAL(10,2) NOT NULL DEFAULT 300.00,
    formacao VARCHAR(5) NULL,
    criado_em TIMESTAMP NOT NULL,
    CONSTRAINT uk_clubes_nome UNIQUE (nome),
    CONSTRAINT uk_clubes_sigla UNIQUE (sigla)
) ENGINE=InnoDB;
CREATE TABLE IF NOT EXISTS jogadores (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    posicao VARCHAR(3) NOT NULL,
    agilidade INT NOT NULL,
    idade INT NOT NULL,
    valor_base DECIMAL(6,2) NOT NULL,
    condicao VARCHAR(20) NOT NULL,
    clube_id INT NULL,
    velocidade INT NOT NULL,
    finalizacao INT NOT NULL,
    passe INT NOT NULL,
    drible INT NOT NULL,
    defesa INT NOT NULL,
    fisico INT NOT NULL,
    potencial INT NOT NULL,
    excluido_em TIMESTAMP NULL,
    criado_em TIMESTAMP NOT NULL,
    atualizado_em TIMESTAMP NOT NULL,
    CONSTRAINT fk_jogadores_clube_id FOREIGN KEY (clube_id) REFERENCES clubes(id)
) ENGINE=InnoDB;
