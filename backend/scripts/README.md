# Banco do Passe

MySQL 8.0.46, utf8mb4/utf8mb4_0900_as_ci. Sem dados de exemplo automáticos.

| Arquivo | Uso |
|---|---|
| docker-init.sh | Em volume novo: cria passedb_test/usuário de leitura e aplica 000/002 em passedb |
| docker-test-init.sh | No servidor exclusivo tests-db: aplica 000/002 somente em passedb_test |
| 000-core-schema.sql | Cria clubes e jogadores com datas TIMESTAMP e unicidade de clube |
| 001-clubes-nome-unico.sql | Revisão aditiva de unicidade/collation em clubes legados; recusa duplicados, não apaga dados |
| 002-entidades-restantes.sql | Cria as cinco tabelas restantes, FKs, PKs, UNIQUE e CHECKs |
| recreate-database.sh | Apaga/recria passedb do container somente com --confirm-reset-passedb |
| create-databases.sql | Alternativa histórica de criação local; não é o bootstrap padrão |

Criação e recriação completas: seção 6 do README da raiz. O Compose monta esta
pasta em /opt/passe-sql no serviço db. A aplicação usa ddl-auto=none.
CREATE TABLE IF NOT EXISTS preserva tabelas já existentes; não valida nem migra
automaticamente divergências. Não execute alterações de esquema junto com testes.

Para corrigir apenas a unicidade de nome em um banco legado, primeiro inspecione
os dados. Na raiz, Ubuntu:

```sh
docker compose exec -T db sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql --default-character-set=utf8mb4 --user="$MYSQL_USER" "$MYSQL_DATABASE"' < backend/scripts/001-clubes-nome-unico.sql
```

No PowerShell, envie o mesmo SQL pelo stdin usando Get-Content -Encoding UTF8.
As credenciais são as do ambiente do container. Não use --force para ignorar
erros. O script mostra duplicados e o ALTER é atômico; duplicados impedem a alteração.

Em dados legados, DATETIME(6) e TIMESTAMP têm semânticas diferentes: DATETIME
não converte por fuso; TIMESTAMP converte pela sessão. Não há conversão automática
de dados antigos. O banco novo usa TIMESTAMP e a sessão JDBC fixa -03:00. Para
testar criação/recriação sem afetar o banco atual, use compose.backend-audit.yaml.

O banco normal usa volume nomeado. Iniciar/encerrar a API não executa scripts
destrutivos; stop/restart/down sem -v preservam os registros. O script
recreate-database.sh é uma operação destrutiva manual para o roteiro de recriação,
nunca faz parte da inicialização normal. Não use down -v para reiniciar.

Os testes usam um segundo servidor MySQL, tests-db, banco passedb_test e porta
13308, com credenciais exclusivas. Seu tmpfs é descartável. Para zerar apenas os
testes, pare tests-db e inicie-o novamente; veja os comandos no README principal.
