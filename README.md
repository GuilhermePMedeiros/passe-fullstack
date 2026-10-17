# Passe

Estrutura inicial do desafio SENAI/PE CÓD. 237: **PasseBackend** e
**PasseFrontend**. Ainda não há funcionalidades de negócio. A configuração
não representa atendimento aos critérios funcionais da banca.

## 1. Pré-requisitos

Caminho principal para Ubuntu 24.04, Windows ou macOS com containers Linux:
**Docker Engine/Desktop e Docker Compose v2.20 ou superior**, em execução.
Internet é necessária para baixar imagens e dependências na primeira execução.
No Windows, Docker Desktop utiliza WSL 2/virtualização habilitada.
Se o instalador ou a ativação do componente Windows pedir reinicialização,
reinicie uma vez e abra Docker Desktop antes de executar o comando abaixo.

O Compose fornece Java 21, Maven 3.10.0, Node.js 22.12.0 e MySQL 8.0.46;
não é necessário instalar esses runtimes no computador para esse caminho.
Spring Boot 3.5.16, React 19, TypeScript 5.8 e Vite 6 respeitam a seção
**Stack obrigatória** do enunciado. Versões npm exatas estão em package-lock.json.

## 2. Banco: criação e preservação

O Compose cria um MySQL próprio, com os bancos `passedb` e `passedb_test`.
Os dados ficam no volume `passe_mysql_data`, sem conexão com o MySQL já instalado.
A porta local é **3307**, para preservar o servidor existente na porta 3306.
Na primeira inicialização, a imagem cria `passedb` e o usuário `passe_app`;
[script versionado](backend/scripts/docker-init.sh) cria `passedb_test` e
`passe_test`, com permissão somente de leitura para os testes desta etapa.
Charset utf8mb4 e collation utf8mb4_0900_as_ci preservam diferenças de acentos.

Nenhum comando deste roteiro apaga bancos ou volumes. `docker compose stop`
preserva os dados. Não execute remoção de volumes ou recriação de bancos existentes.
**Recriação do esquema e sete tabelas obrigatórias continuam pendentes** da etapa
de negócio/autorização específica. Portanto, B3 ainda não está atendido integralmente.

## 3. Instalação e execução — caminho principal da banca

Na raiz do repositório, no terminal:

```sh
docker compose up --build -d --wait --wait-timeout 300
```

