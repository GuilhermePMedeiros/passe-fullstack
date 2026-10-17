# PasseFrontend

Estrutura inicial do Passe, criada pelo gerador oficial create-vite 6.5.0,
template react-ts. React 19, TypeScript 5.8 e Vite 6; Node.js 20.20.2 com npm
10.8.2 utilizado na validação. Node 20 ou 22 é permitido pela prova; este projeto
declara Node ^20.20.2 ou ^22.12.0. Versões exatas instaladas estão no
package-lock.json. Sem telas ou cálculos de negócio.

## Instalação e execução

Para instalar e executar em ambiente limpo, siga primeiro o
[README da raiz](../README.md#3-instalação-e-execução--caminho-principal-da-banca):
`docker compose up --build -d --wait --wait-timeout 300` constrói interface,
API e MySQL sem instalar npm no computador. O frontend compilado é servido
por Nginx em http://localhost:5173. Nenhuma variável/credencial de banco chega ao navegador.

### Desenvolvimento local

Com Node.js 22.12.0 e npm, e os containers backend/frontend parados para liberar
as portas, use os comandos abaixo. Node 20.20.2 também foi validado localmente.

Na pasta frontend, no Ubuntu 24.04 ou PowerShell:

```sh
npm ci
npm run dev
```

Execute `npm ci` apenas na primeira preparação ou quando o lockfile mudar.
No dia a dia, basta `npm run dev`. Pare com `Ctrl+C`.
O servidor fica em http://localhost:5173, com porta fixa.

Para verificar o código e gerar a versão de entrega:

```sh
npm run lint
npm run build
```

Para conferir o build gerado:

```sh
npm run preview
```

Preview em http://localhost:4173. Os comandos de build e lint terminam sozinhos.
Não há teste de componente/e2e nem formatador configurado nesta etapa; não há
atendimento integral ao diferencial F5. Nenhuma instalação global é necessária.

## Variáveis, estrutura e bibliotecas

O frontend ainda não usa variáveis de ambiente, conforme .env.example. Não há
credenciais MySQL no navegador. A futura API fica em http://localhost:8080/api/v1;
consumo e camada de cliente ainda não implementados.

src/main.tsx inicializa React; src/App.tsx exibe apenas identificação inicial;
src/index.css contém estilo básico; vite.config.ts configura plugin e portas;
tsconfig*.json habilitam TypeScript estrito. React/React DOM renderizam a tela;
Vite e plugin React fornecem desenvolvimento/build; TypeScript e tipos verificam
código; ESLint, typescript-eslint e plugins React verificam convenções/hooks;
globals define o ambiente de navegador. As bibliotecas além da stack são apenas
ferramentas locais de desenvolvimento, declaradas em package.json.
Dockerfile usa a imagem pública Node para compilar e Nginx para servir os
arquivos estáticos; nginx.conf preserva futuras rotas da interface.

## Decisões e premissas

Nome exibido PasseFrontend e package npm passe-frontend (minúsculas, convenção
npm); diretório frontend/ preservado conforme enunciado. O template oficial foi
reduzido à identificação do projeto; contador e logos foram removidos.
Não há fidelidade visual exigida ao mockup. O nome Passe foi adotado a partir
da referência ao mockup do enunciado.

## Funcionalidades não implementadas

Todos os itens F01–F14, formulários, integração API, feedback e estados de listas,
responsividade das telas de negócio, testes de interface e formatação.

## Uso de inteligência artificial

Codex auxiliou a recriação usando o template oficial react-ts e a adaptação de
App.tsx, index.css, index.html, package.json, configuração Vite e documentação,
para validar apenas a estrutura sem funcionalidades. Foram aceitos o template e
as ferramentas de lint; removidos logos e contador; nomes ajustados por instrução
do candidato. Instalação do scaffold anterior não concluída foi substituída por
nova instalação local e lockfile.
