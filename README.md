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
3. In the SQL Editor, run `supabase/storage.sql`. This creates the storage
   buckets and access policies. The KK ID-document bucket is private and can
   only be viewed by active SK officials in the matching barangay.
4. Run `supabase/migrations/migration_audit_history.sql` in the SQL Editor to enable the
   barangay- and SK-scoped audit history.
5. Run `supabase/migrations/migration_transparency_documents.sql` to enable public
   document uploads and resident downloads.
6. Open **Project Settings → API** and copy the **Project URL** and **anon public key**.

## 2. Configure the app

Create a `.env` file in the project root with your Supabase project URL and anon
key:

```dotenv
VITE_SUPABASE_URL=your-supabase-project-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Then install dependencies and start the app:

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`.

For password recovery, add the local and deployed `/reset-password` URLs to
**Supabase Dashboard → Authentication → URL Configuration → Redirect URLs**.
The app sends reset emails back to the same origin where the request was made.

## Upgrade an existing Supabase database

Keep the existing schema and security/financial workflow migrations in their
deployed state before applying any additional SQL. Do not rerun `schema.sql`
against an existing database; it contains destructive drop statements.

To enable the audit history page, run `supabase/migrations/migration_audit_history.sql`
after the base schema and profile/security migrations, including
`supabase/migrations/migration_sk_data_isolation.sql` when SK isolation is enabled. If SK
milestones are installed, run the audit migration after their migration too.
It records authenticated changes from that point forward and does not
reconstruct earlier changes.
Audit entries are append-only for app users and separated between Barangay and
SK portals. Feedback content, contact details, receipt links, and KK personal
profile details are deliberately excluded from recorded snapshots.

To link milestones to SK programs, run `supabase/migrations/migration_sk_program_milestones.sql`
after the operations migration. Existing barangay milestones remain linked and
unchanged.

For public KK profiling and ID-document uploads, first run
`supabase/migrations/migration_kk_public_profiling.sql` if it has not already been applied,
then run `supabase/migrations/migration_kk_id_documents.sql`. This adds the required ID
proof field, validates submissions, and creates a private, barangay-scoped
storage bucket. Existing KK records remain intact; their ID proof is shown as
not on file for records created before this change.

To separate authenticated SK and Barangay access, then run
`supabase/migrations/migration_sk_data_isolation.sql`. Apply it after the SK milestone
migration. It keeps SK figures available through the anonymous public portal,
but prevents logged-in Barangay accounts from reading SK financial and audit
records. Barangay operations and SK operations have separate pages.

To link barangay and SK expenses to projects/programs, run
`supabase/migrations/migration_expense_program_links.sql`. Existing expenses remain
unlinked and can be linked when edited; new expenses can select a program while
recording the expense. Then run
`supabase/migrations/migration_program_expense_budget_cap.sql` to ensure expenses linked to
a program cannot exceed that program's budget, even when its category allocation
has a higher balance.

To prevent linked Barangay and SK project budgets from exceeding the selected
allocation's remaining balance, run
`supabase/migrations/migration_program_allocation_budget_cap.sql` after
`supabase/migrations/migration_financial_workflow.sql`.

To enforce the full fund-to-allocation-to-expense workflow, run
`supabase/migrations/migration_fund_allocation_expense_guards.sql` after the financial
integrity and workflow migrations. Allocations must be covered by fund sources
for their fiscal year, fund amounts cannot be reduced below existing
allocations, and expenses must match a funded allocation's category and
remaining balance. These checks apply to both Barangay and SK records.

To choose and validate the specific fund source used by each new Barangay or SK
budget allocation, run `supabase/migrations/migration_allocation_fund_source.sql` in the
Supabase SQL Editor. Deploy the updated app after applying this migration.
Existing allocations remain intact; select a source when editing them. These checks apply to both Barangay and SK records.

To allow self-registration for an unoccupied Barangay Captain, Secretary, or
Treasurer seat in an existing barangay, run
`supabase/migrations/migration_signup_barangay_editors.sql`.

To enable complete officials handovers on an existing database, run
`supabase/migrations/migration_officials_handover.sql` after the base schema and profile
security migrations, including `supabase/migrations/migration_signup_barangay_editors.sql`.
Re-run the updated handover migration when deploying later handover changes.
This lets active editors view inactive accounts in their own barangay and
applies roster changes and handover history as one validated transaction.
Barangay Staff can record and end Barangay official terms; active SK Chairpersons
and Treasurers can manage SK handovers. The handover page separates Barangay and
SK seats and history. To register a new incoming Captain while the current
Captain still occupies the seat, sign up under **Join existing**, select
**Barangay Captain**, and choose **Register as incoming Captain**. The account
remains inactive until an authorized Barangay editor or Staff member records the
handover and selects it.

