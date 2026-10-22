# PasseFrontend

Estrutura inicial React 19, TypeScript 5.8 e Vite 6, criada com o template oficial
react-ts do create-vite 6.5.0. As telas de jogadores, clubes, mercado e liga ainda
não foram implementadas. O servidor estático e a comunicação por proxy estão preparados.

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
A página inicial ainda não faz consultas de negócio. Instruções completas no
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
npm run build
~~~

npm run preview permite conferir assets em http://localhost:4173, sem o proxy
de desenvolvimento; para testar a comunicação integrada, use Docker ou npm run dev.

## Variáveis, estrutura e bibliotecas

Não há variáveis VITE_* necessárias. Nunca coloque senhas nessas variáveis:
seu conteúdo é público no navegador. .env.example explica essa restrição.
src/main.tsx inicializa React; src/App.tsx mostra a identificação inicial;
src/index.css fornece estilos; vite.config.ts define plugin, portas e proxy;
nginx.conf define rotas estáticas e proxy de produção. tsconfig*.json configura
TypeScript estrito. React/React DOM renderizam a interface; Vite e plugin React
constroem assets; TypeScript/tipos verificam o código; ESLint, typescript-eslint,
globals e plugins React verificam convenções e hooks. Versões exatas no lockfile.

## Decisões e premissas

O template foi reduzido à identificação do projeto, removendo logos e contador.
O proxy usa caminhos relativos, evitando URLs de máquinas específicas no bundle.
Fórmulas e regras de negócio pertencem ao backend.

## Funcionalidades não implementadas

Telas de negócio, formulários, consumo de dados nos componentes, feedback/estados
de listas, responsividade dessas telas, testes de interface e formatador.

## Uso de inteligência artificial

OpenAI Codex apoiou o scaffold oficial e a adaptação de App.tsx, index.css,
index.html, package.json, Vite, Docker/Nginx e documentação. Foram aceitos template,
lint e proxy; logos/contador foram removidos e nomes ajustados. A instalação local
anterior incompleta foi substituída por scaffold e lockfile válidos. Não foram
criadas telas de negócio nesta etapa. Revisão final cabe aos mantenedores.
