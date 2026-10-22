# PasseFrontend

Base React 19, TypeScript 5.8 e Vite 6, criada com o template oficial
react-ts do create-vite 6.5.0. A estrutura de aplicação, Tailwind CSS, configuração
para shadcn/ui e cliente HTTP estão preparados. A tela inicial W01/W02 foi
implementada a partir das imagens locais, com estatísticas reais e navegação.
A rota `/players` implementa listagem, filtros, cadastro, edição, condição,
detalhes e exclusão lógica com a API real. Clubes, mercado e liga continuam pendentes.

## Instalação com Docker

Na raiz do repositório, com Docker Engine/Desktop e Compose v2.20+ em execução:

~~~sh
docker compose up --build -d
~~~

Interface em http://localhost:5173. Não é necessário instalar Node.js no host.
O build usa Node.js 22.14.0, npm ci com package-lock.json, lint e compilação de
produção. Nginx 1.28 serve os assets e preserva rotas da interface.
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

npm run preview permite conferir assets em http://localhost:4173, sem o proxy
de desenvolvimento; para testar a comunicação integrada, use Docker ou npm run dev.

## Variáveis, estrutura e bibliotecas

Não há variáveis VITE_* necessárias. Nunca coloque senhas nessas variáveis:
seu conteúdo é público no navegador. .env.example explica essa restrição.
src/main.tsx inicializa React; src/app/App.tsx configura o BrowserRouter;
src/app/router.tsx configura início, jogadores e destinos ainda pendentes;
src/app/layouts/MainLayout.tsx fornece o contêiner da aplicação;
src/features/home separa página, componentes, hook, serviço, tipos e testes;
src/features/players organiza a experiência de jogadores na mesma estrutura;
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
Fetch diretamente. Iniciar vai para /players; Compra preserva free=true/action=buy;
Venda e Histórico direcionam a /clubs com contexto na query; Liga vai para
/matches. Jogadores está funcional; os demais destinos ainda não executam seus fluxos.

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
mercado com o ID do jogador; a compra ainda não está implementada na interface.

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

## Funcionalidades não implementadas

Telas de clubes, mercado e liga, sua responsividade e formatador. A responsividade do F5 exige jogadores e página do clube com
histórico utilizáveis a 375 px, sem rolagem horizontal da página e com todas as
ações acessíveis; tabelas podem rolar dentro do próprio quadro. A página do clube
com histórico ainda precisa ser implementada e validada para completar esse critério.

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
