# PasseFrontend

Base React 19, TypeScript 5.8 e Vite 6, criada com o template oficial
react-ts do create-vite 6.5.0. A estrutura de aplicação, Tailwind CSS, configuração
para shadcn/ui e cliente HTTP estão preparados. A tela inicial W01/W02 foi
implementada a partir das imagens locais, com estatísticas reais e navegação.
A rota `/players` implementa listagem, filtros, cadastro, edição, condição,
detalhes e exclusão lógica com a API real. `/clubs` e `/clubs/:id` incluem
cadastro, elenco/contratos, venda, histórico/CSV e escalação. Compra abre um
diálogo integrado a Jogadores. `/matches`, `/matches/:id` e `/standings` incluem
partidas, detalhes com seis duelos históricos e classificação devolvida pela API.

## Instalação com Docker

Na raiz do repositório, com Docker Engine/Desktop e Compose v2.20+ em execução:

~~~sh
docker compose up --build -d
~~~

Interface em http://localhost:5173. Não é necessário instalar Node.js no host.
O build usa Node.js 22.14.0, npm ci com package-lock.json, lint e compilação de
produção. Nginx 1.28 serve os assets e preserva rotas da interface.
Essa é a URL oficial de todos os módulos. Após alterar o código, repita
`docker compose up --build -d` na raiz para incorporar as mudanças à imagem;
reiniciar o container não reconstrói o build. Não disponibilize outra versão
em 5174 para contornar imagem antiga ou conflito de porta.
O proxy /api/ encaminha chamadas para backend:8080 na rede Docker, preservando
caminho/query. O navegador pode chamar /api/v1/players na mesma origem da interface.
Esse hostname interno e as credenciais MySQL não são enviados ao navegador.
A página inicial consulta jogadores, livres, clubes, partidas e classificação.
Instruções completas no
[README principal](../README.md).

## Desenvolvimento local

Node.js 22.14.0 com npm. O projeto aceita Node ^20.20.2 ou ^22.12.0, mas recomenda
22.14.0 para satisfazer também as ferramentas do lockfile. Na pasta frontend,
com a porta 5173 livre:

~~~sh
npm ci
npm run dev
~~~

Vite atende http://localhost:5173 e encaminha /api para http://localhost:8080.
Usa bind 127.0.0.1 e `strictPort: true` para detectar a porta publicada pelo
Docker, inclusive quando localhost resolve para IPv6. Se o frontend Docker já
estiver rodando, `npm run dev` falha claramente: não muda para 5174. Para escolher
intencionalmente o modo Vite, pare somente `frontend` com `docker compose stop
frontend` na raiz; preserve db/backend. Ao terminar, use Ctrl+C e volte ao
comando Docker documentado. Não mantenha as duas versões em execução.
Inicie o backend separadamente para chamadas à API. Pare o servidor com Ctrl+C.
Para conferir o código e gerar assets:

~~~sh
npm run lint
npm test
npm run build
~~~

`npm test` executa testes unitários e de componente, com respostas controladas,
sem exigir banco ou API. Para testes de navegador, com Google Chrome estável
instalado, execute na pasta frontend (porta 15174 livre):

~~~sh
npm run test:browser
~~~

O comando inicia e encerra seu próprio Vite/Chrome headless; valida W01/W02,
carregamento/erro nos testes de componente, liga vazia, rotas, teclado e larguras
375, 768, 1366 e 1920 px. Capturas e resultados ficam em docs/evidencias/home,
exclusivamente locais. Os cenários de navegador usam respostas controladas.
Para também conferir a API real com consultas GET, inicie banco e backend na
raiz com `docker compose up --build -d db backend` e, na pasta frontend, execute
no Ubuntu:

~~~sh
PASSE_TEST_REAL_API=1 npm run test:browser
~~~

No PowerShell, defina `$env:PASSE_TEST_REAL_API='1'` antes do comando.
O teste compara a tela ao estado atual do banco, sem inserir ou apagar registros.

`npm run preview` usa a mesma porta 5173, bind e proxy da API; requer build
prévio e a porta livre. É uma alternativa local, não um servidor adicional.
Para validar a execução oficial já iniciada pelo README, com Chrome instalado:

