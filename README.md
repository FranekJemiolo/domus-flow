# DomusFlow 🏠

> **Consumer-friendly Maintenance Management** — Streamlining communication between Landlords,
> Tenants, and Contractors.

[![CI Tests](https://github.com/FranekJemiolo/domus-flow/actions/workflows/test.yml/badge.svg)](https://github.com/FranekJemiolo/domus-flow/actions/workflows/test.yml)
[![PR Checks](https://github.com/FranekJemiolo/domus-flow/actions/workflows/pr-checks.yml/badge.svg)](https://github.com/FranekJemiolo/domus-flow/actions/workflows/pr-checks.yml)
[![Deploy Demo](https://github.com/FranekJemiolo/domus-flow/actions/workflows/deploy.yml/badge.svg)](https://github.com/FranekJemiolo/domus-flow/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-6366f1?style=flat&logo=github)](https://FranekJemiolo.github.io/domus-flow/)

---

## 🚀 Live Demo

**Try DomusFlow without any setup:** →
[https://FranekJemiolo.github.io/domus-flow/](https://FranekJemiolo.github.io/domus-flow/)

The demo runs entirely in your browser using IndexedDB (via Dexie.js). No backend, no account
needed.

### Demo Login Codes

| Role       | Invite Code     | Description                       |
| ---------- | --------------- | --------------------------------- |
| Landlord   | `LANDLORD-DEMO` | Full property management access   |
| Tenant     | `UNIT4B-2026`   | Unit 4B tenant — can file tickets |
| Tenant     | `UNIT2A-2026`   | Unit 2A tenant                    |
| Contractor | `CONTRACTOR-01` | View assigned repair tickets      |

---

## 📐 Architecture Overview

```
domus-flow/                          ← Monorepo root (npm workspaces)
├── apps/
│   ├── frontend/                    ← React 18 + Vite + TypeScript + Tailwind CSS
│   │   ├── src/
│   │   │   ├── services/            ← Dual-mode API service layer
│   │   │   │   ├── apiService.ts    ← Routes to real API or Dexie based on VITE_DEMO_MODE
│   │   │   │   ├── demoDb.ts        ← Dexie.js IndexedDB schema
│   │   │   │   └── demoSeeder.ts    ← Seeds mock data for demo mode
│   │   │   ├── components/          ← Reusable UI components
│   │   │   ├── pages/               ← Route-level page components
│   │   │   ├── hooks/               ← Custom React hooks
│   │   │   └── utils/               ← Frontend utilities
│   │   ├── ios/                     ← Capacitor iOS project (generated)
│   │   └── android/                 ← Capacitor Android project (generated)
│   │
│   └── backend/                     ← Node.js + Express + TypeScript
│       ├── src/
│       │   ├── routes/              ← REST API route handlers
│       │   ├── middleware/          ← Auth, validation, error handling
│       │   └── __tests__/           ← Jest + Supertest integration tests
│       └── prisma/
│           ├── schema.prisma        ← Database schema (source of truth)
│           └── seed.ts              ← Database seeder
│
├── packages/
│   └── shared/                      ← TypeScript types, constants, utils
│       └── src/
│           ├── types.ts             ← All data model interfaces & enums
│           ├── constants.ts         ← API endpoints, invite codes, labels
│           └── utils.ts             ← Shared utility functions
│
├── .github/workflows/
│   ├── pr-checks.yml                ← Lint, format, type-check, build on PRs
│   ├── test.yml                     ← Integration tests with real PostgreSQL service
│   └── deploy.yml                   ← Build demo + deploy to GitHub Pages on main
│
└── docker-compose.yml               ← PostgreSQL (dev + test) + Adminer GUI
```

### Dual-Mode Architecture

DomusFlow supports two operational modes controlled by a single environment variable:

```
VITE_DEMO_MODE=true   → All API calls intercepted → Dexie.js (IndexedDB) in browser
VITE_DEMO_MODE=false  → All API calls go to → Node/Express → Prisma → PostgreSQL
```

This enables a **fully offline, zero-dependency demo** deployed to GitHub Pages while sharing 100%
of the UI code with the production app.

---

## 🛠 Technology Stack

| Layer          | Technology                                 |
| -------------- | ------------------------------------------ |
| Frontend       | React 18, TypeScript, Vite, Tailwind CSS   |
| Routing        | react-router-dom v6                        |
| Demo Storage   | Dexie.js (IndexedDB wrapper)               |
| API Client     | Axios with interceptors                    |
| Backend        | Node.js, Express, TypeScript               |
| Database       | PostgreSQL 16, Prisma ORM                  |
| Auth           | JWT (jsonwebtoken + bcryptjs)              |
| Image Handling | browser-image-compression (client-side)    |
| CSV            | PapaParse (import), file-saver (export)    |
| Mobile         | Capacitor.js (iOS + Android)               |
| PWA            | vite-plugin-pwa + Workbox                  |
| Testing FE     | Vitest + React Testing Library             |
| Testing BE     | Jest + Supertest (against real PostgreSQL) |
| CI/CD          | GitHub Actions                             |
| DB GUI         | Adminer (via Docker)                       |

---

## ⚡ Quick Start (Full Stack with Docker)

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [npm 10+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)

### 1. Clone & Install

```bash
git clone git@github.com:FranekJemiolo/domus-flow.git
cd domus-flow
npm install
```

### 2. Configure Environment

```bash
# Backend
cp apps/backend/.env.example apps/backend/.env

# Frontend
cp apps/frontend/.env.example apps/frontend/.env.local
```

### 3. Start PostgreSQL

```bash
npm run docker:up
# PostgreSQL available at localhost:5432
# Adminer DB GUI at http://localhost:8080
```

### 4. Initialize Database

```bash
npm run db:migrate    # Run Prisma migrations
npm run db:seed       # Seed with sample data
```

### 5. Run Development Servers

```bash
npm run dev:all       # Backend on :3001, Frontend on :5173
```

Open **http://localhost:5173**

---

## 🎭 Demo Mode (No Database Required)

```bash
# Install dependencies
npm install

# Start frontend in demo mode (no backend needed)
cd apps/frontend
VITE_DEMO_MODE=true npm run dev
```

All data is stored in IndexedDB. The app seeds mock properties, users, and tickets on first load.

---

## 🧪 Running Tests

### Frontend (Vitest)

```bash
npm run test:frontend          # Run once
npm --workspace apps/frontend run test:watch  # Watch mode
```

### Backend (Jest + Supertest)

Requires a running PostgreSQL test database:

```bash
# Start test database (uses port 5433)
npm run docker:up

# Run integration tests
npm run test:backend
```

Or use the isolated test database Docker service:

```bash
docker-compose up postgres-test -d
DATABASE_URL=postgresql://domus_flow:domus_flow_dev@localhost:5433/domus_flow_test \
  npm run test:backend
```

---

## 📱 Mobile Builds (Capacitor)

After completing the frontend build:

### iOS

```bash
cd apps/frontend
npm run build

# Initialize Capacitor (first time only)
npx cap init "DomusFlow" "com.domusflow.app"
npx cap add ios

# Open in Xcode
npx cap sync ios
npx cap open ios
```

> **Camera & Photo Library Permissions** are pre-configured in `ios/App/App/Info.plist`.

### Android

```bash
cd apps/frontend
npx cap add android

# Open in Android Studio
npx cap sync android
npx cap open android
```

> **Camera & Storage Permissions** are pre-configured in `android/app/src/main/AndroidManifest.xml`.

---

## 📦 Production Build

```bash
# Build everything
npm run build

# Or build just the demo for GitHub Pages
npm run build:demo
```

---

## 🐳 Docker Reference

```bash
npm run docker:up       # Start all services
npm run docker:down     # Stop all services
npm run docker:reset    # Wipe volumes and restart fresh
```

| Service         | Port | URL                         |
| --------------- | ---- | --------------------------- |
| PostgreSQL      | 5432 | postgresql://localhost:5432 |
| PostgreSQL Test | 5433 | postgresql://localhost:5433 |
| Adminer         | 8080 | http://localhost:8080       |

---

## 🏗 Database Schema

See [`apps/backend/prisma/schema.prisma`](apps/backend/prisma/schema.prisma) for the full Prisma
schema. Key models:

- **User** — Landlords, Tenants, Contractors with invite codes
- **Property** — Properties with unit numbers linked to a Landlord
- **Ticket** — Repair requests with urgency, status, photos, ETA
- **Message** — Dual-channel chat with optional linked Ticket cards

---

---

## 🖼 Application Showcase

### Landlord Portfolio & Maintenance Pulse

![Landlord Dashboard](docs/screenshots/dashboard-landlord.png)

### Work Orders Kanban Pipeline

![Kanban Board](docs/screenshots/kanban-board.png)

### Direct Maintenance Communications (Contractor Channel)

![Contractor Chat](docs/screenshots/chat-contractor.png)

### Mobile Application View (iOS / Android PWA)

<p align="center">
  <img src="docs/screenshots/mobile-ios.png" width="360" alt="Mobile iOS View" />
</p>

---

## 📋 Development Milestones

| #   | Milestone                             | Status          | Description                                                                   |
| --- | ------------------------------------- | --------------- | ----------------------------------------------------------------------------- |
| 1   | **Monorepo Setup & CI/CD**            | ✅ **Complete** | npm workspaces, GitHub Actions, Docker PostgreSQL, configs                    |
| 2   | **Backend & Database Layer**          | ✅ **Complete** | Prisma models, Express REST API, 46 integration tests passing                 |
| 3   | **Frontend Data Service & Demo Mode** | ✅ **Complete** | Dexie.js offline DB, Axios interceptors, CSV import/export, 18 tests          |
| 4   | **Core UI, Layouts & Routing**        | ✅ **Complete** | Tailwind CSS dark design, 1-click persona switching, mobile bottom nav        |
| 5   | **Ticket Lifecycle & Media**          | ✅ **Complete** | Image compression, dropzone, Kanban status transitions, ETA & details modal   |
| 6   | **Dual-Channel Chat System**          | ✅ **Complete** | Isolated Landlord-Tenant / Landlord-Contractor channels & linked ticket cards |
| 7   | **PWA, Native Packaging & Docs**      | ✅ **Complete** | VitePWA manifest & icons, Capacitor iOS/Android config, full showcase docs    |

---

## 📁 Documentation

- [`docs/architecture/ARCHITECTURE.md`](docs/architecture/ARCHITECTURE.md) — Comprehensive system
  architecture & data flow
- [`docs/screenshots/README.md`](docs/screenshots/README.md) — High-resolution interface showcase
  gallery

---

## 🤝 Contributing

1. Fork the repo and create a feature branch (`git checkout -b feat/your-feature`)
2. Commit changes following [Conventional Commits](https://www.conventionalcommits.org/)
3. Push and open a Pull Request — CI will run lint, type-check, build, and tests automatically
4. Merge after review and all checks pass

---

## 📄 License

MIT — See [LICENSE](LICENSE) for details.

---

<p align="center">Built with ❤️ by <a href="https://github.com/FranekJemiolo">FranekJemiolo</a></p>
