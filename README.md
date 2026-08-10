# Payroll Management

A confidential, local-first payroll management app for Indian salary processing.
Built with **Next.js 14 (App Router) + TypeScript**, **Tailwind CSS**, **shadcn/ui**,
**Prisma + SQLite**, **SheetJS (xlsx)** for Excel import/export, and **jsPDF** for salary slips.

> ⚠️ This app handles confidential salary and bank data. It is designed to run **locally**.
> Salary/bank/employee data is never written to logs, public pages, demo data, or browser
> local storage. Access is protected by a single admin password.

---

## Features

- **Dashboard** — total employees, gross payroll, deductions, incentives + reimbursements,
  net payable, a searchable recent payroll list, and a month selector.
- **Employees** — add / edit / view / deactivate; stores name, ID, department, designation,
  joining date, bank details and salary structure. Account numbers are masked to the last 4
  digits in all normal views.
- **Payroll Processing** — pick a month, import a legacy `.xls`/`.xlsx` salary file,
  **map spreadsheet headers to app fields**, preview records, edit attendance / holidays /
  incentives / expenses / deductions / remarks, and see flags for missing bank details,
  negative values, duplicate employees and unusual deductions. Files are parsed **in the
  browser** — nothing is uploaded to a server.
- **Salary Calculation** — every formula is visible and editable, with a live calculator and
  admin overrides that require a mandatory reason and are written to the audit log.
- **Payroll Register** — filter by month / employee / department / status; columns for
  payable days, fixed pay, PLI, incentive, expense claim, deductions, gross, net payable,
  masked bank account, remarks and status; bulk **Approve** and **Mark paid**.
- **Reports & Export** — export the monthly register (Excel), export the bank payment list
  (Excel, full account numbers only in this file), and generate printable individual salary
  slips as PDF. Reports include totals.

## Calculation rules (transparent & editable)

```
payableDays         = physicalPresentDays + publicHolidays
grossPayableDays    = configurable value, default 30
proratedFixedSalary = revisedFixedSalary * payableDays / grossPayableDays
pliAmount           = revisedMonthlyRemuneration * pliPercent / 100
grossSalary         = proratedFixedSalary + pliAmount
totalAdditions      = incentive + expenseClaim
netPayable          = grossSalary + totalAdditions - deduction
```

These live in `src/lib/calc.ts` and are mirrored in the Salary Calculation screen.

---

## Setup

Requires **Node.js 18.18+** (Node 20/22 recommended).

```bash
# 1. Install dependencies (runs `prisma generate` automatically)
npm install

# 2. Create your environment file
cp .env.example .env
#    then edit .env and set ADMIN_PASSWORD and SESSION_SECRET
#    generate a strong secret:  openssl rand -base64 48

# 3. Create the SQLite database schema
npm run db:push

# 4. (Optional) Seed synthetic sample data so the UI isn't empty
npm run db:seed

# 5. Run the dev server
npm run dev
# open http://localhost:3000  and log in with ADMIN_PASSWORD
```

### Production build

```bash
npm run build     # runs `prisma generate` then `next build`
npm run start
```

### Useful scripts

| Script            | What it does                                        |
| ----------------- | --------------------------------------------------- |
| `npm run dev`     | Start the dev server                                |
| `npm run build`   | Production build (generates Prisma client first)    |
| `npm run start`   | Start the production server                         |
| `npm run db:push` | Apply the Prisma schema to SQLite                   |
| `npm run db:seed` | Insert synthetic sample data                        |
| `npm run db:reset`| Reset the DB and re-seed (destroys local data)      |

---

## Importing your salary workbook

1. Go to **Payroll Processing**, choose the salary **month**.
2. Drop your `.xls`/`.xlsx` file. The app auto-detects the header row (adjust if needed)
   and picks the sheet.
3. On the **mapping** screen, the app auto-maps common columns (it prefers the right-most
   "Revised ..." columns, i.e. the latest revision). Adjust any mapping via the dropdowns.
4. **Preview** the calculated records, fix flagged issues, edit values inline, then **Save**.

The mapping logic lives in `src/lib/mapping.ts` (`autoMap`, field synonyms, coercion helpers).

---

## Folder structure

```
payroll-app/
├─ prisma/
│  ├─ schema.prisma         # Employee, PayrollRun, PayrollRecord, Setting, AuditLog
│  └─ seed.ts               # synthetic (non-confidential) sample data
├─ src/
│  ├─ middleware.ts         # auth guard for all routes
│  ├─ app/
│  │  ├─ layout.tsx         # root layout + toaster
│  │  ├─ globals.css        # theme tokens (navy/blue, green, amber, red)
│  │  ├─ login/             # password login
│  │  ├─ (app)/             # protected shell (sidebar)
│  │  │  ├─ page.tsx        # Dashboard
│  │  │  ├─ employees/
│  │  │  ├─ payroll/        # processing (import + mapping + preview)
│  │  │  ├─ calculation/    # formulas + overrides
│  │  │  ├─ register/       # payroll register
│  │  │  ├─ reports/        # exports + slips
│  │  │  └─ settings/       # config + audit log
│  │  ├─ slip/[id]/         # printable salary slip
│  │  ├─ actions/           # server actions (employees, runs, records, settings)
│  │  └─ api/
│  │     ├─ auth/           # login / logout
│  │     └─ export/         # register.xlsx, bank.xlsx
│  ├─ components/           # UI (shadcn) + feature components
│  └─ lib/                  # calc, format, mapping, validate, auth, session, prisma, queries
├─ .env.example
└─ README.md
```

## Security notes

- Single-admin login; password compared in constant time, kept only in `ADMIN_PASSWORD`.
- Session is a signed, HTTP-only cookie (JWT via `jose`), verified in middleware on the edge.
- Bank account numbers are masked everywhere except the dedicated **bank payment export**.
- Prisma query logging never includes parameters in production.
- The app sets `robots: noindex` and is intended for internal/local use only.
