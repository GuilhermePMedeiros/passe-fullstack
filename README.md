# Passe

O Passe é uma aplicação fullstack com Spring Boot, React e MySQL. Docker Compose
constrói e inicia os serviços integrados sem instalar Java, Maven, Node.js ou MySQL
no computador. O backend implementa jogadores, clubes, mercado, contratos, histórico
financeiro/CSV, escalações, partidas e classificação. A interface React possui
a tela inicial com resumo real da liga e a feature Jogadores integrada à API.
As telas de clubes, mercado e liga continuam pendentes.

### Funcionalidades implementadas no backend

- Jogadores: cadastro, consulta, edição, condição, exclusão lógica, filtros,
  ordenação e paginação; cálculo de overall e valor de mercado.
- Clubes: criação, listagem, elenco, caixa, valor do elenco e patrimônio.
- Mercado: compra e venda, fidelidade contratual, taxas, multas e comissões;
  histórico financeiro com totais filtrados e exportação CSV.
- Liga: escalações, partidas com seis duelos, histórico e classificação.
- Operação: transações atômicas, respostas de erro JSON, logs por requisição
  e testes automatizados com banco isolado.

## 1. Tecnologias e pré-requisitos

Docker Engine ou Docker Desktop com containers Linux e Docker Compose **v2.20+**,
em execução. Internet para imagens/dependências. Portas locais **5173**, **8080**
e **3307** livres; testes locais usam também **13308**.
Git é necessário somente para clonar o repositório.

| Componente | Versão |
|---|---|
| Backend | Java 21, Spring Boot 3.5.16, Maven 3.10.0 |
| Frontend | React 19.3.1, TypeScript 5.8.3, Vite 6.4.4, Node.js 22.14.0 no build |
| Banco | MySQL 8.0.46 |
| Servidor estático | Nginx 1.28 Alpine |

Containers Linux exercitados com Docker Desktop/WSL2 em Windows. O build e os testes
Java usam Ubuntu 24.04 Noble dentro do container. Não houve ensaio em instalação
limpa de Ubuntu, em macOS ou em Linux ARM64. O tempo inicial depende da rede e dos
recursos disponíveis; os scripts não exigem ferramentas específicas do host.

## 2. Instalação rápida

Clone o repositório e entre na pasta:

~~~sh
git clone https://github.com/GuilhermePMedeiros/passe-fullstack.git
cd passe-fullstack
~~~

A implementação descrita está na branch `dev`. Após clonar:

~~~sh
git switch dev
~~~

Na raiz `passe-fullstack`, inicie todos os serviços:

~~~sh
docker compose up --build -d
~~~

Não é necessário criar ou editar .env. Os padrões locais já estão configurados.
As imagens são construídas com este código e imagens públicas de terceiros.
O MySQL inicializa antes da API; o frontend aguarda a API responder. Para aguardar
a conclusão dos healthchecks e conferir os serviços:

~~~sh
docker compose up -d --wait --wait-timeout 300
docker compose ps
~~~

| Serviço | Endereço |
|---|---|
| Interface | http://localhost:5173 |
| Origem da API | http://localhost:8080 |
| API direta | http://localhost:8080/api/v1/players |
| API pelo proxy da interface | http://localhost:5173/api/v1/players |
| MySQL para ferramentas locais | localhost:3307, banco passedb |