~~~sh
npm run test:official
~~~

O teste acessa exclusivamente http://localhost:5173, exige Nginx/build estático,
verifica rotas reais, API/proxy, F5, navegação/Voltar/Avançar, estados controlados
somente no navegador e 375 px. Não inicia Vite, não altera registros e compara
os dados da API antes/depois. Evidências em docs/evidencias/url-oficial, locais.

## Variáveis, estrutura e bibliotecas

Não há variáveis VITE_* necessárias. Nunca coloque senhas nessas variáveis:
seu conteúdo é público no navegador. .env.example explica essa restrição.
src/main.tsx inicializa React; src/app/App.tsx configura o BrowserRouter;
src/app/router.tsx configura início, jogadores, clubes, partidas e classificação;
src/app/layouts/MainLayout.tsx fornece o contêiner da aplicação;
src/features/home separa página, componentes, hook, serviço, tipos e testes;
src/features/players organiza a experiência de jogadores na mesma estrutura;
src/features/clubs organiza lista, cadastro, detalhe, venda, histórico e escalação;
src/components/layout compartilha menu, cabeçalho e logo;
src/components/ui compartilha diálogos, campos, tabela, paginação e estados;
src/styles/globals.css fornece estilos e importa Tailwind;
src/lib/api.ts centraliza Fetch, JSON, respostas 204, cancelamento e download CSV;
src/lib/errors.ts preserva status e message da API;
vite.config.ts define plugins, alias @ para src, portas e proxy;
nginx.conf define rotas estáticas e proxy de produção. tsconfig*.json configura
TypeScript estrito. components.json prepara os caminhos do shadcn/ui;
components/ui/Button.tsx adapta o botão shadcn às variantes efetivamente usadas.
React/React DOM renderizam a interface; Vite e plugin React
constroem assets; TypeScript/tipos verificam o código; ESLint, typescript-eslint,
globals e plugins React verificam convenções e hooks. Tailwind CSS e
@tailwindcss/vite fornecem utilitários CSS e integração no build; Vitest executa
os testes HTTP, de serviço e de componente com npm test, sem modo de observação.
Versões exatas no lockfile. Não foram adicionados MUI ou Bootstrap.
@types/node fornece os tipos das APIs de Node usadas na configuração Vite;
@types/react e @types/react-dom tipam os componentes e a renderização.

Bibliotecas de interface e testes:

| Biblioteca | Motivo |
| --- | --- |
| react-router | Navegação declarativa no modo biblioteca, sem framework/SSR |
| lucide-react | Ícones vetoriais dos cards e indicadores |
| @fontsource/geist | Geist 400/500/600 distribuída junto aos assets, licença OFL-1.1 |
| @radix-ui/react-slot | Composição do botão shadcn com links sem botão aninhado |
| class-variance-authority | Variantes padrão/contorno do botão compartilhado |
| clsx e tailwind-merge | Composição e resolução de classes no utilitário cn |
| @testing-library/react e jsdom | Testes de componente, eventos e estados no Vitest |
| playwright | Testes de teclado, rotas, layout e integração no Chrome instalado |
| @radix-ui/react-dialog | Diálogos e drawer com semântica, foco e Escape |
| @radix-ui/react-dropdown-menu | Menu de ações com navegação por teclado |
| @radix-ui/react-alert-dialog | Base do AlertDialog shadcn para confirmação da exclusão |
| @radix-ui/react-select e @radix-ui/react-popover | Bases shadcn dos filtros e faixas |
| @radix-ui/react-label e @radix-ui/react-radio-group | Rótulos e opções acessíveis dos formulários |
| @radix-ui/react-tabs | Base shadcn das abas de vínculo |
| @radix-ui/react-avatar e @radix-ui/react-progress | Bases shadcn dos avatares e indicadores |
| @radix-ui/react-separator e @radix-ui/react-tooltip | Divisórias e ajuda contextual |
| sonner | Notificações de sucesso com o componente shadcn Sonner |

