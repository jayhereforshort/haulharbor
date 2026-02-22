# HaulHarbor

Accounting-first dashboard for resale businesses. Next.js App Router, TypeScript, Tailwind, shadcn/ui, Supabase Auth.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** + design tokens (spacing, radius, shadows)
- **shadcn-style UI** (Radix primitives, CVA, Tailwind)
- **Supabase** (Auth: email/password)

## Local development

1. **Clone and install**

   ```bash
   git clone <your-repo-url>
   cd haulharbor
   npm install
   ```

2. **Environment variables**

   Copy the example env and set your Supabase values:

   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:

   - `NEXT_PUBLIC_SUPABASE_URL` – from Supabase → Settings → API → Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` – from Supabase → Settings → API → anon public
   - `NEXT_PUBLIC_APP_URL` – `http://localhost:3000` for local

3. **Supabase Auth redirect URLs (local + Vercel)**

   In Supabase Dashboard → **Authentication** → **URL Configuration**:

   - **Site URL:** `http://localhost:3000` for local dev; set to your Vercel URL (e.g. `https://haulharbor.vercel.app`) for production.
   - **Redirect URLs:** add both so auth works locally and after deploy:
     - `http://localhost:3000/**`
     - `https://your-app.vercel.app/**` (replace with your actual Vercel URL)

4. **Run dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000). Use **Sign up** to create an account, then **Log in** and open **Dashboard** at `/app`.

## GitHub (repo-ready)

- **.gitignore** – ignores `node_modules`, `.next`, `.env`, `.env*.local`, `.vercel`, etc.
- **Scripts:** `npm run dev`, `npm run build`, `npm run start`, `npm run lint`

**Push to GitHub (manual):**

```bash
git remote add origin https://github.com/<your-org>/<your-repo>.git
git add .
git commit -m "Initial commit: Next.js + Supabase Auth + dashboard"
git push -u origin main
```

(Do not automate pushing; run these commands when you are ready.)

## Vercel deployment

1. **Connect repo**

   - Vercel → Add New Project → Import your GitHub repo.
   - Framework: Next.js (auto-detected). Build command: `next build`. Output: default.

2. **Environment variables (Vercel)**

   In Project → Settings → Environment Variables, add:

   | Name                         | Value                    | Environments   |
   | ---------------------------- | ------------------------ | -------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`   | Your Supabase project URL| Production, Preview |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview |
   | `NEXT_PUBLIC_APP_URL`        | `https://your-app.vercel.app` | Production (and Preview if you use custom domains) |

   Replace `your-app.vercel.app` with your actual Vercel URL.

3. **Supabase redirect URLs**

   In Supabase → Authentication → URL Configuration:

   - **Site URL:** set to `https://your-app.vercel.app`
   - **Redirect URLs:** include `https://your-app.vercel.app/**`

4. **Deploy**

   Push to `main` (or trigger a deploy from Vercel). After deploy, confirm:

   - Marketing page loads at `https://your-app.vercel.app`
   - Sign up / Log in work and redirect to `/app` after auth
   - Dashboard and Design page load when logged in

## Project structure

- `app/` – routes
  - `page.tsx` – marketing landing (hero, features, CTA)
  - `(auth)/login`, `(auth)/signup` – Supabase email/password auth
  - `(app)/app/` – authenticated app
    - `layout.tsx` – auth check + app shell (sidebar, topbar, mobile nav)
    - `page.tsx` – dashboard (KPI cards + empty-state guidance)
- `components/` – `ui/` (design system), `app-shell.tsx`
- `lib/` – `utils.ts`, `supabase/` (client, server, middleware)
- `supabase/sql_history/` – SQL snapshots from MCP-applied schema changes (when used)

## Design system

- **Tokens:** `app/globals.css` – spacing, radius, shadows, semantic colors
- **Typography:** `.text-display`, `.text-heading`, `.text-subheading`, `.text-body`, `.text-caption`
- **Components:** Card, Table, Badge, Button, Input, Dialog, Toast, Skeleton, EmptyState

## Auth

- Supabase Auth with email/password.
- Middleware refreshes session and sets cookies.
- `/app` and `/app/*` require auth; unauthenticated users redirect to `/login`.
