-- ERRO-004 / RN10. Executar conectado ao banco da aplicacao, em MySQL 8.
-- Nao remove nem atualiza registros. A consulta abaixo mostra duplicados
-- segundo a comparacao alvo, antes de qualquer ALTER TABLE.
-- Havendo duplicados, o ALTER atomico falha e preserva dados/estrutura.
-- Nesse caso, revisar os registros manualmente; nao usar mysql --force.
SET NAMES utf8mb4;

SELECT nome COLLATE utf8mb4_0900_as_ci AS nome_repetido, COUNT(*) AS quantidade
FROM clubes
GROUP BY nome COLLATE utf8mb4_0900_as_ci
HAVING COUNT(*) > 1;

-- Reconhece qualquer UNIQUE simples existente em nome, inclusive o do JPA.
SET @passe_nome_unique = (
    SELECT COUNT(*)
    FROM (
        SELECT index_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = 'clubes' AND non_unique = 0
        GROUP BY index_name
        HAVING COUNT(*) = 1 AND MAX(column_name) = 'nome' AND MAX(sub_part) IS NULL
    ) AS indices_nome
);

-- Collation e UNIQUE na mesma instrucao: a restricao continua protegendo os
-- dados mesmo se uma insercao concorrente ocorrer depois da consulta acima.
SET @passe_nome_sql = IF(@passe_nome_unique > 0,
    'ALTER TABLE clubes MODIFY COLUMN nome VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL',
    'ALTER TABLE clubes MODIFY COLUMN nome VARCHAR(60) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_as_ci NOT NULL, ADD CONSTRAINT uk_clubes_nome UNIQUE (nome)'
);
PREPARE passe_nome_statement FROM @passe_nome_sql;
EXECUTE passe_nome_statement;
DEALLOCATE PREPARE passe_nome_statement;
