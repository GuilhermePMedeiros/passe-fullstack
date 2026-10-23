# Passe

Aplicação fullstack para administrar uma liga fictícia de futebol: jogadores,
clubes, compra e venda com fidelidade, histórico financeiro/CSV, escalações,
partidas com seis duelos e classificação. Não há login; a interface administra
os clubes da liga e consome os cálculos da API.

## Pré-requisitos e tecnologias

Caminho principal: Ubuntu 24.04 LTS (amd64), Git, Docker Engine com Docker Compose
v2.20 ou superior, containers Linux e acesso à internet. Docker deve estar em
execução e utilizável sem `sudo`. Reserve as portas 5173, 8080 e 3307;
os testes Java usam também 13308. Referência de recursos da banca: 4 vCPUs,
8 GB de RAM e 40 GB livres.

| Componente | Versão utilizada |
| --- | --- |
| Backend | Java 21, Spring Boot 3.5.16, Maven 3.10.0 |
| Frontend | React 19.3.1, TypeScript 5.8.3, Vite 6.4.4 |
| Build frontend | Node.js 22.14.0 com npm |
| Banco | MySQL 8.0.46 |
| Servidor frontend | Nginx 1.28 Alpine |

Java, Maven, Node.js e MySQL são fornecidos pelas imagens públicas; não precisam
ser instalados no host para a execução Docker. O npm usa o `package-lock.json`
versionado; as versões Java são gerenciadas pelo `pom.xml` e pelo Maven Wrapper.

## Instalação e execução do zero

No terminal Ubuntu:

```sh
git clone --branch main https://github.com/GuilhermePMedeiros/passe-fullstack.git
cd passe-fullstack
docker compose up --build -d --wait --wait-timeout 300
docker compose ps
```

O comando constrói a interface e a API a partir deste repositório e inicia o
MySQL antes delas. Não é necessário criar `.env`: os padrões locais funcionam
sem edição. O banco novo começa vazio; não existe carga automática de exemplos.

| Acesso | URL |
| --- | --- |
| Interface e página inicial | http://localhost:5173/ |
| Origem da API para avaliação | http://localhost:8080 |
| Consulta da API | http://localhost:8080/api/v1/players |
| Mesma consulta pelo proxy | http://localhost:5173/api/v1/players |
| MySQL local | localhost:3307, banco `passedb` |

Os três serviços devem aparecer como `healthy`. Confira o proxy sem instalar
um cliente HTTP no host:

```sh
docker compose exec -T frontend wget -q -O - http://127.0.0.1/api/v1/players
```

Em banco vazio, a resposta contém `data: []` e `meta.total_items: 0`. Abra a
interface e percorra Jogadores → Clubes → Compra → Venda → Histórico → Liga.
A compra parte dos jogadores livres; venda, histórico e escalação ficam no clube.
O Nginx atende rotas diretas e F5 e encaminha `/api/` à API.

Após mudanças no código, repita o comando com `--build`: reiniciar o container
não atualiza o build. Vite local é uma alternativa de desenvolvimento na mesma
porta 5173, descrita no [README do frontend](frontend/README.md).

## Banco de dados: criação, persistência e recriação

Na primeira inicialização do volume, `backend/scripts/docker-init.sh` aplica
`000-core-schema.sql` e `002-entidades-restantes.sql`. São criadas sete tabelas:
`jogadores`, `clubes`, `contratos`, `transacoes`, `escalacoes`, `partidas` e
`duelos_partida`. O bootstrap também prepara o schema auxiliar `passedb_test`;
a suíte utiliza outro servidor MySQL, separado.

O volume `mysql_data` preserva os dados. Hibernate usa `ddl-auto=none`; iniciar a
API não cria nem migra tabelas. Os scripts iniciais só rodam em volume vazio e
não corrigem automaticamente estruturas antigas.

Para uma avaliação limpa, **somente no ambiente de avaliação cujos registros
podem ser descartados**, execute na raiz:

```sh
docker compose stop backend
docker compose exec -T db bash /opt/passe-sql/recreate-database.sh --confirm-reset-passedb
docker compose up -d --wait --wait-timeout 300 backend
```

Isso apaga `passedb` e recria suas sete tabelas vazias, sem remover volumes ou
alterar `tests-db`. Não use esse procedimento em uma base que deseja preservar.

## Variáveis de ambiente

Os exemplos [.env.example](.env.example) e [backend/.env.example](backend/.env.example)
contêm valores fictícios para execução local. Opcionalmente, copie o primeiro
para `.env` antes da primeira inicialização. Alterar senhas no arquivo não muda
usuários de um volume já inicializado. Não publique credenciais reais.

