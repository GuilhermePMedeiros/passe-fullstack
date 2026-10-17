# PasseBackend

Estrutura inicial do Passe, sem funcionalidades de negócio.
Java 21, Spring Boot 3.5.16, Maven 3.10.0 e MySQL 8.0.46.
Docker usa Maven já instalado na imagem oficial de construção; Maven Wrapper
3.10.0 é usado somente no desenvolvimento local. A execução usa uma imagem JRE 21
separada, sem Maven nem código-fonte.

## 1. Pré-requisitos

Para subir tudo ou testar sem instalar Java: Docker com Compose v2.20+ em execução.
Siga primeiro o [README da raiz](../README.md#3-instalação-e-execução--caminho-principal-da-banca).
Para programar no STS: Java 21; não precisa instalar Maven globalmente.

## 2. Banco de dados

O Compose cria `passedb` e `passedb_test` em servidor isolado na porta **3307**.
`passe_app` acessa o principal; `passe_test` tem somente SELECT no banco de testes.
São usuários técnicos do MySQL; o sistema Passe não terá login.
Credenciais fictícias completas no [.env.example da raiz](../.env.example).
Seu MySQL da porta 3306 e seus bancos existentes permanecem separados.

O [script Docker](scripts/docker-init.sh) executa somente na primeira inicialização
com volume vazio. O [script SQL local](scripts/create-databases.sql) cria somente
bancos ausentes. Nenhum deles cria as tabelas obrigatórias nesta etapa.
Recriação do esquema exigida em B3 ainda está pendente; não apague volumes/bancos.

## 3. Executar e testar

Caminho principal, dentro da raiz do repositório:

```sh
docker compose up --build -d --wait --wait-timeout 300
docker compose --profile tools build tests
docker compose --profile tools run --rm tests
```

Origem da API: **http://localhost:8080**; prefixo futuro `/api/v1`.
A raiz retorna 404 porque ainda não há controllers.
O Compose aguarda a disponibilidade do banco antes de iniciar o backend.

Para programar no STS, siga a seção de desenvolvimento do README raiz: somente
o serviço `db` fica no Docker, e a classe `PasseBackendApplication` roda na IDE.
Não precisa preencher credenciais: os padrões correspondem ao Compose.
Variáveis antigas da execução do STS podem substituir esses padrões; confira-as
se aparecer erro de acesso. Não altere usuários nem bancos para corrigir configuração.

Para executar pelo terminal local, dentro de `backend`, com o banco no ar:

```powershell
.\mvnw.cmd -B -ntp spring-boot:run
```

Testes locais:

```powershell
.\mvnw.cmd -B -ntp verify
```

No Ubuntu substitua `.\mvnw.cmd` por `sh ./mvnw`. Esses comandos não dependem de
scripts PowerShell. Os inicializadores `iniciar.ps1`/`iniciar.sh` foram preservados
somente como alternativa para quem precisa carregar um `.env` personalizado.
Spring e STS não leem `.env` automaticamente; no caminho principal isso não é necessário.

`MySqlIntegrationTests` verifica MySQL 8/passedb_test, SELECT 1 com conexão
somente leitura, servidor HTTP e CORS permitido/recusado. Não grava dados.
`PasseBackendApplicationTests` permanece vazia conforme pedido anterior.
Os testes não substituem os futuros testes de negócio e cálculo exigidos em B5.
Relatórios: `target/surefire-reports` local; `docs/evidencias/mysql` pelo Compose.
Essas pastas são geradas na execução e ignoradas pelo Git; não precisam
existir no clone para executar os testes.

## 4. Configurações explicadas

| Propriedade | Significado |
| --- | --- |
| spring.application.name | Nome PasseBackend |
| spring.datasource.url | Endereço do banco; DB_URL substitui o padrão local localhost:3307/passedb |
| spring.datasource.username/password | Variáveis DB_USERNAME/DB_PASSWORD; padrão fictício exclusivo do Compose |
| app.cors-origin | CORS_ORIGIN; única origem aceita, padrão http://localhost:5173 |
| spring.jpa.hibernate.ddl-auto=none | Hibernate não cria ou altera tabelas |
| spring.jpa.open-in-view=false | Acesso ao banco fica na camada de serviço |
| spring.sql.init.mode=never | Não executa SQL automaticamente ao iniciar |
| server.error.include-* | Evita exposição de detalhes internos nos erros HTTP |

O perfil `test` usa TEST_DB_URL/TEST_DB_USERNAME/TEST_DB_PASSWORD e conexão
somente leitura. O driver MySQL é detectado automaticamente. Sem H2.
[Exemplo local](.env.example) contém somente valores públicos do Compose;
senhas reais não devem ser gravadas no repositório.

## 5. Estrutura e bibliotecas

`src/main/java/br/com/passebackend`: aplicação e configuração CORS simples.
`src/main/resources`: propriedades; `src/test`: testes/perfil;
`scripts`: inicialização de bancos; Dockerfile: build Java 21 e execução do JAR.

Spring Web fornece HTTP; Data JPA fornece persistência com Hibernate;
Validation prepara validações; Connector/J conecta ao MySQL; Spring Boot Test
fornece ferramentas de testes. Versões gerenciadas pelo POM.
Não foram acrescentadas bibliotecas nesta configuração.

## 6. Decisões e premissas

Porta 3307 preserva o MySQL existente. Padrões de senha são fictícios e locais,
permitidos pelo barema B2; variáveis de ambiente substituem esses padrões.
Banco de testes e usuário exclusivo previnem gravações pelos testes atuais.
Não há migrações, dados de exemplo ou alterações automáticas de esquema.
CORS é necessário pelo enunciado, **Convenções da API**, e barema **B2**:
a classe WebConfig contém somente a liberação da origem configurada para `/api/v1/**`.
Os cabeçalhos Location e Content-Disposition ficam acessíveis ao frontend.

## 7. Funcionalidades não implementadas

B01–B22, sete tabelas, migrações/recriação, tratamento contratual de erros,
testes de negócio, documentação interativa, logs por requisição e formatação.
O 404 padrão não comprova B02; testes de conexão não comprovam B5.
A validação final em Ubuntu 24.04 ainda está pendente. A configuração atual
não comprova atendimento aos critérios funcionais da banca.

## 8. Uso de inteligência artificial

Codex auxiliou leitura dos requisitos, POM, aplicação, configurações, scripts,
Dockerfile, testes e documentação. Foram aceitos Java 21/Boot 3/MySQL real e
ambiente isolado; descartados Boot 4 e H2. CORS foi reintroduzido para cumprir
o edital nesta autorização de configuração. Classe de testes original vazia
preservada; testes de infraestrutura em classe separada, sem negócios.
