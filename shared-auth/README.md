# 🔐 Shared Auth Kit

Reusable Firebase Auth + Stripe billing stack. Drop into any FastAPI + Next.js project.

## Contents

```
shared-auth/
├── backend/
│   ├── auth.py              # User management (SQLite, API keys, tiers, rate limits)
│   ├── auth_endpoints.py    # FastAPI endpoints (register, login, firebase-login, Stripe, promo codes)
│   ├── requirements.txt     # Python deps (fastapi, stripe, bcrypt, firebase-admin)
│   └── .env.example         # Template env vars
├── frontend/
│   ├── firebase.ts          # Firebase SDK init (update config per project)
│   ├── auth-context.tsx     # React AuthProvider (Firebase + backend sync)
│   ├── auth-modal.tsx       # Login/register modal (Google + email/password)
│   ├── auth-button.tsx      # Nav bar auth button
│   └── pro-gate.tsx         # Premium feature gating component
└── keys/
    ├── firebase-service-account.json  # Firebase Admin SDK key (shared across projects)
    └── tickertrace.env                # TickerTrace-specific env vars
```

## How to Reuse

### 1. Backend

- Copy `auth.py` → your project's `api/` dir
- Copy relevant endpoints from `auth_endpoints.py` into your `server.py`
- Update `requirements.txt` to include: `firebase-admin`, `stripe`, `bcrypt`
- Set env vars: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_SERVICE_ACCOUNT_KEY`

### 2. Frontend

- `npm install firebase` in your Next.js project
- Copy `firebase.ts` → `lib/firebase.ts` (update `firebaseConfig` if different project)
- Copy `auth-context.tsx`, `auth-modal.tsx`, `auth-button.tsx` → `components/`
- Wrap your app in `<AuthProvider>` in layout.tsx
- Use `<AuthButton />` in your nav

### 3. Firebase Project

- Same Firebase project (`ticker-trace`) can serve multiple apps
- Or create a new one and update `firebase.ts` config
- Enable Email/Password + Google in Firebase Console → Authentication → Sign-in method

### Key Config Vars

| Variable | Where | Value |
|----------|-------|-------|
| Firebase Project | `firebase.ts` | `ticker-trace` |
| Auth Domain | `firebase.ts` | `ticker-trace.firebaseapp.com` |
| API Base URL | `auth-context.tsx` | Your API URL |
| Owner Email | `auth_endpoints.py` | Auto-pro email |
