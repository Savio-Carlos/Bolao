# ⚽ Bolão da Copa do Mundo 2026

Site de bolão entre amigos para a Copa de 2026. Os jogos e resultados são
buscados e atualizados **automaticamente**; cada amigo entra com um nome de
usuário, dá seus palpites e disputa o ranking.

- **Pontuação:** 10 pontos pelo placar exato, 5 por acertar o vencedor/empate, 0 se errar.
- **Cobertura:** Copa inteira (fase de grupos + mata-mata). Os jogos do mata-mata
  aparecem sozinhos conforme os times são definidos.
- **Login:** só nome de usuário. O admin (você) cadastra os amigos antes.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Postgres (DigitalOcean Managed Database) via Prisma
- Sessão por cookie (iron-session)
- Dados dos jogos: [football-data.org](https://www.football-data.org) (plano grátis),
  com fallback para o dataset público `openfootball/worldcup.json`

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha:

| Variável                | Para quê |
|-------------------------|----------|
| `DATABASE_URL`          | String de conexão do Postgres. No DigitalOcean, use a string fornecida e adicione `?sslmode=require`. |
| `FOOTBALL_DATA_API_KEY` | Chave grátis em https://www.football-data.org/client/register. Se ficar vazia, usa o fallback openfootball. |
| `SESSION_SECRET`        | Segredo do cookie (32+ caracteres). Gere com `openssl rand -base64 32`. |
| `SYNC_SECRET`           | Protege o endpoint `/api/sync` usado pelo cron. Use outro valor aleatório. |
| `ADMIN_USERNAME`        | Seu nome de usuário admin, criado pelo seed. |

## Rodando localmente

Você precisa de um Postgres acessível (pode ser o próprio banco do DigitalOcean,
que aceita conexão externa). Com o `.env` preenchido:

```bash
npm install
npm run db:push     # cria as tabelas no banco
npm run db:seed     # cria o usuário admin (ADMIN_USERNAME)
npm run dev         # http://localhost:3000
```

Entre com o `ADMIN_USERNAME`, vá em **Admin**, cadastre os amigos e clique em
**Sincronizar agora** para carregar os jogos.

## Deploy no DigitalOcean

1. **Banco:** crie um *Managed Database → PostgreSQL*. Copie a *connection string*
   (formato `postgresql://...`) e adicione `?sslmode=require` no fim.
2. **App:** suba este repositório no GitHub e crie um *App Platform → Web Service*
   apontando para ele. O App Platform detecta Next.js automaticamente
   (build: `npm run build`, run: `npm start`).
3. **Env vars do App:** configure `DATABASE_URL`, `FOOTBALL_DATA_API_KEY`,
   `SESSION_SECRET`, `SYNC_SECRET` e `ADMIN_USERNAME` nas *App-Level Environment
   Variables* (marque `DATABASE_URL`, `SESSION_SECRET` e `SYNC_SECRET` como *encrypted*).
4. **Criar as tabelas e o admin** (uma vez, da sua máquina, apontando para o banco do DO):
   ```bash
   DATABASE_URL="postgresql://...sslmode=require" npm run db:push
   DATABASE_URL="postgresql://...sslmode=require" ADMIN_USERNAME="carlos" npm run db:seed
   ```
5. **Atualização automática:** o arquivo `.github/workflows/sync.yml` chama
   `/api/sync` a cada 10 minutos. Nos *Secrets* do repositório no GitHub
   (Settings → Secrets and variables → Actions) crie:
   - `APP_URL` = a URL pública do app (ex.: `https://bolao-xxxx.ondigitalocean.app`)
   - `SYNC_SECRET` = o mesmo valor configurado no App.

   Pronto: os resultados passam a atualizar sozinhos. Você também pode forçar a
   qualquer momento pelo botão **Sincronizar agora** na área de Admin.

## Como funciona a sincronização

`POST /api/sync` busca todos os jogos da competição, faz *upsert* no banco
(cria novos, atualiza placar/status e os times do mata-mata) e recalcula a
pontuação de todos os palpites de jogos encerrados. É idempotente — rodar várias
vezes não duplica nada. O endpoint aceita o header
`Authorization: Bearer <SYNC_SECRET>` (cron) ou uma sessão de admin (botão).
