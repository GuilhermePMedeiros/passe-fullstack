-- Apply after jogadores and clubes exist. Additive; never removes existing data.
-- Existing tables are preserved; schema differences must be inspected separately.

CREATE TABLE IF NOT EXISTS contratos (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    jogador_id INT NOT NULL,
    clube_id INT NOT NULL,
    valor_compra DECIMAL(6,2) NOT NULL,
    fidelidade_ate TIMESTAMP NOT NULL,
    situacao VARCHAR(12) NOT NULL,
    iniciado_em TIMESTAMP NOT NULL,
    encerrado_em TIMESTAMP NULL,
    CONSTRAINT fk_contratos_jogador_id FOREIGN KEY (jogador_id) REFERENCES jogadores(id),
    CONSTRAINT fk_contratos_clube_id FOREIGN KEY (clube_id) REFERENCES clubes(id),
    CONSTRAINT ck_contratos CHECK (situacao IN ('ATIVO','ENCERRADO','RESCINDIDO'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transacoes (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    clube_id INT NOT NULL,
    jogador_id INT NOT NULL,
    nome_jogador VARCHAR(100) NOT NULL,
    tipo VARCHAR(6) NOT NULL,
    valor DECIMAL(6,2) NOT NULL,
    taxa DECIMAL(6,2) NOT NULL,
    multa DECIMAL(6,2) NOT NULL,
    lucro DECIMAL(7,2) NULL,
    variacao_caixa DECIMAL(8,2) NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    CONSTRAINT fk_transacoes_clube_id FOREIGN KEY (clube_id) REFERENCES clubes(id),
    CONSTRAINT fk_transacoes_jogador_id FOREIGN KEY (jogador_id) REFERENCES jogadores(id),
    CONSTRAINT ck_transacoes CHECK (tipo IN ('COMPRA','VENDA'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS escalacoes (
    clube_id INT NOT NULL,
    jogador_id INT NOT NULL,
    criado_em TIMESTAMP NOT NULL,
    PRIMARY KEY (clube_id, jogador_id),
    CONSTRAINT uk_escalacoes_jogador UNIQUE (jogador_id),
    CONSTRAINT fk_escalacoes_clube_id FOREIGN KEY (clube_id) REFERENCES clubes(id),
    CONSTRAINT fk_escalacoes_jogador_id FOREIGN KEY (jogador_id) REFERENCES jogadores(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS partidas (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    mandante_id INT NOT NULL,
    visitante_id INT NOT NULL,
    gols_mandante INT NOT NULL,
    gols_visitante INT NOT NULL,
    formacao_mandante VARCHAR(5) NOT NULL,
    formacao_visitante VARCHAR(5) NOT NULL,
    jogada_em TIMESTAMP NOT NULL,
    CONSTRAINT fk_partidas_mandante_id FOREIGN KEY (mandante_id) REFERENCES clubes(id),
    CONSTRAINT fk_partidas_visitante_id FOREIGN KEY (visitante_id) REFERENCES clubes(id),
    CONSTRAINT ck_partidas CHECK (mandante_id <> visitante_id AND gols_mandante BETWEEN 0 AND 3 AND gols_visitante BETWEEN 0 AND 3 AND formacao_mandante IN ('3-1','2-2','2-1-1','1-2-1') AND formacao_visitante IN ('3-1','2-2','2-1-1','1-2-1'))
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS duelos_partida (
    id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    partida_id INT NOT NULL,
    ordem INT NOT NULL,
    clube_atacante_id INT NOT NULL,
    atacante_id INT NOT NULL,
    defensor_id INT NOT NULL,
    nome_atacante VARCHAR(100) NOT NULL,
    nome_defensor VARCHAR(100) NOT NULL,
    posicao_atacante VARCHAR(3) NOT NULL,
    posicao_defensor VARCHAR(3) NOT NULL,
    condicao_atacante VARCHAR(20) NOT NULL,
    condicao_defensor VARCHAR(20) NOT NULL,
    atributo_ataque VARCHAR(10) NOT NULL,
    atributo_defesa VARCHAR(10) NOT NULL,
    valor_ataque INT NOT NULL,
    valor_defesa INT NOT NULL,
    gol BOOLEAN NOT NULL,
    CONSTRAINT uk_duelos_partida_ordem UNIQUE (partida_id, ordem),
    CONSTRAINT fk_duelos_partida_partida_id FOREIGN KEY (partida_id) REFERENCES partidas(id),
    CONSTRAINT fk_duelos_partida_clube_atacante_id FOREIGN KEY (clube_atacante_id) REFERENCES clubes(id),
    CONSTRAINT fk_duelos_partida_atacante_id FOREIGN KEY (atacante_id) REFERENCES jogadores(id),
    CONSTRAINT fk_duelos_partida_defensor_id FOREIGN KEY (defensor_id) REFERENCES jogadores(id),
    CONSTRAINT ck_duelos_partida CHECK (ordem BETWEEN 1 AND 6 AND posicao_atacante IN ('GOL','ZAG','LAT','MEI','ATA') AND posicao_defensor IN ('GOL','ZAG','LAT','MEI','ATA') AND condicao_atacante IN ('APTO','MAL_CONDICIONADO') AND condicao_defensor IN ('APTO','MAL_CONDICIONADO') AND atributo_ataque IN ('shooting','passing','dribbling','defending') AND atributo_defesa IN ('shooting','passing','dribbling','defending'))
) ENGINE=InnoDB;
