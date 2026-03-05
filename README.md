# Tax

AI bookkeeping & tax-prep for US freelancers, LLCs, and S-Corps (Irvine, CA).  
**Phase 1:** Next.js 15 + Supabase (auth, PostgreSQL, storage) + Plaid bank sync.  
**도메인:** tax.mongoori.com · **포트:** 4150 (4/15 세금 신고일)

## Stack

- **Frontend:** Next.js 15 App Router, Tailwind CSS, TypeScript
- **Backend:** Next.js API routes, Supabase (auth, Postgres, storage)
- **Banking:** Plaid (sandbox → production), encrypted access tokens
- **Deploy:** Docker + **Coolify** (로컬 미니PC 등 셀프호스팅)

## Setup

1. **Clone and install**
   ```bash
   cd tax && npm install
   ```

2. **Supabase**
   - Create a project at [supabase.com](https://supabase.com).
   - Run the migration: `supabase/migrations/20250304000000_initial_schema.sql` in the SQL Editor (or use Supabase CLI).
   - In Authentication → URL Configuration, set Site URL and add redirect URL: `http://localhost:3000/auth/callback`.

3. **Plaid**
   - Get keys at [dashboard.plaid.com/developers/keys](https://dashboard.plaid.com/developers/keys) (use Sandbox for dev).
   - In Plaid Dashboard → Developers → Webhooks, set webhook URL to `https://your-domain.com/api/plaid/webhook` (optional for sandbox).

4. **Environment**
   ```bash
   cp .env.example .env
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `PLAID_CLIENT_ID`, `PLAID_SECRET` (sandbox secret for dev)
   - `PLAID_TOKEN_ENCRYPTION_KEY` (min 32 characters, e.g. `openssl rand -base64 32`)
   - Optionally `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`), `PLAID_WEBHOOK_SECRET` (production)

5. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000). Sign up, then connect a bank via Plaid (use Sandbox test credentials).

---

## Coolify 배포 (로컬 미니PC)

서버를 로컬 미니PC에서 Coolify로 돌리는 경우 아래 순서로 배포하면 됩니다.

### 1. 저장소 준비

- 이 프로젝트를 Git 저장소에 푸시해 두세요 (GitHub/GitLab 등).
- Coolify에서 해당 저장소를 연결할 수 있어야 합니다.

### 2. Coolify에서 서비스 생성

1. **New Resource** → **Application** 선택.
2. **Source**: Git 저장소 연결 (저장소 URL, 브랜치, 필요 시 인증).
3. **Build Pack**: **Dockerfile** 선택.
4. **Dockerfile 위치**: 프로젝트 루트의 `Dockerfile` 사용 (기본값).
5. **Port**: 앱 기본 포트 **4150** (4/15 세금 신고일). Coolify에서 컨테이너 포트 4150으로 노출하고, NPM에서는 `https://tax.mongoori.com` → `http://192.168.1.188:4150` 프록시 설정.

### 3. 환경 변수 설정

Coolify 대시보드에서 해당 서비스 **Environment Variables**에 아래를 넣으세요.

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (서버 전용) |
| `PLAID_CLIENT_ID` | ✅ | Plaid 클라이언트 ID |
| `PLAID_SECRET` | ✅ | Plaid 시크릿 (sandbox/development/production) |
| `PLAID_TOKEN_ENCRYPTION_KEY` | ✅ | 32자 이상 (예: `openssl rand -base64 32`) |
| `NEXT_PUBLIC_PLAID_ENV` | | `sandbox` / `development` / `production` (기본: sandbox) |
| `NEXT_PUBLIC_APP_URL` | 권장 | 앱 접속 URL (예: `https://tax.mongoori.com`) |
| `PLAID_WEBHOOK_SECRET` | | 프로덕션 웹훅 검증용 (선택) |

**중요:** `NEXT_PUBLIC_APP_URL`에는 Coolify에서 매핑한 실제 접속 URL(도메인)을 넣어 두세요. Supabase 인증 리다이렉트와 Plaid 리다이렉트에 사용됩니다.

### 4. Supabase / Plaid 설정

- **Supabase**  
  Authentication → URL Configuration에서  
  - **Site URL**: `NEXT_PUBLIC_APP_URL`과 동일 (예: `https://tax.mongoori.com`)  
  - **Redirect URLs**: `https://tax.mongoori.com/auth/callback` 추가  

- **Plaid** (프로덕션 시)  
  Webhooks URL: `https://tax.mongoori.com/api/plaid/webhook`  
  (sandbox는 필요 시 나중에 설정)

### 5. 빌드 및 실행

- Coolify에서 **Deploy** 실행.
- Dockerfile 기준으로 빌드 후 컨테이너가 실행됩니다.
- 포트는 Coolify가 설정한 대로 사용되며, Next.js는 `PORT` 환경 변수를 읽습니다.

### 로컬에서 Docker만 테스트

```bash
# 빌드
docker build -t tax .

# 실행 (env 파일 사용)
docker run -p 4150:4150 --env-file .env tax
```

또는 `docker-compose.yml` 사용:

```bash
# .env 파일 채운 뒤
docker compose up -d
```

---

## Phases

See [PHASES.md](./PHASES.md) for the full roadmap:

- **Phase 1 (done):** Setup, Supabase, Plaid Link + exchange + sync + webhook, dashboard + transaction list.
- **Phase 2:** AI categorization + deduction engine (Claude, few-shot, RAG), receipt OCR.
- **Phase 3:** Dashboard charts, dark mode, PWA, user overrides.
- **Phase 4:** Schedule C export, tax estimate, TurboTax/CPA export, production polish.

## Project layout

- `src/app/` — App Router pages and API routes
- `src/components/` — React components (PlaidLinkButton, TransactionsList, etc.)
- `src/lib/` — Supabase clients, Plaid client/sync, encryption
- `src/types/` — DB types
- `supabase/migrations/` — SQL schema and RLS

## License

MIT.
