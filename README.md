# Enterprise ERP System (MERN)

Production-oriented ERP platform for operations, finance, HR, CRM, and manufacturing.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, MUI, Redux Toolkit, Axios, Recharts |
| Backend | Node.js, Express, Mongoose, JWT |
| Database | MongoDB Atlas |
| Deploy | Vercel (client), Render (server) |

## Project structure

```
ERP-kunj/
├── client/     # React frontend
├── server/     # Express API
├── .env.example
└── README.md
```

## Prerequisites

- Node.js 18+
- MongoDB Atlas cluster + connection string
- npm 9+

## Quick start (Phase 0)

### 1. Backend

```bash
cd server
cp .env.example .env
# Edit .env and set MONGODB_URI, JWT_SECRET, CLIENT_URL
npm install
npm run dev
```

API default: `http://localhost:5000`  
Health: `GET http://localhost:5000/api/v1/health`

### 2. Frontend

```bash
cd client
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:5000/api/v1
npm install
npm run dev
```

App default: `http://localhost:5173`

## Environment variables

See root `.env.example` and `server/.env.example`. Never commit real `.env` files.

## Implementation phases

| Phase | Status | Scope |
|-------|--------|--------|
| 0 | Complete | Scaffold, Atlas config, security middleware, health |
| 1 | Complete | Auth, JWT, RBAC, seed users, protected routes |
| 2 | Complete | Users, Roles & Permissions, Audit Logs, Notifications |
| 3 | Complete | Products, categories, warehouses, stock ledger |
| 4 | Complete | Customers, suppliers, purchase orders, GRN → stock |
| 5 | Complete | Sales orders → stock out, invoices, payments |
| 6 | Complete | Dashboard, reports, CRM leads |
| 7 | Complete | HR employees/leave, BOM + work orders → stock |
| 8 | Complete | Attendance, payroll, QC inspections |
| Done | — | Core ERP modules complete for internship scope |

## Demo users (after `npm run seed` in server)

| Email | Password | Role |
|-------|----------|------|
| admin@erp.local | Admin@12345 | ADMIN |
| customer@erp.local | Customer@12345 | CUSTOMER (portal) |
| employee@erp.local | Employee@12345 | EMPLOYEE |
| sales@erp.local | Sales@12345 | SALES_MANAGER |
| purchase@erp.local | Purchase@12345 | PURCHASE_MANAGER |
| inventory@erp.local | Inventory@12345 | INVENTORY_MANAGER |
| accountant@erp.local | Account@12345 | ACCOUNTANT |
| hr@erp.local | HrManager@12345 | HR_MANAGER |
| mfg@erp.local | Mfg@12345 | PRODUCTION_MANAGER |

### Customer portal

- Register: `/customer/register`
- Login with a `CUSTOMER` account redirects to `/customer/dashboard`
- Isolated APIs under `/api/v1/customer/*` (ownership from JWT → Customer party)
- Demo portal user is linked to customer code `CUST-PORTAL` after seed

Seed data is for **development/demo only**.

### Bulk demo data (500+)

After base seed, load 500+ time-varied orders/invoices/payments/products/customers/leads/notifications:

```bash
cd server
npm run seed:bulk
```

Re-run with another batch: `npm run seed:bulk -- --force`  
Custom volume: `npm run seed:bulk -- --count=800`

## Scripts

**Server:** `npm run dev` | `npm start` | `npm test` | `npm run seed` | `npm run seed:bulk`  
**Client:** `npm run dev` | `npm run build` | `npm run preview`

## Hosting (Vercel frontend + Render backend)

Deploy the API first, then the web app, so the frontend can point at a live `VITE_API_BASE_URL`.

### 1. Render — backend (`server/`)

1. Push this repo to GitHub.
2. In [Render](https://dashboard.render.com), **New → Blueprint** and select the repo (uses `render.yaml`), or **New Web Service** with:
   - **Root directory:** `server`
   - **Runtime:** Node
   - **Build command:** `npm install --omit=dev`
   - **Start command:** `node server.js`
   - **Health check:** `/api/v1/health`
3. Set environment variables:

| Variable | Value |
|----------|--------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | your Atlas connection string |
| `JWT_SECRET` | long random secret |
| `JWT_EXPIRES_IN` | `30d` |
| `APP_TIMEZONE` | `Asia/Kolkata` |
| `CLIENT_URL` | `https://kunj-erp.vercel.app` |
| `CORS_ORIGIN` | `https://kunj-erp.vercel.app` |
| `CORS_ALLOW_VERCEL_PREVIEWS` | `true` |
| `MAIL_FROM` | `ERP Admin <yourgmail@gmail.com>` |
| `SMTP_HOST` | `smtp.gmail.com` (localhost only) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Gmail address |
| `SMTP_PASSWORD` | Gmail App Password |
| `BREVO_API_KEY` | required on **Render free** |

**Localhost:** SMTP works. In `server/` run `npm run mail:test`. Check that Gmail inbox (and Spam). Use a 16-character App Password, not your Gmail login password.

**Render free:** Gmail SMTP is blocked ([changelog](https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports)). Set `BREVO_API_KEY` from [Brevo](https://www.brevo.com), verify `MAIL_FROM` as a sender, restart. Health should show `"transport":"brevo"`.

Creating a CRM customer (Operations → Customers) does **not** send mail. Emails go out for **Users → Add user**, **Test email**, and customer self-register.

### 2. Vercel — frontend (`client/`)

1. In [Vercel](https://vercel.com), **Add New Project** → this repo.
2. **Root Directory:** `client` (important in this monorepo).
3. Framework preset: Vite. Build: `npm run build`. Output: `dist`.
4. Environment variables (Production + Preview):

| Variable | Value |
|----------|--------|
| `VITE_API_BASE_URL` | `https://erp-ms-mwkj.onrender.com/api/v1` |
| `VITE_APP_NAME` | `Enterprise ERP` |
| `VITE_APP_TIMEZONE` | `Asia/Kolkata` |

The value **must include `/api/v1`**. Using only `https://erp-ms-mwkj.onrender.com` or `.../api` makes login POST `/api/auth/login` and the API returns `Cannot POST /api/auth/login`.

`client/vercel.json` proxies `/api/*` to Render and rewrites SPA routes (`/dashboard`, `/hr/my-attendance`, etc.) to `index.html`.

5. Redeploy the frontend after saving env vars (`VITE_*` is baked in at **build** time).
6. Paste the Vercel URL into Render `CLIENT_URL` / `CORS_ORIGIN` and update the Render service.

Free Render web services sleep after idle time. The first request after sleep can take 30–50s; the client waits up to 45s and retries `/auth/me` so a refresh should not log the user out.

## License

Internship / educational project use.