Esse é o mesmo comando no PowerShell e no Ubuntu. Não exige editar arquivos,
preencher credenciais ou instalar Maven/npm globalmente. As imagens são públicas
de terceiros e as aplicações são construídas a partir deste repositório.
O Compose espera o MySQL ficar disponível antes de iniciar a API, e a API antes
do frontend, conforme a [documentação Docker](https://docs.docker.com/compose/how-tos/startup-order/).

O backend é compilado na imagem oficial `maven:3.10.0-eclipse-temurin-21-noble`,
com Maven já instalado, sem executar o Maven Wrapper durante o build ou os testes
em containers. A imagem final `eclipse-temurin:21-jre-jammy` recebe somente o JAR
e executa com usuário sem privilégios. O Wrapper continua disponível para
desenvolvimento local. Imagens e dependências ainda exigem acesso à internet;
não há garantia de funcionamento offline.

- Frontend: **http://localhost:5173**.
- Origem da API: **http://localhost:8080**. Prefixo futuro: `/api/v1`.
- Banco pelo Workbench: localhost, porta 3307, usuário passe_app,
  senha pública de desenvolvimento passe_app_local, banco passedb.

A API retorna 404 na raiz porque ainda não há controllers de negócio.
O frontend exibe somente a estrutura inicial. Isso não comprova os roteiros da prova.
O healthcheck da API aceita HTTP 2xx ou esse 404; respostas 5xx falham.
O MySQL é verificado com `SELECT 1` autenticado no banco da aplicação, e o Nginx
com uma requisição HTTP à página inicial. A checagem HTTP não monitora continuamente
a conexão da API ao banco; os testes de integração abaixo verificam a conexão real.

Para conferir serviços e erros:

```sh
docker compose ps
docker compose logs --tail 100 backend db frontend
```

Para auditar o build sem cache, na raiz (com as portas 3307, 8080 e 5173 livres):

```sh
docker compose config --quiet
docker compose build --no-cache
docker compose up -d --wait --wait-timeout 300
docker compose ps
docker compose logs --tail 100
```

O build do frontend executa `npm ci`, `npm run lint` e `npm run build` dentro da
imagem Node. O build do JAR compila também os testes, mas a execução deles fica
no serviço `tests`, pois requer o MySQL em execução. Execute a seção seguinte
para validar o backend; subir os serviços, sozinho, não comprova os testes.

Validação em 17/10/2026: configuração Compose e build sem cache passaram em
containers Linux no Docker Desktop/WSL 2. Uma cópia dos arquivos versionados com
esta correção, sem `.env`, `node_modules` ou `target`, iniciou com volume novo e
os três serviços saudáveis. Os três testes de integração passaram nessa cópia,
sem falhas ou testes ignorados. Isso ainda não é um ensaio em VM Ubuntu 24.04 limpa.
O npm emitiu `EBADENGINE` para `eslint-visitor-keys@5.0.1` com Node 22.12.0;
lint e build passaram, mas o aviso de compatibilidade permanece pendente.

Para parar preservando dados:

```sh
docker compose stop
```

Para iniciar novamente, sem mudanças de código:

```sh
docker compose up -d --wait --wait-timeout 300
```

### Testar a infraestrutura com MySQL 8 real

Com o Docker disponível, na raiz:

```sh
docker compose --profile tools build tests
docker compose --profile tools run --rm tests
```

O comando termina sozinho e propaga falha do Maven. Os três testes verificam
MySQL 8/passedb_test com SELECT 1 e conexão somente leitura, inicialização HTTP,
e CORS permitido/recusado. Não gravam dados. Relatórios ficam em
`docs/evidencias/mysql`, pasta criada na execução e ignorada pelo Git.
Não é necessário obter essa pasta antes de executar os testes.
Não são testes de negócio nem pontuam, sozinhos,
o diferencial que exige teste do cálculo do valor de mercado.

### Programar pelo STS e Vite, com atualização durante o desenvolvimento

Pare a execução completa para liberar as portas de API/frontend e suba só o banco:

```sh
docker compose stop backend frontend
docker compose up -d --wait --wait-timeout 300 db
```

Instale/use **Java 21** no STS e **Node.js 22.12.0 com npm** para execução local.
No STS, importe `backend/pom.xml` como projeto Maven e execute
`PasseBackendApplication`. **Não precisa configurar usuário e senha na IDE**:
os padrões locais correspondem ao banco isolado do Compose.
Remova apenas as variáveis antigas da configuração de execução desse projeto
se elas apontarem para outro banco; não altere variáveis globais do computador.

Em outro terminal, na pasta `frontend`, prepare uma vez e inicie:

```sh
npm ci
npm run dev
```

Diariamente basta `npm run dev`. Para testes pelo Maven no Windows, dentro de
`backend`, use `.\mvnw.cmd -B -ntp verify`; no Ubuntu, `sh ./mvnw -B -ntp verify`.
O banco isolado precisa estar no ar. Build/lint frontend: `npm run lint` e
`npm run build`. Detalhes: [backend](backend/README.md) e [frontend](frontend/README.md).

## 4. Variáveis de ambiente

[.env.example](.env.example) contém valores fictícios completos do Compose.
Copiá-lo para `.env` é opcional, pois o comando já tem os mesmos padrões.
Não são credenciais do MySQL existente. Senhas reais nunca devem ir para o Git.
A regra do barema B2 exclui senhas locais de desenvolvimento do conceito de
credencial real; a aplicação continua lendo DB_* do ambiente.

| Variável | Padrão local e finalidade |
| --- | --- |
| MYSQL_ROOT_PASSWORD | passe_root_local; administrador exclusivo do container |
| DB_USERNAME / DB_PASSWORD | passe_app / passe_app_local; aplicação |
| TEST_DB_USERNAME / TEST_DB_PASSWORD | passe_test / passe_test_local; testes somente leitura |
| CORS_ORIGIN | http://localhost:5173; única origem permitida |
| DB_URL | Dentro do Compose: jdbc:mysql://db:3306/passedb; STS: localhost:3307/passedb |
| TEST_DB_URL | Dentro do Compose: jdbc:mysql://db:3306/passedb_test; Maven local: localhost:3307/passedb_test |

As URLs internas são definidas pelo Compose; os padrões Spring usam a porta do
computador. Se personalizar credenciais, faça isso antes da criação do volume;
alterar `.env` não altera usuários já criados no MySQL. Não tente corrigir acesso
apagando dados. O frontend atual não precisa de variáveis nem recebe senhas.

## 5. Estrutura e bibliotecas

- `backend/`: Java/Spring Boot, pacote br.com.passebackend, testes e Dockerfile.
- `frontend/`: template oficial React/TypeScript/Vite, lockfile, Dockerfile e Nginx.
- `compose.yaml`: banco, API, interface e serviço separado de testes.

Motivo de cada biblioteca nos READMEs de [backend](backend/README.md) e
[frontend](frontend/README.md). Nginx serve os arquivos estáticos e permite futuras
rotas da interface. Nenhuma biblioteca de negócio ou ferramenta global adicional
foi introduzida no projeto.

## 6. Decisões e premissas

Nomes escolhidos pelo candidato: PasseBackend, PasseFrontend, passedb e passedb_test.
Passe aparece no link do mockup, não como obrigação explícita de nome do projeto.
A porta 3307 evita interferência com o MySQL já instalado. Hibernate não altera
esquema; scripts de inicialização executam somente em volume vazio. Não há H2.
CORS é restrito conforme **Convenções da API** e barema **B2**.

Ambiente padronizado pelo Compose conforme barema **§3.2** e enunciado
**Requisitos do README.md**, itens 1–5. O ensaio real em Ubuntu 24.04 e os limites
de tempo da banca ainda precisam de evidência; arquivos configurados não bastam.
O regulamento principal e eventuais erratas não foram fornecidos.

## 7. Funcionalidades não implementadas

B01–B22 e F01–F14, esquema obrigatório, migrações/recriação, tratamento contratual
de erros com message, integração funcional, testes de negócio/interface, OpenAPI,
logs por requisição e formatação. Docker só poderá pontuar integralmente quando
a lista de jogadores também funcionar. Nenhum requisito foi marcado aprovado.
Commit, push e envio continuam dependendo de autorização.
Prazo interno: 23/10/2026 às 16h; conferir regulamento para prazo oficial.

## 8. Uso de inteligência artificial

Codex auxiliou análise dos quatro documentos, POM, estrutura Java/React,
configurações, Dockerfiles, Compose, SQL de infraestrutura, testes e documentação.
Aceitos Java 21/Boot 3/MySQL 8 e template Vite react-ts; descartados Boot 4 e H2.
Nesta revisão foram aceitos ambiente isolado, padrões fictícios de desenvolvimento
e testes somente leitura. A classe original de testes vazia foi preservada;
novos testes estão em MySqlIntegrationTests. Nenhuma funcionalidade de negócio
foi implementada. O candidato deve revisar e compreender o conteúdo antes da entrega.
Na correção Docker de 17/10/2026, Codex substituiu o uso do Wrapper na imagem
de build por Maven oficial com Java 21, restringiu o healthcheck HTTP e atualizou
as instruções. A URL Maven 3.10.0 foi consultada e respondeu HTTP 200; a causa
do download malsucedido no ambiente original não foi reproduzida.