| Variável | Padrão e finalidade |
| --- | --- |
| `MYSQL_ROOT_PASSWORD` | Senha administrativa local definida no exemplo |
| `DB_USERNAME` / `DB_PASSWORD` | Usuário/senha locais da aplicação, definidos no exemplo |
| `TEST_DB_USERNAME` / `TEST_DB_PASSWORD` | Usuário/senha exclusivos dos testes, definidos no exemplo |
| `MYSQL_PORT` | 3307, porta do MySQL no host |
| `BACKEND_PORT` / `FRONTEND_PORT` | 8080 / 5173, portas HTTP no host |
| `TEST_MYSQL_PORT` | 13308, porta do MySQL de testes no host |
| `CORS_ORIGIN` | `http://localhost:5173`, única origem liberada pela API |
| `DB_URL` | Java local: `jdbc:mysql://localhost:3307/passedb` |
| `TEST_DB_URL` | Java local: `jdbc:mysql://localhost:13308/passedb_test` |

No Compose, `DB_URL` e `TEST_DB_URL` são fixadas para `db:3306/passedb` e
`tests-db:3306/passedb_test`, respectivamente; valores externos dessas duas
variáveis não substituem os endereços Docker. Spring não lê `.env` automaticamente
na execução Java local. O frontend não utiliza variáveis de ambiente: chama
`/api/v1` por proxy e não recebe credenciais do banco.

## Testes e verificações

Testes Java, na raiz, com MySQL isolado:

```sh
docker compose --profile tools build tests
docker compose --profile tools up -d --wait --wait-timeout 180 tests-db
docker compose --profile tools run --rm tests
```

O último comando executa `mvn -B -ntp verify` e termina sozinho. A suíte inclui
valor de mercado, validações HTTP, persistência, mercado, contratos, CSV,
escalação, partidas e classificação. Não execute duas suítes no mesmo banco.
`tests-db` usa tmpfs; parar esse serviço descarta apenas os dados de testes.
Relatórios locais: `docs/evidencias/mysql/`, ignorados pelo Git.

Testes de componente, lint, build e verificação no navegador estão no
[README do frontend](frontend/README.md#testes-lint-e-build). Logs por requisição
podem ser conferidos após a consulta de disponibilidade:

```sh
docker compose logs --tail 100 backend
```

Cada requisição é registrada por SLF4J/Logback com data, hora, método, caminho e
status. As suítes próprias não substituem o roteiro de avaliação da banca.

## Encerrar, retomar e diagnosticar

Na raiz, para encerrar preservando os dados:

```sh
docker compose --profile tools down
```

Para retomar a aplicação:

```sh
docker compose up -d --wait --wait-timeout 300
```

Não acrescente `-v` ao encerramento: essa opção remove volumes. Para diagnóstico:

```sh
docker compose config --quiet
docker compose ps
docker compose logs --tail 100 db backend frontend
```

Em conflito de porta, identifique o processo antes de encerrá-lo. Use um único
frontend em 5173. A raiz `/` da API retorna 404; consulte `/api/v1/players`.

## Estrutura e bibliotecas

- `backend/`: API, domínios, testes e scripts SQL. [Detalhes e contratos](backend/README.md).
- `frontend/`: aplicação React por funcionalidade, componentes e testes. [Execução e bibliotecas](frontend/README.md).
- `compose.yaml`: aplicação integrada e perfil de testes `tools`.

As bibliotecas e a finalidade de cada uma estão nos READMEs específicos.

## Decisões e premissas

Mensagens de erro são em português. Controllers usam `try/catch` explícito e
respostas comuns em `BaseController`; detalhes de falhas internas são sanitizados.
Compra, venda, escalação, partida e retirada de titular por doença têm transações
no banco. Valores financeiros usam `BigDecimal` com `HALF_UP`; datas usam Brasília
(`-03:00`). Contratos, transações e duelos preservam os valores do momento.

A interface usa React Router no modo biblioteca, componentes shadcn/ui e estados
na URL para filtros/abas aplicáveis. Cálculos e ordenações devolvidos pela API são
preservados; a soma de valor e taxa exibe o custo total da compra. Decisões
específicas das camadas estão nos respectivos READMEs.

## Funcionalidades não implementadas

Os quatro módulos obrigatórios possuem implementação na API e na interface.
Não há Swagger/OpenAPI, lint/formatação do backend ou formatador do frontend.
A instalação completa em uma VM Ubuntu 24.04 limpa não foi certificada.

## Uso de inteligência artificial

OpenAI Codex auxiliou a análise dos requisitos, a implementação e a revisão de
`backend/src/`, testes Java, scripts SQL, Docker/Compose, `frontend/src/`, testes
de interface e documentação. O auxílio foi usado para conferir contratos,
implementar os fluxos e investigar erros de integração, cálculo e configuração.

Conforme o histórico documental do projeto, foram aceitos DTOs, cálculos
centralizados na API, transações, testes com MySQL e componentes shadcn/ui.
As sugestões foram adaptadas aos contratos HTTP, regras de Unicode, fuso de
Brasília, referências visuais e navegação existente. Foram descartados Spring
Boot 4, H2 como banco da aplicação e recálculo financeiro/classificação no frontend.