As bases Input, Label, Badge, Dialog, AlertDialog, Sheet, DropdownMenu, Select,
Popover, RadioGroup, Tabs, Table, Skeleton, Separator, Tooltip, Card, Avatar,
Progress, Pagination e Sonner foram obtidas do registro oficial
[shadcn/ui New York](https://ui.shadcn.com/docs/components).
Button existente foi preservado e recebeu variantes/tamanhos. Componentes do
Passe compõem essas bases; FormField, DataTable e PaginationControls acrescentam
apenas rótulos/erros, colunas/estados e ligação com meta da API.
Modal compõe Dialog; detalhes e navegação móvel usam Sheet; exclusão usa
AlertDialog, mantendo-o aberto até a API concluir. As adaptações locais incluem
tokens, textos pt-BR, bloqueio de fechamento pendente e escala visual do Progress.
Sonner usa o tema claro existente, sem instalar um gerenciador de temas.
Os componentes shadcn são código-fonte local editável, não um pacote visual extra.
O aviso de licença do código obtido está em [LICENSE.shadcn](LICENSE.shadcn).
Jogadores é carregado sob demanda na navegação, preservando o início mais leve.

## Decisões e premissas

O template foi reduzido à identificação do projeto, removendo logos e contador.
O proxy usa caminhos relativos, evitando URLs de máquinas específicas no bundle.
Fórmulas e regras de negócio pertencem ao backend.
O cliente HTTP usa /api/v1 na mesma origem, sem variável adicional e sem repetir
automaticamente operações de escrita. Os testes usam respostas controladas para
validar o cliente e a interface; a aplicação não usa dados simulados.
A tela usa meta.total_items para jogadores/livres, o tamanho das listas de clubes
e partidas e o primeiro clube de GET /standings, sem recalcular classificação.
Sem partidas, não mostra líder mesmo que existam clubes zerados na classificação.
Falhas de comunicação não são interpretadas como uma liga vazia.
O título da liga usa o ano atual em Brasília, pois não existe entidade/endpoint
de liga. O rodapé acrescenta o relógio atual à referência. O logo foi redesenhado
em SVG; nenhum print foi copiado para o repositório. Os valores precisos de
espaçamento e o logo original não estavam disponíveis em formato vetorial.

A organização é por funcionalidade em src/features/, começando por home; players, clubs,
transfers, lineups, matches e standings. Serão criadas apenas pastas com código
em uso. Serviços de cada funcionalidade usarão src/lib/api.ts; hooks controlarão
carregamento, erros e atualização dos dados. Componentes React não chamarão
Fetch diretamente. Iniciar vai para /players; Compra abre /players?free=true.
Venda direciona a /clubs?action=sell; Histórico direciona à escolha de clube
com tab=history. A escolha pela tabela ou sidebar preserva a aba solicitada.
Liga abre /matches, com acesso a partidas, seus duelos e classificação pelo menu.
Venda, Histórico e Escalação ficam nas abas de `/clubs/:id`.

## Jogadores

Uma única rota `/players` reúne os estados J01–J16 e E01–E03. Filtros,
ordenação e página ficam na URL. A tabela solicita dez registros por página e
usa `meta` da resposta. Busca sem acentos e cálculos de overall, valor base e
mercado pertencem à API. O formulário valida os campos e as restrições estáticas;
recusas do backend preservam `message` e não exibem sucesso antecipado.

Cadastro envia os seis atributos e potencial; edição envia somente nome,
posição, idade e agilidade. Jogador com clube não muda de posição e não tem
ação de exclusão. DOENTE não passa diretamente para APTO. O diálogo consulta a
escalação para avisar sobre a retirada de um titular ao adoecer. Cancelamento
não grava; operações pendentes impedem envios duplicados.

Endpoints: GET/POST `/players`, GET/PUT/DELETE `/players/{id}`, PATCH
`/players/{id}/condition`, GET `/clubs`, GET `/clubs/{id}/lineup` e GET `/matches`.
O menu usa clubes, totais e última partida reais. Comprar abre o destino do
mercado com o ID do jogador; tabela, menu e detalhes agora abrem a compra em
um diálogo sobre a listagem existente.

Para o ensaio completo de navegador, utilize exclusivamente um projeto Compose
novo com banco vazio, portas 13329/18089 e CORS `http://localhost:15175`.
Não use o banco principal. Na raiz, em Ubuntu:

~~~sh
MYSQL_PORT=13329 BACKEND_PORT=18089 CORS_ORIGIN=http://localhost:15175 docker compose -p passe-players-qa up --build -d --wait db backend
~~~

Na pasta frontend, com Chrome instalado e a porta 15175 livre:

~~~sh
PASSE_PLAYERS_API=http://localhost:18089 npm run test:players
~~~

No PowerShell, defina as mesmas variáveis com `$env:NOME='valor'` antes dos
comandos. O teste recusa outras origens e bancos que já tenham jogadores ou
clubes; insere sua própria liga e exerce as escritas pela API. Para repetir,
use outro nome de projeto vazio, após encerrar o anterior. `docker compose -p
passe-players-qa down` encerra somente esse projeto e preserva seu volume.
Capturas e resultados da refatoração shadcn ficam locais em
`docs/evidencias/players-shadcn/`; as evidências anteriores foram preservadas.
Com esse banco QA já populado, `npm run test:players:states` confere novamente
J05/J06 e E01/E02/E03 sem gravar registros, usando a mesma variável PASSE_PLAYERS_API.

## Clubes

Uma lista e uma página de detalhes compõem os casos C01–C11/E04/E05/E07.
Ordenação é solicitada com `sort=name`, `net_worth_desc` ou `net_worth_asc`;
o frontend mantém a ordem recebida. Cadastro envia somente nome e sigla,
valida obrigatórios/tamanhos e deixa unicidade e limite de clubes para a API.
Caixa inicial, patrimônio, contratos e todos os resultados financeiros vêm
das respostas. Limites oficiais são textos informativos, sem estimativas de caixa.

Elenco, Escalação e Histórico usam Tabs. A venda exige confirmação e mostra
valor de compra/venda, dias, multa, lucro, comissão, crédito e novo caixa.
Após a venda, clube, menu e escalação são consultados novamente, sem reload.
Histórico permite todos os tipos, compra, venda ou ambos e jogador presente
no histórico; mantém as opções ao filtrar. Os cinco totais são os de `summary`.
CSV baixa o arquivo da API com os mesmos filtros. Falhas escondem totais e
exportação e permitem tentar novamente ou limpar um filtro recusado.

Escalação possui cinco vagas por setor, sem DOENTE ou ids repetidos, nas quatro
formações oficiais. Mal condicionado pode jogar. Sem escalação salva, a prévia
começa em 2-1-1 com vagas vazias; a escolha visual não grava. Cancelar restaura
a última resposta. Salvar usa a resposta da API; uma recusa preserva `message`
e consulta clube/escalação salvos para restaurar dados consistentes. Se a
consulta também falhar, nova gravação fica bloqueada até atualizar. A prévia
do campo é CSS/SVG específico da feature; não há primitiva genérica equivalente
no catálogo shadcn. Seletores, formulários, cards e feedbacks compõem as bases
existentes. Não foram instaladas dependências nesta feature.

Comprar jogadores e o estado de elenco vazio levam a `/players?free=true`.
De lá, Comprar abre o diálogo de compra. O caminho `/transfers/buy?player_id=ID`
também é aceito e redireciona para `/players?free=true&buy=ID`.
As capturas são referências raster; não se afirma identidade de pixels, medidas
editáveis do Figma ou validação de todos os estados de hover/contraste.

Teste de navegador com Google Chrome e API/MySQL QA **isolados** em 18089,
usando o projeto QA descrito em Jogadores, nunca a base principal:

~~~sh
PASSE_CLUBS_API=http://localhost:18089 npm run test:clubs
~~~

No PowerShell: `$env:PASSE_CLUBS_API='http://localhost:18089'` e `npm run test:clubs`.
O teste usa Vite temporário em 15176 e proxy com a origem CORS de QA 15175.
Cria um clube com nome único, seis jogadores e contratos pela API de QA;
vende um titular pela interface. Não reseta nem apaga dados. Exige espaço
na liga de QA e recusa outras origens. Capturas/resultados ficam exclusivamente
locais em `docs/evidencias/clubs/`. Inclui cenários controlados de erro/vazio,
comparação com respostas reais e larguras 360/375/390/768/1366/1920.

## Negociações: compra e venda

Os estados M01–M08 e V01–V05 compõem os diálogos sobre as páginas existentes.
Comprar na tabela, no menu de ações ou nos detalhes abre `PurchasePlayerDialog`.
O formulário consulta novamente jogador e clubes, exige clube, data e hora,
interpreta a entrada como Brasília e envia `loyalty_until` com `-03:00`.
Datas futuras/limite de 1.095 dias e recusas financeiras são verificadas pela API.
Clube cheio, caixa insuficiente, recompra e disponibilidade não são bloqueados
pela tela: o pedido é enviado e o `message` é apresentado.

Antes da compra, o valor de mercado e o caixa são apenas os consultados.
Taxa/custo/novo caixa só aparecem no resultado do POST; a única soma local é
`value + fee`, permitida pela banca. O resultado inclui fidelidade, status e link
do clube. Sucesso atualiza a listagem e os indicadores do menu por novas consultas,
sem reload. Filtro por clube encontra o comprado; só livres deixa de encontrá-lo.
Falha de rede preserva entradas, não confirma operação e permite retry manual;
POSTs não são repetidos automaticamente. Uma resposta perdida não comprova
falha da gravação: numa nova tentativa a API volta a verificar o estado atual.

`ClubSaleDialog` foi adaptado: resumo do jogador, contrato consultado e aviso de
titular pela escalação real, sem impedir a venda por esse motivo. O POST não tem
corpo. O resultado usa multa, lucro/prejuízo, comissão, crédito, contrato e caixa
da API. Sem multa/fidelidade cumprida só é anunciado quando o resultado confirma.
Link Ver histórico e Fechar completam a operação. Compra e venda compartilham
TransferFacts, TransferPlayerSummary, TransferNotice e ContractStatusBadge;
essas composições usam Modal/Dialog, Alert, Badge e componentes shadcn existentes.
Não foram instaladas bibliotecas. O resultado da modal já comunica sucesso;
não há toast concorrente cobrindo seus botões no celular.

Teste de integração em QA, nunca na base principal. Na raiz, em Ubuntu, com
portas 13329 e 18089 livres:

~~~sh
MYSQL_PORT=13329 BACKEND_PORT=18089 CORS_ORIGIN=http://localhost:15175 docker compose -p passe-transfers-qa-20261022 up --build -d --wait db backend
~~~

Na pasta frontend, com Chrome instalado e porta 15177 livre:

~~~sh
PASSE_TRANSFERS_API=http://localhost:18089 npm run test:transfers
~~~

No PowerShell, defina as mesmas variáveis com `$env:NOME='valor'` e execute
os comandos. O teste aceita somente a origem QA indicada, cria um clube e
14 jogadores, compra/vende pela interface e prepara os demais contratos pela
API. Não reseta/apaga bancos ou volumes. Para repetição em base nova, use outro
nome de projeto após encerrar o anterior; nunca substitua pela base principal.
O Vite temporário usa proxy com origem CORS de QA 15175 e é encerrado ao final.
V03 (fidelidade já cumprida) usa resposta controlada para não aguardar o contrato
expirar. Falha de rede e recusa de venda também são controladas; orçamento,
elenco cheio, recompra, compra, venda, contratos e retirada de titular usam API
real. Capturas/resultados em `docs/evidencias/transfers/`, exclusivamente locais.
`npm test` inclui testes de componente da compra/venda e integração com Jogadores.

## Navegação e acesso direto

`/` preserva a Home; `/players`, `/clubs` e `/clubs/:id` carregam os módulos
independentemente da página inicial. O detalhe aceita `tab=squad`, `tab=lineup`
ou `tab=history`. Na lista de clubes, `tab=history`/`tab=lineup` orientam a
escolha do clube e são preservados ao ordenar ou usar a sidebar. O atalho Venda
orienta a escolha do clube e a ação Vender no Elenco. Liga leva a Partidas;
a Escalação continua disponível na página do clube e por `/clubs?tab=lineup`.

`/players?buy=ID` abre a compra; `/clubs?create=true` abre o cadastro. Esses
estados acompanham a URL em entrada direta, F5 e Voltar/Avançar. A compra pelo
botão também registra buy na URL, mantendo filtros existentes. Mudanças de aba
evitam registrar a mesma navegação duas vezes por eventos de foco/ativação.
`/transfers/buy?player_id=ID` permanece como redirecionamento de compatibilidade.
`/matches`, `/matches/:id` e `/standings` usam o layout compartilhado e dados da
API. Caminhos não cadastrados mostram Página não encontrada.

Na pasta frontend, com Chrome instalado e porta 15178 livre:

~~~sh
npm run test:navigation
~~~

O teste verifica entrada em nova aba/F5, Home, menu desktop/mobile, Voltar/Avançar,
abas e diálogos com respostas controladas, sem escritas. Para acrescentar consultas
GET à API real já disponível em http://localhost:8080:

~~~sh
PASSE_NAVIGATION_REAL_API=1 npm run test:navigation
~~~

No PowerShell, defina `$env:PASSE_NAVIGATION_REAL_API='1'` antes do comando.
O Vite de teste usa somente proxy GET e a origem CORS local 5173. Não inicia
containers nem altera o banco. Capturas/resultados ficam exclusivamente locais
em `docs/evidencias/navigation/`. O build não atualiza sozinho uma imagem Docker
já em execução: ela precisa ser reconstruída para receber o código atual.

## Histórico de transações, Partidas e Classificação

H01–H05 são estados da aba Histórico do clube. Filtros `type` e `player_id`
ficam na URL e acompanham Voltar/Avançar/F5; opções de jogadores vêm do histórico
completo, incluindo os nomes gravados nas transações. Filtros continuam visíveis
na falha; uma recusa exibe `message`, sem tabela ou totais antigos. Limpar filtros
preserva a aba. O `summary` e o CSV usam os mesmos filtros; nenhum total é
recalculado. Histórico vazio mostra os totais da resposta e permite baixar CSV.

L01–L04 compõem `/matches`, o diálogo `/matches?create=true` e `/matches/:id`.
O filtro `club_id` acompanha a URL. A última partida corresponde ao primeiro
resultado da lista recebida, inclusive no filtro por clube. O formulário exige
mandante e visitante distintos; escalação incompleta é avaliada pela API.
POST `/matches` envia somente os dois ids e bloqueia envio duplicado. Recusas
preservam as seleções; sucesso atualiza o resumo do menu e navega para o detalhe,
que consulta GET `/matches/{id}`. Placar, formações, condições, atributos, valores
e os seis duelos são exclusivamente os da resposta. O campo agrupa os jogadores
dos snapshots dos duelos, sem consultar o elenco/escalação atuais nem aplicar
novamente o desconto por condição.

L05 corresponde a `/standings`. Posição, números e ordem são preservados de
GET `/standings`, incluindo clubes sem partidas. Últimas partidas usam GET
`/matches` e abrem seus detalhes. Cada lista possui loading/skeleton, vazio,
erro e retry. Tabelas têm rolagem local; em celulares, os dois times do campo
ficam um abaixo do outro para manter nomes e valores legíveis.

Teste de navegador com Chrome instalado e porta 15179 livre, em `frontend/`:

~~~sh
npm run test:league
~~~

O teste usa fixtures somente no navegador de teste: filtros, totais, download
CSV, estados, criação/recusa de partida, envio único, snapshots, classificação,
URLs/F5/Voltar/Avançar e larguras 360/375/390/768/1366. Não grava dados reais.
Para acrescentar consultas à API já disponível em localhost:8080:

~~~sh
PASSE_LEAGUE_REAL_API=1 npm run test:league
~~~

No PowerShell: `$env:PASSE_LEAGUE_REAL_API='1'` e `npm run test:league`.
O proxy usa a origem CORS localhost:5173; o trecho real permite apenas GET,
compara classificação e bytes do CSV e não inicia containers. Sem partidas
existentes, detalhes/criação ficam validados com fixtures, não com escrita real.
`npm test` também cobre os filtros do histórico e o formulário de partida.
Capturas e resultados ficam em `docs/evidencias/league/`, exclusivamente locais.

## Funcionalidades não implementadas

Não há formatador configurado. Os módulos obrigatórios têm interface e estados
de lista; a implementação não significa aprovação ou cobertura do roteiro
sigiloso. A execução completa em VM Ubuntu limpa e a fidelidade pixel a pixel
não foram certificadas.

## Uso de inteligência artificial

OpenAI Codex apoiou o scaffold oficial e a adaptação de App.tsx, index.css,
index.html, package.json, Vite, Docker/Nginx e documentação. Foram aceitos template,
lint e proxy; logos/contador foram removidos e nomes ajustados. A instalação local
anterior incompleta foi substituída por scaffold e lockfile válidos. Não foram
criadas telas de negócio nesta etapa. Revisão final cabe aos mantenedores.
Na preparação do frontend, Codex apoiou a separação de app/layouts/styles,
configuração Tailwind/shadcn, cliente HTTP, testes de contrato e documentação.
Foram aceitos caminhos relativos e tratamento explícito de erros; telas completas
e tema definitivo foram adiados para a análise dos prints do Figma.
Na tela inicial, Codex analisou W01/W02 locais e apoiou os componentes home,
serviço de resumo, hook, rotas, botão shadcn, tema, Geist, ícones e testes.
Foram aceitos dados reais, ausência de liderança antes de partidas, respostas
controladas somente nos testes e adaptação mobile em uma única implementação.
Não foram aceitos números fictícios no aplicativo ou cálculos locais de classificação;
as páginas internas ficaram explicitamente pendentes. Resultados de QA estão em
evidências locais; a avaliação final da fidelidade visual cabe ao mantenedor.
Na feature Jogadores, Codex apoiou a leitura dos 19 estados, componentes
compartilhados, formulários, integração e testes. Foram mantidas as fórmulas
no backend e os relatórios de auditoria exclusivamente locais. Não houve
alterações no backend, Docker ou documentos oficiais nessa implementação.
Na refatoração visual, Codex apoiou a comparação das imagens J01–J16/E01–E03,
a adoção do código oficial shadcn/ui, composição, tokens, responsividade e
regressão. Foram descartadas as bases manuais de diálogo/menu/tabela e as
opções nativas anteriores em favor das bases shadcn. Foram preservados os
serviços, contratos, fórmulas do backend e dados reais da aplicação.
Os testes foram adaptados aos papéis acessíveis dos novos controles, mantendo
as verificações funcionais. Capturas e relatórios de comparação ficam locais.
Na feature Clubes, Codex apoiou leitura dos 14 estados raster, contratos reais,
componentes, integração e testes. Foram aceitas composições shadcn existentes,
prévia tática CSS/SVG e validação das escolhas da escalação; cálculos financeiros
permaneceram na API. Não foram alterados backend, Docker ou documentos oficiais.
Diferenças visuais e evidências ficam em documentação local de auditoria.
Na feature Negociações, Codex inspecionou M01–M08/V01–V05 e os contratos reais,
implementou a compra integrada e adaptou a venda existente. Foram reutilizadas
bases shadcn, dados da API e formatação Brasília; só o total valor + taxa é somado
na interface. Estimativas financeiras antes da confirmação foram descartadas.
Testes, matrizes e evidências de auditoria permanecem locais.
Na correção de navegação, Codex inspecionou o roteamento e reproduziu atalhos
que descartavam a aba do clube e entradas duplicadas no histórico. Foram aceitos
ajustes pontuais nos links e no estado derivado da URL, mantendo Home/layouts;
redirecionar a Home ou reestruturar a aplicação foi descartado. Rotas diretas,
F5, menu e Voltar/Avançar foram cobertos por teste de navegador, com leituras
reais da API e nenhuma escrita no banco. Registros detalhados permanecem locais.
Na etapa Histórico/Partidas/Classificação, Codex abriu as dez referências H/L,
conferiu Controllers/DTOs e compôs os módulos com shadcn e componentes existentes.
Filtros persistentes e estados de erro foram ajustados no Histórico; novos
detalhes usam os snapshots da API. Cálculos locais de placar/classificação foram
descartados. Não houve instalação de bibliotecas ou alteração de backend/Docker.
