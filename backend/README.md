# PasseBackend

API REST Java 21, Spring Boot 3.5.16, Maven 3.10.0 e MySQL 8.0.46.
Gerencia jogadores e clubes, compra/venda com contratos, histórico financeiro/CSV,
escalações, partidas e classificação. A API concentra validações e cálculos;
o frontend recebe os resultados sem precisar reproduzir as regras de negócio.

## 1. Pré-requisitos e execução

Docker Engine e Compose v2.20+, com containers Linux,
internet e portas 3307/8080/5173 livres. Na raiz, execute os passos completos do
[README principal](../README.md), com criação inicial e persistência automáticas.
Não é necessário Java/Maven no host quando usar Docker.
Para clonar e selecionar a branch da implementação, siga a
[instalação rápida](../README.md#2-instalação-rápida). Execute os comandos Compose
deste documento sempre na raiz do repositório.

```sh
docker compose up --build -d
```

Origem da API: http://localhost:8080. Prefixo /api/v1. A raiz / retorna 404.
Consulta de disponibilidade: http://localhost:8080/api/v1/players.
Pelo proxy do frontend: http://localhost:5173/api/v1/players.
Não há página Swagger/OpenAPI; os contratos são descritos na seção 4.

Para aguardar a disponibilidade e conferir o status, na raiz:

```sh
docker compose up -d --wait --wait-timeout 300
docker compose ps
docker compose logs --tail 100 backend db
```

### Desenvolvimento Java local

Requer Java 21; o Maven Wrapper versionado utiliza Maven 3.10.0. Na raiz, pare
o backend Docker para liberar a porta 8080 e suba o banco:

```sh
docker compose stop backend
docker compose up -d --wait --wait-timeout 180 db
```

Importe `backend/pom.xml` na IDE e execute `PasseBackendApplication`, ou, em
um terminal Linux a partir da raiz:

```sh
cd backend
sh ./mvnw -B -ntp spring-boot:run
```

No PowerShell, use .\mvnw.cmd -B -ntp spring-boot:run. Os scripts iniciar.sh e
iniciar.ps1 são alternativas para carregar .env local; Spring/STS não o leem
automaticamente. Os padrões da aplicação correspondem ao Compose local.

## 2. Banco e configurações

O bootstrap versionado cria sete tabelas vazias. O passo a passo e os comandos
de recriação estão na seção 6 do README principal. scripts/README.md descreve
cada arquivo. Não use recriação para corrigir credenciais ou preservar dados.

| Tabela | Responsabilidade |
|---|---|
| jogadores | Identidade, atributos, valor base, condição e vínculo atual |
| clubes | Nome/sigla, caixa e formação escolhida |
| contratos | Valor de compra, fidelidade, situação e datas de encerramento |
| transacoes | Compra/venda, taxas, multas, lucro e variação do caixa |
| escalacoes | Titulares de cada clube; PK composta clube_id/jogador_id |
| partidas | Clubes, formações, placar e data do jogo |
| duelos_partida | Seis duelos e seus snapshots de jogadores, atributos e gol |

Hibernate usa ddl-auto=none; nenhum banco legado é convertido automaticamente.
000-core-schema.sql e 002-entidades-restantes.sql criam as tabelas novas;
recreate-database.sh recria passedb somente após confirmação explícita.
MySQL 8 tem utf8mb4_0900_as_ci; nome/sigla de clube e jogador em uma escalação
têm UNIQUE. Lineup tem PK composta clube_id/jogador_id. Moedas são DECIMAL;
datas novas são TIMESTAMP. Campos calculados dinâmicos não são persistidos.
O nome do clube é único sem diferenciar caixa, preservando diferenças de acento.
As chaves estrangeiras mantêm os vínculos entre as sete tabelas.

### Persistência e recriação

A imagem MySQL e `scripts/docker-init.sh` preparam um volume novo, aplicando os
scripts SQL versionados. O banco começa sem registros de negócio. As inicializações
seguintes reutilizam o volume `mysql_data`; iniciar ou encerrar a API não executa
limpeza. `docker compose stop`, `restart` e `down` sem `-v` preservam os dados.

Somente para descartar os registros de `passedb` no ambiente selecionado, na raiz:

```sh
docker compose stop backend
docker compose exec -T db bash /opt/passe-sql/recreate-database.sh --confirm-reset-passedb
docker compose up -d --wait --wait-timeout 300 backend
```

Essa operação **apaga os dados e recria as sete tabelas vazias**. Não é parte do
início normal e não deve ser usada para resolver configuração de credenciais.
Nunca use `down -v` como procedimento cotidiano de reinicialização.

### Configuração

DB_URL, DB_USERNAME, DB_PASSWORD, TEST_DB_URL, TEST_DB_USERNAME,
TEST_DB_PASSWORD e CORS_ORIGIN estão descritos na seção 7 do README principal
e nos .env.example versionados. Padrões locais são fictícios; nunca grave
credenciais reais. A sessão JDBC fixa time_zone=-03:00 e CORS libera uma origem.
open-in-view=false mantém acesso ao banco na camada de serviço.

| Configuração | Efeito |
|---|---|
| DB_URL / DB_USERNAME / DB_PASSWORD | Conexão do backend; Compose usa db:3306/passedb |
| TEST_DB_URL / TEST_DB_USERNAME / TEST_DB_PASSWORD | Conexão exclusiva com passedb_test no servidor tests-db |
| CORS_ORIGIN | Origem HTTP permitida; padrão http://localhost:5173 |
| MYSQL_PORT / BACKEND_PORT / TEST_MYSQL_PORT | Portas do host no Compose: 3307 / 8080 / 13308 |
| spring.jpa.hibernate.ddl-auto=none | Hibernate não cria nem altera o schema |
| spring.sql.init.mode=never | Spring não executa outro mecanismo de inicialização SQL |
| spring.datasource.hikari.connection-init-sql | Define a sessão MySQL em -03:00 |
| spring.jpa.open-in-view=false | Evita acesso JPA dependente da serialização HTTP |

As variáveis de porta pertencem ao Compose. As URLs de banco são fixadas nos
serviços Docker; seus valores externos são usados no Java local. Alterar variáveis
de credenciais não modifica usuários já criados em um volume existente.

Todos os testes usam passedb_test em servidor tests-db separado (host:13308).
O perfil test mantém conexões somente leitura para os testes de infraestrutura;
integrações de negócio usam conexões de escrita apenas nesse banco de testes.
O helper ignora credenciais/URL normais e recusa schema diferente de passedb_test.
Nenhum teste de negócio deve apontar para passedb.

## 3. Testes

Na raiz, com a porta 13308 livre:

```sh
docker compose --profile tools build tests
docker compose --profile tools up -d --wait --wait-timeout 180 tests-db
docker compose --profile tools run --rm tests
```

No backend local com tests-db do Compose em execução:

```sh
sh ./mvnw -B -ntp verify
```

No Windows: .\mvnw.cmd -B -ntp verify. Os comandos compilam, executam os testes
e empacotam; terminam sozinhos e propagam falhas. Há testes de valor
de mercado, overall, validação HTTP, consultas, persistência, Unicode,
mercado/CSV, contratos, fronteiras, formação, duelos, classificação e rollback.
Relatórios: target/surefire-reports local, docs/evidencias/mysql pelo Compose;
ambos ignorados pelo Git. Não somar execuções repetidas como testes distintos.

### Resultado verificado

No ensaio de 21/10/2026 em Windows/Docker Desktop/WSL2, os comandos Docker acima
executaram **484 testes, com zero falhas, erros ou testes ignorados**. O comando
final foi `docker compose --profile tools run --rm tests`, cuja imagem executa
`mvn -B -ntp verify`, sem modo de observação. Há casos positivos, negativos e de
fronteira, incluindo cálculo de valor de mercado, dinheiro/arredondamento,
contratos, rollback, concorrência, schema e respostas HTTP.

As integrações de negócio usam apenas `TEST_DB_*` e o schema `passedb_test`.
O servidor `tests-db` é separado, com armazenamento tmpfs descartável; o banco
normal permaneceu intacto no ensaio. O perfil `test` mantém leitura nas conexões
de infraestrutura; as integrações de escrita usam conexões próprias no mesmo
schema isolado. Nenhum comando de teste deve apontar para o banco normal.

O ambiente separado compose.backend-audit.yaml usa
MySQL com volume nomeado na porta 13307, API na 18080 e tests-db descartável na
13308. Não altera passedb do projeto normal. O banco é criado por scripts,
não por testes nem por Hibernate. Encerrar/iniciar a API, reiniciar os containers
ou executar down sem -v preserva o banco normal. Nunca use down -v para reiniciar.

Para recriar somente os testes: na raiz, execute
`docker compose --profile tools stop tests-db` e depois
`docker compose --profile tools up -d --wait --wait-timeout 180 tests-db`.
A recriação perde apenas o tmpfs do servidor de testes. Não a execute durante uma suíte.

## 4. Endpoints

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

### Validações e tratamento de exceções

Conversores verificam presença/tipo dos campos e os services validam as regras.
Não há coerção de texto ou booleano para número. Jogadores exigem idade 16–45,
agilidade 1–100 e indicadores 1–99; nomes normalizados devem conter pelo menos
duas palavras com letras. Clubes validam nome, sigla de três letras maiúsculas e
unicidade. IDs inválidos na URL são tratados como recurso inexistente.

| Status | Uso |
|---|---|
| 400 | Corpo/query inválidos, tipos/faixas incorretos ou combinação de filtros recusada |
| 404 | Recurso ausente, excluído ou ID inválido na URL |
| 409 | Conflito de negócio ou unicidade |
| 500 | Falha inesperada, com mensagem sanitizada |

As recusas retornam um objeto JSON com `message` não vazio. Exemplo de formato:

```json
{"message": "Recurso não encontrado."}
```

Os controllers mantêm `try/catch` explícito para `IllegalArgumentException`,
`ResourceNotFoundException` e `BusinessConflictException`, conforme a operação.
`BaseController.error` padroniza o corpo. A classificação é feita nos controllers,
sem `@ExceptionHandler` ou Advice; `ApiErrorAttributes` apenas sanitiza o retorno
padrão de falhas 500. Erros de banco inesperados não são convertidos genericamente
em conflitos. Respostas não expõem stack trace ou classe da exceção.

## 5. Arquitetura e bibliotecas

Domínios player, club, contract, transaction, market, lineup e match têm entidades,
repositories e, quando necessários, services/controllers/DTOs/conversores.
ObjectBase fornece id simples; Lineup usa LineupId próprio. BaseController
centraliza respostas e parsing; os controllers tratam exceções por try/catch
explícito, sem @ExceptionHandler ou @RestControllerAdvice.
ApiErrorAttributes sanitiza falhas 500 sem esconder erros de banco como 409.
Controllers não fazem cálculos financeiros ou acesso direto ao banco.

Spring Web fornece HTTP; Jackson, JSON e DTOs snake_case; Spring Data JPA e
Hibernate, ORM/transações; Validation, constraints; Connector/J, MySQL;
Spring Boot Test inclui JUnit, Mockito, AssertJ e MockMvc. São dependências do
pom.xml ou transitivas da stack, sem novas bibliotecas financeiras.

### Camadas e dependências

| Componente | Responsabilidade |
|---|---|
| Controllers | HTTP, parâmetros, conversão inicial e respostas |
| Conversores e DTOs | Contratos de entrada/saída e checagem dos tipos JSON |
| Services | Regras, cálculos, transações e coordenação dos domínios |
| Repositories | Consultas JPA e bloqueios de persistência |
| Entidades/enums | Modelo, relacionamentos e estados do domínio |
| nucleo e config | Respostas comuns, utilitários, CORS, prefixo, logs e erros 500 |

Dependências diretas do POM: `spring-boot-starter-web` para MVC/HTTP/Jackson;
`spring-boot-starter-data-jpa` para ORM, repositories e transações;
`spring-boot-starter-validation` para constraints; `mysql-connector-j` para o
driver MySQL; `spring-boot-starter-test` para testes. SLF4J/Logback vêm do Spring
Boot e fornecem o registro de logs. Versões transitivas são gerenciadas pelo
parent Spring Boot 3.5.16; não há biblioteca adicional de cálculo financeiro.

### Logs por requisição

RequestLogFilter registra cada requisição uma vez por meio de
`LogUtils.request(method, path, status)`, usando SLF4J/Logback fornecidos pelo
Spring Boot. A saída do backend inclui uma linha como:

```text
2026-10-21T17:00:00-03:00 GET /api/v1/players 200
```

O logger acrescenta seu prefixo padrão. Data e hora usam Brasília explicitamente.
O registro inclui o status final, inclusive recusas e falhas 500; o despacho
interno para `/error` não gera outro registro. Corpo, query string e cabeçalhos
não são registrados. Os controllers mantêm seus try/catch.
Para conferir com os serviços em execução, na raiz, faça uma requisição pelo
proxy e consulte o log do backend, sem precisar instalar um cliente HTTP no host:

```sh
docker compose exec -T frontend wget -q -O - http://127.0.0.1/api/v1/players
docker compose logs --tail 100 backend
```

## 6. Decisões e premissas

### Regras de negócio e transações

- Clubes começam com caixa 300,00; limite de 20 clubes e elenco de 12 jogadores.
- Compra exige jogador livre e custo total de até 50% do caixa. Fidelidade deve
  ser futura e de no máximo 1.095 dias; valor, taxa, vínculo, contrato e histórico
  são gravados na mesma transação. Clube não recompra jogador que já vendeu.
- Venda usa valor de mercado atual, custo histórico, multa e comissão progressiva
  sobre lucro positivo; encerra o contrato e atualiza jogador, caixa e histórico
  atomicamente. Dias restantes de fidelidade são arredondados para cima.
- Escalação exige cinco titulares elegíveis do próprio elenco e distribuição
  compatível com a formação. Jogador DOENTE não participa e sai da escalação;
  sua recuperação não o reinsere automaticamente.
- Partidas exigem escalações completas de clubes distintos. Placar e seis duelos
  são persistidos juntos. A classificação é calculada por pontos, saldo, gols
  marcados, nome normalizado e id, nessa ordem de desempate.

Dinheiro usa BigDecimal/HALF_UP e uma fórmula por regra. Mercado/overall,
patrimônio, dias/multa e classificação são calculados nas consultas. Contratos,
transações e duelos mantêm os valores do momento. Compra, venda, escalação,
partida e condição DOENTE executam suas gravações numa transação única.
Bloqueios seguem jogador antes de clube e ids crescentes, com reconferência.

Nomes são ordenados por Unicode NFD sem Mn, caixa ignorada, pontos de código,
depois id. Datas usam Brasília explicitamente; cálculos usam instante exato,
saídas têm segundos. TIMESTAMP tem precisão de segundos. A validação de nomes
conta sequências com letras como palavras. Mensagens são livres
em português. Contrato ausente em dado legado não é fabricado; venda inconsistente
é 409. Detalhes dos contratos HTTP e decisões estão no README raiz.

## 7. Funcionalidades não implementadas e limites

Os módulos Java descritos estão implementados; Swagger/OpenAPI e comandos de
lint/formatação do backend permanecem ausentes. A interface React ainda não tem
telas de negócio. Testes automatizados e logs por requisição estão implementados.
Não houve ensaio completo em instalação limpa de Ubuntu, macOS ou Linux ARM64.

### Recursos operacionais verificados

Testes automatizados e logs por requisição estão implementados e possuem comandos
neste documento. O Compose inicializa os três serviços; no ensaio sem cache de
21/10/2026, eles ficaram saudáveis em 4 min 07 s, em daemon Linux AMD64 isolado
sob Windows/Docker Desktop/WSL2, inicialmente sem imagens e com cache de build
0 B. Essa duração é de instalação, não da suíte nem da preparação do Docker;
varia conforme máquina e rede. Detalhes na
[validação de instalação](../README.md#validação-de-instalação).

Essa evidência comprova a infraestrutura e o transporte HTTP. A lista funcional
de jogadores ainda não existe na interface; iniciar os três containers não
comprova a experiência completa do frontend. Não há documentação interativa
Swagger/OpenAPI para apontar por URL.

## 8. Uso de inteligência artificial

OpenAI Codex apoiou implementação/auditoria dos módulos, testes em src/test,
configuração, Docker/SQL e README para conferir regras e reduzir lacunas.
Foram aceitos DTOs, cálculos únicos, transações e testes com MySQL real;
ajustados contratos HTTP, erros centrais, Unicode, bootstrap e fuso explícito.
Foram descartados Boot 4, H2 na aplicação, abstrações adicionais de identidade,
reescritas estéticas e extras sem necessidade. A revisão final cabe aos mantenedores.
Na atualização documental foram confrontados comandos, endpoints e DTOs com os
arquivos reais, e o resultado de 247 segundos/484 testes com os registros do ensaio.
Não foram alteradas configurações ou fontes para adaptar a documentação.
Declaração completa e decisões na seção 12 do README principal.
