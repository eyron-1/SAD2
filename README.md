# Barangay Transparency System

A multi-tenant web app that lets any barangay publish its budget, expenses,
programs, and officials — and lets residents send feedback — without residents
ever needing an account. Officials (Captain, Secretary, Treasurer, Kagawad,
Staff, SK Chairperson, SK Treasurer, SK Kagawad) log in to manage their own
barangay's data. One deployment, one database, unlimited barangays — each
gets its own public URL like `/b/san-isidro`.

**Stack:** React + Vite · Supabase (Postgres, Auth, Storage) · Firebase Hosting.

---

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor**, paste the contents of `supabase/schema.sql`, and run it.
   This creates every table, the multi-tenant Row Level Security policies, and
   the role-permission helper functions.
3. Open **Storage** and create three buckets, all set to **public**:
   - `feedback-photos`
   - `receipts`
   - `barangay-logos`
4. Open **Project Settings → API** and copy the **Project URL** and **anon public key**.

## 2. Configure the app

```bash
cp .env.example .env
# paste your Supabase URL and anon key into .env
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

## 3. Create the first barangay + official account

Go to `/signup`, choose **Set up new barangay**, fill in the barangay's name
and a URL slug (e.g. `san-isidro` → the public portal becomes `/b/san-isidro`),
and pick your role. The first Captain/Secretary/Treasurer account for a
barangay should sign up this way; everyone after that picks **Join existing**.

Only **Captain, Secretary, and Treasurer** can create/edit/delete barangay
financial and program records. Only **SK Chairperson and SK Treasurer** can
edit SK records. Everyone else (Kagawad, Staff, SK Kagawad) gets read-only
access to their own barangay's dashboard. This is enforced twice: in the UI
(`src/utils/roles.js`) and — more importantly — in the database itself via
the RLS policies in `schema.sql`, so it can't be bypassed by calling the API
directly.

## 4. AI Assistant (optional but recommended)

The AI Assistant (report drafting, inquiries, budget forecasting,
accomplishment reports) is powered by Groq (Llama 3.3 70B Versatile). It can run either:
1. Via the Supabase Edge Function (`supabase/functions/ai-assistant`) using a server-side `GROQ_API_KEY`.
2. Directly from the browser using a free Groq API key entered in the in-app AI Assistant page or in `.env` (`VITE_GROQ_API_KEY`).

To deploy the Edge Function:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy ai-assistant
supabase secrets set GROQ_API_KEY=gsk_your_groq_api_key_here
```

## 5. Deploy to Firebase Hosting

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # choose "Use an existing project" if prompted, point public dir to "dist"
npm run build
firebase deploy
```

`firebase.json` is already configured to serve `dist/` with SPA rewrites so
React Router's client-side routes work on refresh.

---

## Project Structure Overview

```
.
├── .env.example              — Environment variables template
├── jsconfig.json             — Path aliases configuration (@/* -> src/*)
├── vite.config.js            — Vite configuration with '@' alias
├── tailwind.config.js        — Tailwind theme (civic colors, fonts)
├── firebase.json             — Firebase hosting configuration
├── supabase/
│   ├── schema.sql            — Full database schema + RLS policies + triggers
│   └── functions/
│       └── ai-assistant/     — Supabase Edge Function (Groq Llama 3.3 70B)
└── src/
    ├── main.jsx              — React DOM root mount
    ├── App.jsx               — Central router (public, auth, official, sk routes)
    ├── index.css             — Global styling & Tailwind custom component classes
    ├── context/
    │   └── AuthContext.jsx   — Authentication & user profile state provider
    ├── lib/
    │   ├── supabaseClient.js — Supabase client initialization
    │   ├── validation.js     — Form regex validators & error messaging
    │   ├── useSupabaseTable.js — Reusable CRUD hook for Supabase tables
    │   └── usePublicBarangay.js — Hook to fetch barangay by URL slug (/b/:slug)
    ├── utils/
    │   └── roles.js          — Role definitions & permission helper functions
    ├── components/
    │   ├── index.js
    │   ├── ai/
    │   │   └── FloatingAIChat.jsx — Floating widget for quick AI queries
    │   ├── layout/
    │   │   ├── index.js      — Barrel export for layouts
    │   │   ├── PublicLayout.jsx  — Layout for public barangay portal
    │   │   ├── OfficialLayout.jsx — Sidebar layout for barangay officials
    │   │   └── ProtectedRoute.jsx — Route guard checking session & role
    │   └── ui/
    │       ├── index.js      — Barrel export for common UI elements
    │       ├── FormField.jsx — Standardized input/textarea field with error label
    │       ├── ErrorBanner.jsx — Alert box for error messages
    │       └── Badge.jsx     — Status & category pill badges
    └── pages/
        ├── auth/             — Sign in and register (Login.jsx, Signup.jsx)
        ├── public/           — Citizen-facing portal without login (Landing, Budget, Programs, Officials, Feedback)
        ├── official/         — Barangay Council portal (Dashboard, Budget, Expenses, Funds, Programs, Feedback, Officials, Reports, AI, Settings)
        └── sk/               — Sangguniang Kabataan portal (SKDashboard, SKBudget, SKPrograms, KKMonitoring)
```

### The pattern every module follows

`BudgetManagement.jsx` is the reference implementation — copy its shape for
any new module:

1. `useSupabaseTable('table_name', profile.barangay_id)` for data + CRUD.
2. A `validators` map from `lib/validation.js`, run through `runValidators()`
   on submit — every field gets the same regex/required checks and the same
   error-message shape.
3. `isBarangayEditor(profile.role)` (or `isSkEditor`) gates whether the
   create/edit form even renders. Read-only users just see the table.
4. `ErrorBanner` for both query errors and submit errors — never a silent
   failure.

Because every module shares this pattern, adding a new one (say, a new
"Infrastructure Projects" tracker) means: add a table + RLS policies to
`schema.sql`, copy `BudgetManagement.jsx`, rename the fields, add a route in
`App.jsx` and a nav link in `OfficialLayout.jsx`. Nothing else changes.

### Multi-tenancy

Every table has a `barangay_id` column. RLS policies check
`belongs_to_barangay(auth.uid(), barangay_id)` before allowing writes, so one
official can never touch another barangay's data even if they guess a
record's ID. Public read policies (`using (true)`) make budgets, expenses,
programs, and the officials roster visible to anyone — that's the
transparency part — while `feedback` and `kk_monitoring` stay private to that
barangay's own officials.

### Officials transition (election handover)

`OfficialsTransition.jsx` lets an editor log a transition: pick the position,
the outgoing official (optional, for a brand-new seat), the incoming
official, and the new term dates. Saving a transition automatically marks
the outgoing official `is_active = false`, so they drop off the public
roster while the transition record itself stays as a permanent audit trail.

---

## What's deliberately left for you to extend

This scaffold is complete and functional end-to-end, but a couple of things
are intentionally minimal so you can shape them to your barangay's exact
paperwork:

- **Report/PDF export formatting** — `ReportsAnalytics.jsx` exports raw CSV.
  If you need a formatted PDF (with barangay letterhead), that's a good next
  addition using a PDF library, following the same "pull from
  `useSupabaseTable`, render, download" shape.
- **Email notifications** — e.g. notifying a treasurer when new feedback
  arrives — would go in a second Edge Function, triggered by a Postgres
  webhook on `insert into feedback`.
- **Photo cropping/compression** before upload — currently the app validates
  type and a 5MB size cap but uploads the file as-is.
