# Backend Luminus Service Digital

## Como rodar

1. Instale as dependências:
   ```bash
   npm install
   ```

2. Inicie o servidor:
   ```bash
   node server.js
   ```

O backend ficará disponível em http://localhost:4000

## Rotas disponíveis

- `GET /api` — retorna todos os dados do site
- `PUT /api` — atualiza todos os dados do site
- `GET /api/:section` — retorna uma seção específica (ex: hero, sobre, servicos, projetos, depoimentos, footer, header)
- `PUT /api/:section` — atualiza uma seção específica

Os dados são salvos no arquivo `db.json`. 