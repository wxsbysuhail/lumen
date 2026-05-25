# Lumen — Wealth Management

> A premium, offline-capable personal finance PWA built for tracking spending, saving towards goals, and growing wealth — with an AI financial coach built in.

![Lumen Dashboard](https://img.shields.io/badge/Status-Live-brightgreen?style=flat-square) ![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=flat-square&logo=typescript) ![Supabase](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase) ![PWA](https://img.shields.io/badge/PWA-Installable-5A0FC8?style=flat-square)

---

## Features

### 💰 Dashboard
- **Net worth hero card** with animated count-up numbers
- **Asset allocation bar** — Cash / Savings / Investments breakdown at a glance
- **Safe to Spend** calculator — real-time disposable budget for the current billing cycle
- **Logging streak chip** — tracks consecutive days of expense logging (🔥 flame animation at 7+ days)
- **Quick-log modal** — add income or expense in seconds with category auto-suggestion
- **Receipt scanner** — OCR via Tesseract.js to auto-fill transactions from a photo

### 📊 Cash Flow
- Recurring income and expense contracts (salary, rent, subscriptions, etc.)
- Monthly net retained calculation with inflow/outflow breakdown
- Edit and remove recurring items

### 🪣 Savings Targets
- Create goal buckets (Emergency Fund, Japan Trip, etc.) with a target amount and priority
- **Auto-Allocation Advisor** — suggests a safe monthly contribution based on your disposable pool and goal priority
- Deposit cash directly from your General Balance into buckets
- Progress rings with months-to-goal estimate
- Edit or delete buckets with full refund back to General Cash

### 📈 Investments
- Track stock/fund holdings (MCB.MU, SBM.MU, AAPL, VOO, MSFT and more)
- Real-time P&L per holding
- Portfolio breakdown donut chart

### 🔮 Wealth Projection
- Compound interest simulator
- Adjustable initial capital, monthly contribution, annual return rate, and time horizon
- Visual growth curve chart

### 📉 Reports & Charts
- Monthly spending by category breakdown
- Income vs Expense trend over time
- Savings rate history

### 💡 Financial Insights
- Automated rules of thumb (50/30/20, 3-month emergency fund check, etc.)
- Personalised optimisation tips based on your actual numbers

### 👥 Joint Sync & Splits
- Link with a partner via invite code
- Log split expenses and track who owes whom
- Settle debts directly

### 🤖 AI Financial Coach
- Powered by Gemini (Google Generative AI)
- Budget-aware context — the AI knows your income, expenses, and savings targets
- Ask anything: "Am I saving enough?", "What can I cut?", "Project my wealth in 5 years"

---

## Engagement Features

| Feature | How it works |
|---|---|
| **Daily push notification** | Opt-in 8 PM reminder to log expenses — local, no server required |
| **PWA home screen shortcut** | Long-press the app icon → "Log Expense" opens the add modal instantly |
| **Logging streak** | Consecutive-day counter visible on Dashboard, forgiving streak logic |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 6 |
| Build | Vite 8 |
| Styling | Vanilla CSS (custom design system, dark mode, glassmorphism) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Backend | Supabase (Auth + PostgreSQL) |
| AI | Google Generative AI (Gemini) |
| OCR | Tesseract.js |
| PWA | Custom Service Worker + Web App Manifest |
| Deployment | Vercel |

---

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com) API key (for the AI Coach)

### 1. Clone and install

```bash
git clone https://github.com/wxsbysuhail/lumen.git
cd lumen
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_google_ai_api_key
```

### 3. Set up Supabase

Run the following tables in your Supabase SQL editor:

```sql
-- Profiles
create table profiles (
  id uuid primary key references auth.users(id),
  name text,
  avatar text,
  monthly_income numeric default 0,
  current_balance numeric default 0,
  primary_goal text default 'save',
  is_onboarded boolean default false
);

-- Transactions
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  description text,
  amount numeric,
  type text,
  category text,
  date timestamptz default now(),
  split_with_id uuid,
  split_amount numeric,
  split_settled boolean default false
);

-- Recurring items (income + expense contracts)
create table recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text,
  amount numeric,
  type text,
  frequency text default 'monthly'
);

-- Savings buckets
create table savings_buckets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  name text,
  target numeric,
  current numeric default 0,
  monthly_contribution numeric default 0,
  priority text default 'medium'
);

-- Investment holdings
create table holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  ticker text,
  name text,
  shares numeric,
  avg_price numeric,
  currency text default 'MUR'
);

-- Enable RLS on all tables and add policies for authenticated users
alter table profiles enable row level security;
alter table transactions enable row level security;
alter table recurring_items enable row level security;
alter table savings_buckets enable row level security;
alter table holdings enable row level security;

create policy "Users manage own data" on profiles for all using (auth.uid() = id);
create policy "Users manage own data" on transactions for all using (auth.uid() = user_id);
create policy "Users manage own data" on recurring_items for all using (auth.uid() = user_id);
create policy "Users manage own data" on savings_buckets for all using (auth.uid() = user_id);
create policy "Users manage own data" on holdings for all using (auth.uid() = user_id);
```

### 4. Run locally

```bash
npm run dev
```

### 5. Build for production

```bash
npm run build
```

---

## Project Structure

```
src/
├── components/
│   ├── AICoach.tsx          # Gemini-powered AI financial coach
│   ├── CashFlow.tsx         # Recurring income & expense management
│   ├── Dashboard.tsx        # Main overview, streak chip, quick-log
│   ├── Insights.tsx         # Automated financial insights engine
│   ├── Investments.tsx      # Portfolio tracker
│   ├── JointSync.tsx        # Partner linking & expense splitting
│   ├── Login.tsx            # Auth screen
│   ├── Onboarding.tsx       # First-run setup wizard
│   ├── Reports.tsx          # Charts and spending breakdowns
│   ├── SavingsTracker.tsx   # Goal buckets with auto-allocation
│   └── WealthProjection.tsx # Compound interest simulator
├── hooks/
│   └── useNotifications.ts  # Daily push reminder scheduling (local)
├── utils/
│   └── receiptParser.ts     # OCR text → transaction field extraction
├── App.tsx                  # Root — auth, routing, streak logic, hub nav
├── index.css                # Full design system (tokens, components, dark mode)
└── supabaseClient.ts        # Supabase client singleton
public/
├── manifest.json            # PWA manifest with home screen shortcut
└── sw.js                    # Service worker (cache, push, notification click)
```

---

## Design System

Lumen uses a fully custom CSS design system with:

- **CSS custom properties** for all colors, spacing, radius, and transitions
- **Dark mode** via `data-theme="dark"` on `<html>`, toggled without flash
- **Glassmorphism** panels and modals with `backdrop-filter: blur()`
- **Framer Motion** for page transitions, modal scale-ups, and micro-animations
- **Inter** typeface via Google Fonts + a serif italic for display headings

---

## PWA

Lumen is a fully installable Progressive Web App:

- Works offline (service worker caches all assets)
- Installable on iOS Safari (Add to Home Screen) and Android Chrome
- Home screen long-press shortcut: **Log Expense** → opens add modal
- Daily 8 PM push notification reminder (opt-in, local — no server needed)

---

## License

Private project. All rights reserved.
