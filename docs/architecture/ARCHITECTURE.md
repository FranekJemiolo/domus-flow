# DomusFlow Architecture Overview

## System Design

DomusFlow is a cross-platform property maintenance management application built on a dual-mode
architecture that enables deployment as both a full-stack web app and a fully offline PWA demo.

## Dual-Mode Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      DomusFlow Frontend                         │
│                   (React 18 + Vite + TS)                        │
├─────────────────────────────────────────────────────────────────┤
│                    API Service Layer                             │
│              apiService.ts (VITE_DEMO_MODE check)               │
├──────────────────────┬──────────────────────────────────────────┤
│   DEMO MODE (true)   │         PRODUCTION MODE (false)          │
│                      │                                          │
│   Dexie.js           │         Axios HTTP Client                │
│   (IndexedDB)        │         → Node.js / Express              │
│                      │         → Prisma ORM                     │
│   Mock Auth          │         → PostgreSQL 16                  │
│   (Invite Codes)     │         → JWT Authentication             │
│                      │                                          │
│   ← Browser Only →   │         ← Full Stack →                   │
└──────────────────────┴──────────────────────────────────────────┘
```

## Data Flow

### Tenant Filing a Ticket
1. Tenant opens "New Repair" form
2. Selects photos → `browser-image-compression` reduces to <0.5MB/image
3. Compressed Base64 strings saved to Dexie.js (demo) or uploaded to API (prod)
4. If urgency is HIGH or CRITICAL → Browser Notification API fires alert
5. Ticket appears in Landlord's Kanban board

### Landlord Managing a Ticket
1. Drags ticket card to new column (status update)
2. Can override urgency, set manual text ETA, assign contractor
3. Clicks "Acknowledge Final Cost" → `costAcknowledged: true`, ticket locked

### Dual-Channel Chat
1. Landlord has two isolated message threads per property
2. Thread 1: Tenant ↔ Landlord (negotiate repairs)
3. Thread 2: Landlord ↔ Contractor (coordinate work)
4. "Share to Chat" injects a clickable TicketCard into the chat stream

## Security Architecture

```
Client Request
     │
     ▼
Helmet.js (Security Headers)
     │
     ▼
CORS (Allowlist Origins)
     │
     ▼
JWT Middleware (Bearer Token)
     │
     ▼
Role Check (LANDLORD | TENANT | CONTRACTOR)
     │
     ▼
Route Handler → Prisma → PostgreSQL
```

## Mobile Architecture (Capacitor)

```
React Web Build (Vite)
        │
        ▼
   Capacitor.js
   ┌─────┴──────┐
   │            │
iOS (WKWebView) Android (WebView)
   │            │
Native APIs: Camera, Push Notifications, File System
```

## Monorepo Structure (npm Workspaces)

```
domus-flow/
├── packages/shared/     ← Shared types, constants, utils
├── apps/backend/        ← Express API (uses shared types)
└── apps/frontend/       ← React app (uses shared types)
```

The `packages/shared` package is the single source of truth for all TypeScript types,
ensuring the frontend's Dexie schema exactly mirrors the backend's Prisma schema.