Não há Swagger/OpenAPI disponível. Os 19 endpoints e seus contratos estão
documentados no [README do backend](backend/README.md#4-endpoints).

O navegador pode usar caminhos relativos /api/v1/.... O Nginx encaminha /api/ para
backend:8080 na rede Docker, preservando caminho e query string. Esse hostname
interno não é utilizado pelo navegador. A tela inicial consulta totais de
jogadores, livres, clubes e partidas e mostra o líder da classificação quando
há partidas. Navegação, testes e limites estão no [README do frontend](frontend/README.md).

### Validação de instalação

Em 21/10/2026, um ensaio em Windows com Docker Desktop/WSL2, utilizando um daemon
Linux AMD64 isolado, partiu sem imagens Docker e com cache de build de **0 B**.
Os três serviços ficaram saudáveis em **4 minutos e 7 segundos**. Foram verificadas
as sete tabelas, a disponibilidade da API, o proxy e os arquivos JavaScript/CSS do
frontend. A suíte executou **484 testes, sem falhas, erros ou testes ignorados**.
O tempo da suíte é separado do tempo de instalação.

A medição não inclui a instalação do Docker nem a preparação do daemon de ensaio.
Foram utilizados Docker 29.8.2 e Compose 5.6.0. O tempo varia com hardware, conexão
e ambiente; esse resultado não representa medição em Ubuntu 24.04 instalado no
host nem certificação de compatibilidade com todas as plataformas. A inicialização
dos serviços não comprova a conclusão das telas de negócio do frontend.

## 3. Criação do banco e persistência

Na primeira instalação, a imagem MySQL cria passedb e o usuário da aplicação.
backend/scripts/docker-init.sh aplica 000-core-schema.sql e
002-entidades-restantes.sql. São criadas sete tabelas vazias: jogadores, clubes,
contratos, transacoes, escalacoes, partidas e duelos_partida, com suas restrições.
Não há carga automática de exemplos. O banco de infraestrutura legado passedb_test
também é criado, mas as suítes usam um servidor de testes separado.

O volume nomeado mysql_data preserva os registros. Os scripts iniciais rodam somente
quando o volume está vazio. Hibernate usa ddl-auto=none e o Spring não executa
inicialização SQL adicional. Iniciar/encerrar a API não limpa registros. CREATE
TABLE IF NOT EXISTS não converte estruturas legadas divergentes: inspecione os dados
antes de aplicar uma migração. Detalhes em [scripts](backend/scripts/README.md).

## 4. Reiniciar e encerrar

Todos os comandos desta seção são executados na raiz. Para parar sem apagar dados:

~~~sh
docker compose stop
~~~

Para iniciar novamente e aguardar a disponibilidade:

~~~sh
docker compose up -d --wait --wait-timeout 300
~~~

Para reiniciar os containers existentes:

~~~sh
docker compose restart
~~~

Para encerrar e iniciar posteriormente, preservando o volume:

~~~sh
docker compose down
docker compose up -d --wait --wait-timeout 300
~~~

Para conferir status e logs:

~~~sh
docker compose ps
docker compose logs --tail 100 db backend frontend
~~~

`stop`, `restart` e `down` sem `-v` preservam o volume. **Não use down -v para reiniciar**:
essa opção remove volumes e apaga os bancos correspondentes.

## 5. Testes isolados

Na raiz:

~~~sh
docker compose --profile tools build tests
docker compose --profile tools up -d --wait --wait-timeout 180 tests-db
docker compose --profile tools run --rm tests
~~~

O comando termina sozinho e propaga falhas. Inclui cálculos, validações HTTP,
persistência, concorrência, contratos e partidas. tests-db é outro servidor MySQL,
com schema passedb_test e credenciais próprias. O helper das integrações de escrita
usa somente TEST_DB_* e recusa outro schema. Fixtures têm rollback ou limpeza dos
IDs próprios. Não execute suítes simultaneamente no mesmo servidor de testes.
Relatórios são gerados em docs/evidencias/mysql, ignorados pelo Git.
No ensaio de instalação descrito acima, `docker compose --profile tools run --rm tests`
concluiu os 484 testes com sucesso. Esse total é o resultado daquela versão;
não é um número fixado na configuração da suíte.

Para recriar somente o banco de testes, pare as suítes e execute:

~~~sh
docker compose --profile tools stop tests-db
docker compose --profile tools up -d --wait --wait-timeout 180 tests-db
~~~

tests-db usa tmpfs: parar esse serviço descarta apenas seus dados. O próximo início
executa docker-test-init.sh e recria sete tabelas vazias. O banco normal permanece intacto.

## 6. Recriação intencional do banco

**Operação destrutiva, separada do uso normal:** apaga os registros de passedb no
serviço db e recria as sete tabelas vazias. Use somente quando quiser descartar
esses registros. Na raiz, com db em execução:

~~~sh
docker compose stop backend
docker compose exec -T db bash /opt/passe-sql/recreate-database.sh --confirm-reset-passedb
docker compose up -d --wait --wait-timeout 300 backend
~~~

O script exige a confirmação literal; nunca é chamado automaticamente. Não remove
volumes, não altera o MySQL instalado no host e não recria tests-db.

## 7. Variáveis de ambiente

.env.example contém somente valores locais fictícios. O Compose funciona sem esse
arquivo. Para personalizar, copie-o para .env antes de criar o volume. Nunca publique
credenciais reais. Alterar variáveis não muda usuários já existentes no MySQL.
Spring não carrega .env automaticamente fora do Compose.

| Variável | Padrão / uso |
|---|---|
| MYSQL_ROOT_PASSWORD | passe_root_local, administração do container db |
| DB_USERNAME / DB_PASSWORD | passe_app / passe_app_local |
| TEST_DB_USERNAME / TEST_DB_PASSWORD | passe_test / passe_test_local, somente schema de testes |
| MYSQL_PORT | 3307, MySQL no loopback do host |
| BACKEND_PORT / FRONTEND_PORT | 8080 / 5173, portas HTTP locais |
| TEST_MYSQL_PORT | 13308, acesso local ao servidor de testes |
| DB_URL | Docker: jdbc:mysql://db:3306/passedb; Java local: jdbc:mysql://localhost:3307/passedb |
| TEST_DB_URL | Docker: jdbc:mysql://tests-db:3306/passedb_test; Java local: jdbc:mysql://localhost:13308/passedb_test |
| CORS_ORIGIN | http://localhost:5173, origem permitida pelo backend |

DB_URL e TEST_DB_URL são fixados nos serviços do Compose; variáveis externas com
esses nomes destinam-se ao Java local. Ao mudar a porta da interface, ajuste também
CORS_ORIGIN. O frontend não recebe senhas. Serviços comunicam-se pela rede privada
do projeto Compose. Portas publicadas escutam somente em 127.0.0.1. O acesso local
ao MySQL foi mantido para IDEs e ferramentas de desenvolvimento.

## 8. Desenvolvimento local, pastas e bibliotecas

Para Java local: Java 21 e Maven Wrapper 3.10.0. Suba db na raiz com
os comandos do [README do backend](backend/README.md#1-pré-requisitos-e-execução).
Eles descrevem a execução por Maven Wrapper, o perfil de testes e as portas usadas.

Para React local: Node.js 22.14.0 com npm. Veja [frontend/README.md](frontend/README.md).
O Vite também encaminha /api para a API local.

- backend/: API Java e domínios player, club, contract, transaction, market, lineup e match.
- frontend/: React/TypeScript/Vite e Nginx.
- compose.yaml: serviços integrados e perfil de testes tools.
- compose.backend-audit.yaml: validação separada do backend, com volume próprio.

Spring Web atende HTTP; Jackson serializa JSON; Spring Data JPA/Hibernate tratam
persistência/transações; Validation fornece constraints; Connector/J conecta ao MySQL;
SLF4J/Logback registra requisições; Spring Boot Test fornece JUnit, Mockito, AssertJ
e MockMvc. React/React DOM renderizam a interface; Vite e plugin React constroem
assets; TypeScript verifica tipos; ESLint, typescript-eslint, globals e plugins React
verificam convenções/hooks. Nginx serve assets e proxy. Versões Java são gerenciadas
pelo POM e versões npm pelo package-lock.json. Documentação adicional:

- [Backend: execução, arquitetura e contratos da API](backend/README.md).
- [Frontend: Docker, desenvolvimento local e limitações](frontend/README.md).
- [Scripts de criação e recriação do banco](backend/scripts/README.md).

## 9. Solução de problemas

~~~sh
docker compose ps
docker compose logs --tail 100 db backend frontend
docker compose config --quiet
~~~

Porta ocupada: pare a aplicação correspondente ou personalize as portas da seção 7.
Erro de download: confira a conexão e repita o build. Autenticação após mudar .env:
os usuários do volume mantêm as credenciais originais; não apague dados para corrigir
configuração. Schema legado: inspecione antes de alterar. A raiz / da API retorna
404; use /api/v1/players. Não há endpoint em /api/v1 sem recurso.

## 10. Decisões e premissas

Controllers mantêm try/catch explícito; BaseController padroniza respostas.
Recusas usam 400/404/409 com message; falhas inesperadas retornam 500 sanitizado.
Não há autenticação. Dinheiro usa BigDecimal/HALF_UP e cálculos únicos. Valores
dinâmicos são calculados nas consultas; contratos, transações e duelos guardam
snapshots. Operações de compra, venda, escalação, partida e condição DOENTE são atômicas.

Datas usam Brasília (-03:00), inclusive sessão JDBC. Fidelidade entra em minutos e
sai com segundos. Tabelas novas usam TIMESTAMP; DATETIME legado não é convertido
automaticamente. Nomes usam Unicode NFD sem Mn, caixa ignorada, pontos de código e
id. Lineup mantém LineupId próprio. Vínculos legados não geram contratos fictícios;
venda inconsistente retorna 409. Bloqueios seguem jogador antes de clube e IDs crescentes.

Imagens de build/runtime são separadas e o backend executa sem privilégios.
Healthchecks verificam tabelas no MySQL, GET /api/v1/players com 200 no backend e
HTTP no Nginx. Não substituem testes de todas as funcionalidades. O proxy resolve
backend pelo DNS interno Docker, inclusive após troca de IP.

## 11. Funcionalidades não implementadas

O fluxo de compra e as telas de partidas/classificação ainda não foram implementados no frontend.
Clubes possui lista/cadastro, detalhes, elenco/contratos, venda, histórico/CSV e escalação.
Jogadores possui listagem, filtros, cadastro, edição, condição, detalhes e
exclusão lógica. A compra ainda direciona para uma seção pendente.
A tela inicial e Jogadores possuem testes de componente e de navegador.
Clubes também possui testes de formulário, escalação e navegador com API QA isolada.
Não há formatador, Swagger/OpenAPI ou comandos de lint/formatação do backend. Testes Java
e logs por requisição estão implementados. A instalação dos containers não significa
que a interface de negócio esteja concluída.

## 12. Uso de inteligência artificial

OpenAI Codex apoiou análise de requisitos/código, implementação e auditoria dos
domínios Java, testes, scripts SQL, Docker/Compose, proxy e documentação. A finalidade
foi conferir contratos, investigar falhas e reduzir configuração manual. Foram aceitos
Java 21/Spring Boot 3/MySQL real, DTOs, cálculos únicos, transações e testes isolados.
Foram ajustados erros HTTP, Unicode, fuso, bootstrap, persistência e configuração
do frontend. Foram descartados Boot 4, H2 na aplicação, abstrações adicionais para
LineupId e tratamento automático de exceções nos controllers. O template React foi
reduzido à estrutura inicial; telas de negócio não foram criadas nesta etapa.
Na revisão dos READMEs, foram conferidos o código e os registros de instalação
e testes; apenas a documentação foi alterada, sem repetir a instalação ou o reset.
Relatórios gerados por IA permanecem locais. Resultados declarados dependem de
execuções reais; a revisão das alterações cabe aos mantenedores.
Depois da preparação inicial, Codex apoiou a tela inicial W01/W02, componentes,
tema, integração com a API, rotas e testes de interface. Foram aceitas as imagens
como referência, dados reais no aplicativo e cenários controlados apenas nos testes.
Não foram criadas as demais telas de negócio. Consulte o README do frontend.
Na etapa seguinte, Codex apoiou a feature Jogadores a partir dos 19 estados
visuais, respeitando os contratos da API e mantendo as fórmulas no backend.
Escopo, testes reproduzíveis e limitações estão no README do frontend;
evidências e relatórios gerados permanecem exclusivamente locais.
Na refatoração visual de Jogadores, foram priorizadas as bases oficiais
shadcn/ui e a composição conforme as referências, preservando os contratos da
API. Dependências, testes e limitações estão documentados no README do frontend.
Na feature Clubes, Codex apoiou as referências C01–C11/E04/E05/E07, implementação
por composição das bases shadcn existentes, integração real e testes isolados.
Fórmulas continuam na API; compra/partidas/classificação não foram ampliadas.