To enable public disclosure document uploads on an existing database, run
`supabase/migrations/migration_transparency_documents.sql` after the base schema and role
security functions are installed. Barangay editors can publish Barangay
documents and SK editors can publish SK documents. JPG, PNG, WEBP, PDF, XLS,
XLSX, DOC, and DOCX files up to 20 MB are supported. Uploads are public
immediately, so residents can request and download them without official
approval. Do not upload confidential or improperly disclosed personal
information.

The Operations page exports a tenant-scoped JSON data snapshot. Store it in an
access-controlled location. Restore must be performed by a Supabase
administrator through a controlled database recovery process, not by replaying
rows from the browser with the public API key.

Run the financial and validation regression tests with:

```bash
node --test src/lib/validation.test.js
```

## 3. Create the first barangay + official account

Go to `/signup`, choose **Set up new barangay**, fill in the barangay's name
and a URL slug (e.g. `san-isidro` → the public portal becomes `/b/san-isidro`),
and pick your role. The first Captain/Secretary/Treasurer account for a
barangay should sign up this way. For an existing barangay, Captain, Secretary,
and Treasurer can also join when their seat is unoccupied; everyone else picks
**Join existing**.

Only **Captain, Secretary, and Treasurer** can create/edit/delete barangay
financial and program records. Only **SK Chairperson and SK Treasurer** can
edit SK records. Everyone else (Kagawad, Staff, SK Kagawad) gets read-only
access to their own barangay's dashboard. This is enforced twice: in the UI
(`src/utils/roles.js`) and — more importantly — in the database itself via
the RLS policies in `schema.sql`, so it can't be bypassed by calling the API
directly.

## 4. AI Assistant (optional but recommended)

The AI Assistant (report drafting, inquiries, budget forecasting,
accomplishment reports) is powered by Groq (GPT-OSS 120B) through a
Supabase Edge Function. Configure the Groq key once as a Supabase function
secret; it is never stored in the browser, so signed-in users can use the AI
from different devices without entering their own key on each one.

To deploy and configure the shared AI service:
```bash
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set GROQ_API_KEY=gsk_your_groq_api_key_here
supabase functions deploy ai-assistant
```

Alternatively, add `GROQ_API_KEY` under your Supabase project's Edge Function
secrets, then deploy the `ai-assistant` function. Do not put this key in the
frontend `.env` file or share it with app users.

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
├── .agents/                  — Project agent skills
├── .firebaserc               — Firebase project selection
├── .gitignore
├── firebase.json             — Firebase Hosting configuration
├── index.html                — Vite HTML entry point
├── jsconfig.json             — Path aliases configuration (@/* -> src/*)
├── package.json              — Scripts and dependencies
├── postcss.config.js         — PostCSS configuration
├── package-lock.json
├── public/
│   ├── favicon.png
│   └── logsystem.png
├── README.md
├── skills-lock.json
├── supabase/
│   ├── schema.sql
│   ├── storage.sql
│   ├── migrations/
│   │   ├── migration_auto_slug.sql
│   │   ├── migration_audit_history.sql
│   │   └── ... (additional ordered SQL migrations)
│   └── functions/
│       └── ai-assistant/
│           └── index.ts
├── tailwind.config.js        — Tailwind theme and configuration
├── vite.config.js            — Vite configuration
└── src/
    ├── App.jsx
    ├── main.jsx
    ├── index.css
    ├── components/
    │   ├── ai/
    │   │   └── FloatingAIChat.jsx
    │   ├── layout/
    │   │   ├── OfficialLayout.jsx
    │   │   ├── ProtectedRoute.jsx
    │   │   └── PublicLayout.jsx
    │   └── ui/
    │       ├── AuditLogList.jsx
    │       ├── Badge.jsx
    │       ├── ErrorBanner.jsx
    │       ├── FormField.jsx
    │       ├── ImageLightbox.jsx
    │       └── SystemLogo.jsx
    ├── context/
    │   └── AuthContext.jsx
    ├── lib/
    │   ├── financial.js
    │   ├── philippineLocations.js
    │   ├── programStatus.js
    │   ├── programStatus.test.js
    │   ├── supabaseClient.js
    │   ├── usePublicBarangay.js
    │   ├── useSupabaseTable.js
    │   ├── validation.js
    │   └── validation.test.js
    ├── pages/
    │   ├── auth/
    │   ├── official/
    │   ├── public/
    │   └── sk/
    └── utils/
        └── roles.js
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
