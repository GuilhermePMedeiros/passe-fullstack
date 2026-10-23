# PasseFrontend

Interface React 19.3.1, TypeScript 5.8.3 e Vite 6.4.4, com componentes shadcn/ui,
Tailwind CSS e integração com a API. O `package-lock.json` versionado fixa as
versões instaladas por `npm ci`.

## Execução com Docker

Siga a [instalação principal](../README.md#instalação-e-execução-do-zero).
Na raiz, com Docker Linux e Compose v2.20+:

```sh
docker compose up --build -d --wait --wait-timeout 300
```

Interface: **http://localhost:5173/**. Origem da API: **http://localhost:8080**.
Não é necessário Node.js no host. O build usa Node.js 22.14.0, `npm ci`, lint e
compilação. Nginx 1.28 serve os arquivos, atende F5 nas rotas e encaminha `/api/`
para `backend:8080`, preservando caminho e query string. O navegador usa `/api/v1`.

Após alterar o código, repita o comando com `--build`; `restart` não recompila.
Encerramento e persistência estão no README principal.

## Desenvolvimento local

Requer Node.js 22.14.0 com npm (o `package.json` também aceita `^20.20.2` ou
`^22.12.0`). Use um único frontend na porta oficial 5173. Na raiz, escolha o
modo Vite, preservando banco e API:

```sh
docker compose stop frontend
docker compose up --build -d --wait --wait-timeout 300 db backend
cd frontend
npm ci
npm run dev
```

Vite atende http://localhost:5173 e faz proxy de `/api` para http://localhost:8080.
O bind é `127.0.0.1` com `strictPort`: porta ocupada faz o comando falhar.
Encerre com Ctrl+C. Para voltar ao Docker, execute o comando integrado na raiz.

## Rotas e funcionalidades

Todas usam a navegação existente a partir da Home:

| Rota | Funcionalidade |
| --- | --- |
| `/` | Resumo real da liga e acesso aos módulos |
| `/players` | Paginação, busca, filtros, ordenação, cadastro, edição, condição, detalhes e exclusão lógica |
| `/players?free=true` | Jogadores livres e compra com fidelidade e resultado |
| `/clubs` | Lista por nome/patrimônio e criação de clube |
| `/clubs/:id` | Elenco, contratos e venda com confirmação/resultado |
| `/clubs/:id?tab=history` | Transações, filtros, totais da API e download CSV |
| `/clubs/:id?tab=lineup` | Formação, cinco titulares e aviso de escalação incompleta |
| `/matches` | Histórico com filtro por clube e criação de partida |
| `/matches/:id` | Placar, formações e seis duelos históricos da API |
| `/standings` | Classificação na ordem devolvida pela API |

Os identificadores são os recursos cadastrados. Compra também abre por
`/players?buy=ID`; cadastro de clube e partida usam `?create=true` nas listas.
`/transfers/buy?player_id=ID` redireciona para a compra em Jogadores.

## Testes, lint e build

Na pasta `frontend`, após `npm ci`:

```sh
npm run lint
npm test
npm run build
```

`npm test` executa `vitest run`, termina sozinho e inclui testes de componente,
formulários, serviços e cliente HTTP com respostas controladas. Não exige API
ou banco. O build verifica tipos com TypeScript e gera `dist/`; lint usa ESLint.
Não existe comando de formatação configurado.

Para verificar o Nginx já iniciado na URL oficial, com Google Chrome estável
instalado e as dependências npm disponíveis:

```sh
npm run test:official
```

Esse teste não inicia outro servidor nem grava na API. Verifica Home, rotas,
menu, acesso direto, F5, Voltar/Avançar, proxy e 375 px; inclui estados controlados
no navegador e consultas reais. Detalhes de clubes e partidas dependem dos dados
existentes; com banco vazio, esses cenários específicos não são comprovados.
Capturas e resultados ficam em `docs/evidencias/url-oficial/`, ignorados pelo Git.

## Variáveis de ambiente e integração

O frontend **não usa variáveis de ambiente**, inclusive para a origem da API.
[.env.example](.env.example) registra essa condição. `src/lib/api.ts` usa
`/api/v1`; `vite.config.ts` e `nginx.conf` definem os proxies dos dois modos.
Não coloque senhas em variáveis `VITE_*`: elas são públicas no navegador.
CORS da API usa `CORS_ORIGIN`, documentada no [README principal](../README.md#variáveis-de-ambiente).

## Estrutura e bibliotecas

- `src/app/`: aplicação, roteador e layouts.
- `src/features/`: `home`, `players`, `clubs`, `transfers`, `matches` e `standings`,
  com páginas, componentes, serviços, tipos e testes conforme a funcionalidade.
- `src/components/layout/` e `src/components/ui/`: navegação e bases reutilizáveis.
- `src/lib/`: cliente HTTP, erros, formatação e utilitários.
- `src/hooks/`, `src/services/` e `src/styles/`: recursos compartilhados.
- `tests/`: automações de navegador; `nginx.conf`: servidor de produção e proxy.

| Ferramenta/biblioteca | Finalidade |
| --- | --- |
| `react`, `react-dom` | Componentes, estado e renderização |
| `vite`, `@vitejs/plugin-react` | Servidor de desenvolvimento e build React |
| `typescript`, `@types/node`, `@types/react`, `@types/react-dom` | Verificação de tipos da aplicação e configuração |
| `tailwindcss`, `@tailwindcss/vite` | Estilos utilitários e integração ao Vite |
| `eslint`, `@eslint/js`, `typescript-eslint`, `globals` | Análise estática e regras JavaScript/TypeScript |
| `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` | Regras de hooks e compatibilidade com Fast Refresh |
| `vitest` | Execução dos testes unitários e de componente |

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

As bases shadcn/ui são código-fonte local em `src/components/ui/`, reutilizado
pelos componentes do Passe. Licença em [LICENSE.shadcn](LICENSE.shadcn).

## Decisões e premissas

React Router funciona no modo biblioteca. Filtros, abas e diálogos aplicáveis
acompanham a URL. Chamadas HTTP ficam na camada própria; mensagens de recusa
preservam o `message` da API e ações pendentes bloqueiam envio duplicado.

Valores, totais, duelos e classificação vêm da API; somente valor + taxa é somado
para mostrar o custo da compra. Datas digitadas são interpretadas como Brasília
e enviadas com `-03:00`; apresentação monetária usa duas casas e vírgula decimal.
Tabelas podem rolar dentro do próprio quadro em telas pequenas.

## Funcionalidades não implementadas

Não há formatador configurado. Limitações gerais e declaração de
[uso de inteligência artificial](../README.md#uso-de-inteligência-artificial)
estão no README principal e abrangem a interface e seus testes.
