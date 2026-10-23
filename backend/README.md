# PasseBackend

API REST com Java 21, Spring Boot 3.5.16, Maven 3.10.0 e MySQL 8.0.46.
Implementa jogadores, clubes, mercado com contratos, histórico financeiro/CSV,
escalações, partidas e classificação.

## Instalação e execução

Siga o [README principal](../README.md#instalação-e-execução-do-zero) para clonar
a `main` e iniciar interface, API e banco. Requer Docker com containers Linux,
Compose v2.20+ e portas 3307, 8080 e 5173 livres. Não exige Java/Maven no host.
Comandos Compose são executados na raiz:

```sh
docker compose up --build -d --wait --wait-timeout 300
```

Origem da API: **http://localhost:8080**. Prefixo: `/api/v1`.
Consulta de disponibilidade: http://localhost:8080/api/v1/players.
A raiz `/` retorna 404. Não há Swagger/OpenAPI.

### Alternativa: Java local

Requer Java 21; o Maven Wrapper versionado baixa Maven 3.10.0.
Na raiz, use somente o MySQL Docker e libere a porta do backend:

```sh
docker compose stop backend
docker compose up -d --wait --wait-timeout 180 db
cd backend
sh ./mvnw -B -ntp spring-boot:run
```

No PowerShell, use `.\mvnw.cmd -B -ntp spring-boot:run`. Encerre com Ctrl+C.
Os padrões de conexão correspondem ao Compose. Spring não carrega `.env`
automaticamente; configurações personalizadas devem ser exportadas no terminal.
Para retornar ao backend Docker, encerre o Java local e execute o comando
integrado na raiz.

## Banco e variáveis de ambiente

Criação vazia, persistência, recriação e todas as variáveis estão no
[README principal](../README.md#banco-de-dados-criação-persistência-e-recriação).
Os exemplos estão em [backend/.env.example](.env.example) e
[.env.example da raiz](../.env.example).

- `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`: conexão da aplicação; localmente,
  `jdbc:mysql://localhost:3307/passedb`, com usuário/senha fictícios do exemplo.
- `TEST_DB_URL`, `TEST_DB_USERNAME`, `TEST_DB_PASSWORD`: conexão exclusiva de
  testes; localmente, `jdbc:mysql://localhost:13308/passedb_test`.
- `CORS_ORIGIN`: única origem liberada, padrão `http://localhost:5173`.
- `MYSQL_ROOT_PASSWORD`, `MYSQL_PORT`, `BACKEND_PORT`, `FRONTEND_PORT` e
  `TEST_MYSQL_PORT`: configuração do Compose, detalhada na raiz.

No Docker, os endereços JDBC são fixados no Compose para os serviços `db` e
`tests-db`. Alterar credenciais no ambiente não altera usuários de volumes
existentes. Hibernate não modifica o schema (`ddl-auto=none`), e a inicialização
SQL do Spring está desativada. Os scripts versionados criam as tabelas:

| Tabela | Responsabilidade |
| --- | --- |
| `jogadores` | Cadastro, atributos, condição e vínculo atual |
| `clubes` | Nome, sigla, caixa e formação |
| `contratos` | Compra, fidelidade e situação contratual |
| `transacoes` | Valores históricos de compra e venda |
| `escalacoes` | Titulares; PK composta clube/jogador |
| `partidas` | Clubes, formações, placar e data |
| `duelos_partida` | Seis duelos com snapshots |

Moedas usam DECIMAL e datas novas usam TIMESTAMP. Chaves estrangeiras preservam
vínculos; nome/sigla de clube e jogador em escalação têm unicidade no banco.
O nome do clube ignora caixa e considera acentos (`utf8mb4_0900_as_ci`).

## Testes e build

Na raiz, com a porta 13308 livre:

```sh
docker compose --profile tools build tests
docker compose --profile tools up -d --wait --wait-timeout 180 tests-db
docker compose --profile tools run --rm tests
```

A imagem executa `mvn -B -ntp verify`, termina sozinha e propaga falhas.
Inclui testes de valor de mercado, overall, HTTP, persistência, concorrência,
rollback, contratos, CSV e liga. O servidor `tests-db` é separado e usa tmpfs;
não aponte testes para `passedb` nem rode suítes simultâneas no mesmo banco.
Relatórios Compose ficam em `docs/evidencias/mysql/`, ignorados pelo Git.

Com `tests-db` iniciado, alternativa na pasta `backend`:

```sh
sh ./mvnw -B -ntp verify
```

No PowerShell: `.\mvnw.cmd -B -ntp verify`. O comando também empacota o JAR;
relatórios locais ficam em `target/surefire-reports/`. Para recriar somente o
banco de testes, sem suíte em execução, na raiz:

```sh
docker compose --profile tools stop tests-db
docker compose --profile tools up -d --wait --wait-timeout 180 tests-db
```

## Endpoints

Todos abaixo têm prefixo /api/v1. Erros esperados: 400/404/409, JSON com message.

| Método | Caminho | Sucesso |
|---|---|---|
| GET | /players | 200, data/meta |
| GET | /players/{id} | 200, jogador |
| POST | /players | 201, jogador e Location |
| PUT | /players/{id} | 200, jogador |
| PATCH | /players/{id}/condition | 200, jogador |
| DELETE | /players/{id} | 204 sem corpo |
| GET | /clubs | 200, resumos |
| POST | /clubs | 201, clube e Location |
| GET | /clubs/{id} | 200, elenco e contratos |
| POST | /players/{id}/buy | 200, compra e caixa |
| POST | /players/{id}/sell | 200, venda e caixa |
| GET | /clubs/{id}/transactions | 200, data/summary |
| GET | /clubs/{id}/transactions/export | 200, text/csv UTF-8 sem BOM |
| PUT | /clubs/{id}/lineup | 200, escalação |
| GET | /clubs/{id}/lineup | 200, formação/complete/players |
| POST | /matches | 201, partida, seis duelos e Location |
| GET | /matches | 200, histórico sem duels |
| GET | /matches/{id} | 200, partida e seis duelos |
| GET | /standings | 200, classificação calculada |

### Filtros e paginação

`GET /players` aceita `search`, `position`, `condition`, `free`, `club_id`,
`min_age`, `max_age`, `min_value`, `max_value`, `sort`, `page` e `limit`.
O padrão é `page=1`, `limit=10`, `sort=name`; `limit` aceita 1 a 50.
Ordenações: `name`, `value_asc`, `value_desc`, `age_asc`, `age_desc` e `position`.
Até dois critérios podem ser separados por vírgula, sem repetir o mesmo grupo.
`free=true` junto de `club_id` é recusado. Filtros válidos podem ser combinados.

Clubes aceitam `sort=name`, `net_worth_asc` ou `net_worth_desc`.
Histórico financeiro e CSV aceitam `type=COMPRA,VENDA` e `player_id`;
partidas aceitam `club_id`. Históricos não usam a paginação de jogadores.

### DTOs e contratos JSON

Os DTOs usam nomes JSON em `snake_case`, definidos por Jackson e pelos conversores.
Valores monetários retornam como números JSON. Datas de entrada da fidelidade
usam `AAAA-MM-DDTHH:MM-03:00`; respostas temporais incluem segundos e offset.
Os exemplos a seguir documentam corpos de requisição; não inserem dados
automaticamente. IDs precisam corresponder aos recursos cadastrados pela API.

Cadastro (`POST /players`), com todos os indicadores obrigatórios:

```json
{
  "name": "Meia Lua",
  "position": "MEI",
  "agility": 85,
  "age": 25,
  "pace": 70,
  "shooting": 68,
  "passing": 82,
  "dribbling": 79,
  "defending": 55,
  "physical": 64,
  "potential": 86
}
```

`PUT /players/{id}` recebe `name`, `position`, `agility` e `age`.
Os atributos adicionais, valor base e campos calculados não são atualizados por
esse contrato. `PATCH /players/{id}/condition` recebe apenas a condição:

```json
{"condition": "MAL_CONDICIONADO"}
```

Demais corpos aceitos:

| Operação | Campos de entrada |
|---|---|
| POST /clubs | name, acronym |
| POST /players/{id}/buy | club_id, loyalty_until |
| POST /players/{id}/sell | Sem corpo obrigatório |
| PUT /clubs/{id}/lineup | formation, player_ids (cinco titulares) |
| POST /matches | home_club_id, away_club_id |

Formações: `3-1`, `2-2`, `2-1-1` e `1-2-1`; incluem sempre um goleiro além dos
quatro jogadores de linha indicados pela formação. Posições: `GOL`, `ZAG`, `LAT`,
`MEI`, `ATA`. Condições: `APTO`, `MAL_CONDICIONADO`, `DOENTE`.
Campos extras/controlados são ignorados. GET, DELETE e venda ignoram o corpo.

Principais respostas:

| Resposta | Conteúdo |
|---|---|
| Jogador | id, dados cadastrais, base_value, market_value, overall e vínculo |
| Lista de jogadores | data e meta com page, limit, total_items, total_pages |
| Clube detalhado | cash, squad_value, net_worth, players e contrato de cada jogador |
| Compra/venda | Valores da transação, club_cash e dados contratuais aplicáveis |
| Histórico financeiro | data e summary com total_spent, total_received, total_fees, total_penalties, total_profit |
| Escalação | club_id, formation, complete e players |
| Partida detalhada | Identificação, placar, formações, data e seis duels |

Exemplo da listagem em um banco sem jogadores:

```json
{
  "data": [],
  "meta": {"page": 1, "limit": 10, "total_items": 0, "total_pages": 0}
}
```

Criação de jogador, clube e partida retorna `201` com `Location`; exclusão retorna
`204` sem corpo. CSV retorna `text/csv`, UTF-8 sem BOM, separador `;`, decimais com
vírgula e quebras LF; filtros afetam tanto as linhas quanto os totais do histórico.

## Arquitetura e bibliotecas

Em `src/main/java/br/com/passebackend/`, os domínios `player`, `club`, `contract`,
`transaction`, `market`, `lineup` e `match` separam entidades, repositories,
services, controllers, DTOs e conversores conforme a necessidade.
`nucleo/` compartilha respostas, exceções e utilitários; `config/` configura
prefixo, CORS, logs e sanitização de erros. `src/test/` contém os testes e
`scripts/` contém a criação e recriação SQL.

| Dependência | Finalidade |
| --- | --- |
| `spring-boot-starter-web` | Spring MVC, HTTP e Jackson para JSON |
| `spring-boot-starter-data-jpa` | JPA/Hibernate, repositories e transações |
| `spring-boot-starter-validation` | Bean Validation |
| `mysql-connector-j` | Driver MySQL |
| `spring-boot-starter-test` | JUnit, Mockito, AssertJ e MockMvc |
| SLF4J/Logback, fornecidos pelo Spring Boot | Logs da aplicação e das requisições |

Versões são gerenciadas pelo parent do POM. Não há biblioteca financeira extra.
Após uma consulta, confira os logs na raiz:

```sh
docker compose exec -T frontend wget -q -O - http://127.0.0.1/api/v1/players
docker compose logs --tail 100 backend
```

`RequestLogFilter` registra uma linha por requisição via SLF4J/Logback, com data
e hora de Brasília, método, caminho e status. Não registra corpo ou credenciais.

## Decisões e premissas

Controllers tratam exceções por `try/catch` explícito; `BaseController` padroniza
as respostas e `ApiErrorAttributes` sanitiza falhas internas. Recusas usam JSON
com `message`: 400 para entrada inválida, 404 para recurso ausente/excluído ou
ID inválido na URL, 409 para conflito de negócio e 500 para falha inesperada.
Mensagens são em português; não há autenticação.

Cálculos monetários usam `BigDecimal/HALF_UP`. Datas usam Brasília (`-03:00`),
inclusive a sessão JDBC, com precisão de segundos na persistência. Transações,
contratos e duelos mantêm snapshots. Compra, venda, escalação, partida e alteração
que retira titular por doença são atômicas. Bloqueios seguem jogador antes de
clube e IDs crescentes. Contratos ausentes em dados legados não são fabricados;
venda inconsistente retorna 409. Ordenação de nomes usa Unicode NFD sem marcas
de acento, caixa ignorada, comparação por pontos de código e desempate por ID.

## Funcionalidades não implementadas

Não há Swagger/OpenAPI ou ferramentas de lint/formatação do backend.
Limitações gerais e declaração de [uso de inteligência artificial](../README.md#uso-de-inteligência-artificial)
estão no README principal e se aplicam a esta camada.
