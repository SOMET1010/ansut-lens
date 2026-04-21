# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ANSUT RADAR** is a strategic intelligence platform (veille stratégique) for the Agence Nationale du Service Universel des Télécommunications (ANSUT) of Côte d'Ivoire. It centralizes collection, analysis, and dissemination of strategic information for decision-making support.

- **Frontend**: React 18.3 + TypeScript + Vite, with shadcn/ui components and Tailwind CSS
- **Backend**: Lovable Cloud (Supabase) with PostgreSQL, Edge Functions (Deno), Auth, Storage, and Realtime
- **External APIs**: Perplexity (search), Lovable AI Gateway (Gemini 2.5 Flash), Resend (email), SMS

## Common Development Commands

```bash
# Development
npm run dev              # Start dev server (port 8080)
npm run build            # Production build
npm run build:dev        # Development build
npm run preview          # Preview production build locally
npm run lint             # Run ESLint

# The project does NOT have tests configured - no test command available
```

## High-Level Architecture

### Application Structure

```
src/
├── pages/                    # Route pages (RadarPage, ActualitesPage, etc.)
├── components/
│   ├── ui/                   # shadcn/ui primitives - DO NOT MODIFY
│   ├── auth/                 # ProtectedRoute, PermissionRoute, LoadingScreen
│   ├── layout/               # AppLayout, AppSidebar, AppHeader, SpotlightSearch
│   ├── personnalites/        # Actor & influence tracking components
│   ├── actualites/           # News feed with clustering, freshness indicators
│   ├── dossiers/             # Analytical folders + newsletter widget
│   ├── flux/                 # Personal monitoring flux
│   ├── spdi/                 # 15 SPDI analytics components (Gauge, Radar, Evolution)
│   ├── radar/                # Watch center components (Briefing, Intelligence)
│   ├── assistant/            # AI chatbot components
│   ├── newsletter/           # Newsletter + Studio WYSIWYG with drag & drop blocks
│   ├── formation/            # Training guide viewer (PDF export)
│   ├── presentation/         # Presentation slides (12 slides)
│   ├── import-acteurs/       # CSV import with editable cells
│   ├── admin/                # Admin components (UserCard, RolePermissions, Audit)
│   ├── documentation/        # Technical doc viewer
│   ├── notifications/        # Alert system (NotificationCenter, AlertNotificationProvider)
│   └── profile/              # User profile (AvatarUpload, ChangePassword, ProfileForm)
├── hooks/                    # 25+ custom hooks for data fetching
├── contexts/                 # AuthContext, ViewModeContext
├── types/                    # TypeScript type definitions
├── lib/                      # Utilities (cn helper, etc.)
├── utils/                    # Helper functions
└── integrations/supabase/    # Auto-generated Supabase client - DO NOT MODIFY
```

### Key Patterns

**Data Fetching with TanStack Query:**
- All server data uses `@tanstack/react-query`
- Query keys follow pattern: `['resource', filters]`
- Mutations invalidate relevant queries on success
- Example in `src/hooks/useActualites.ts`

**Custom Hooks Pattern:**
- Hooks export both query and mutation functions
- Each hook handles its own toast notifications via `sonner`
- Error handling is centralized in hooks
- File naming: `use{Resource}.ts` (e.g., `usePersonnalites.ts`)

**Authentication & Authorization:**
- `AuthContext` provides `user`, `role`, `isAdmin`, `signIn`, `signOut`
- Four roles: `admin`, `user`, `council_user`, `guest`
- Protected routes use `<ProtectedRoute>` wrapper
- Admin routes use `<AdminRoute>` wrapper
- Granular permissions via `<PermissionRoute permission="code">`

**Component Organization:**
- shadcn/ui primitives in `components/ui/` - never modify these
- Feature components grouped by domain (actualites, personnalites, etc.)
- Each feature folder has an `index.ts` for exports

### State Management Strategy

1. **Server State**: TanStack Query (React Query v5)
2. **Global State**: Context API (AuthContext, ViewModeContext)
3. **Local UI State**: React useState

### Database Integration

- **Client**: Auto-generated in `src/integrations/supabase/client.ts`
- **Types**: Auto-generated from database schema
- **Tables**: 30+ tables with Row-Level Security (RLS) enabled
- **Key tables**: `personnalites`, `actualites`, `signaux`, `alertes`, `dossiers`, SPDI tables

### Edge Functions (23 Deno functions)

Located in `supabase/functions/`, each has an `index.ts` file:
- `assistant-ia`: AI chatbot with SSE streaming, citation validation
- `collecte-veille`: News collection via Perplexity API
- `enrichir-actualite`: AI enrichment (tags, importance, sentiment)
- `calculer-spdi`: SPDI score calculation
- `invite-user`, `manage-user`, `update-user-role`: User management
- And 17 more for newsletters, scheduling, alerts, etc.

**Edge Function Pattern:**
- Use native `Deno.serve()` (no import needed)
- CORS headers included
- JWT auth via `Authorization: Bearer` header
- Access secrets via `Deno.env.get()`
- Return JSON responses or SSE streams

### External APIs

- **Perplexity API**: Web search for news collection (`PERPLEXITY_API_KEY`)
- **Lovable AI Gateway**: Gemini 2.5 Flash via `https://ai.gateway.lovable.dev/v1/chat/completions`
- **Resend**: Email sending (`RESEND_API_KEY`)

### Import Aliases

```typescript
import { Component } from '@/components/...';  // Maps to ./src/
import { supabase } from '@/integrations/supabase/client';
import type { AppRole } from '@/types';
```

### Naming Conventions

- **Components**: PascalCase (`ActeurCard.tsx`)
- **Hooks**: camelCase with `use` prefix (`usePersonnalites.ts`)
- **Pages**: PascalCase + `Page` suffix (`PersonnalitesPage.tsx`)
- **Types**: PascalCase (`Personnalite`, `Actualite`)
- **Constants**: SCREAMING_SNAKE_CASE (`API_BASE_URL`)

### SPDI - Score de Présence Digitale Institutionnelle

A composite scoring system with 4 axes:
- **Visibilité (30%)**: Mentions, sources, regularity
- **Qualité (25%)**: Sentiment, strategic themes, controversies
- **Autorité (25%)**: Citations, panel invitations, cross-references
- **Présence (20%)**: LinkedIn activity, engagement, coherence

Score ranges: 80-100 (forte), 60-79 (solide), 40-59 (faible), <40 (risque)

### Newsletter Studio

WYSIWYG editor with drag & drop blocks in `src/components/newsletter/studio/`:
- Canvas area with droppable zones
- 12 block types (Header, Edito, Article, Tech, Chiffre, Image, Agenda, etc.)
- Responsive preview (Desktop, Tablet, Mobile)
- HTML export and email sending

### Real-time Features

- **Alerts**: PostgreSQL changes → Supabase Realtime → Frontend
- **CRON jobs**: `pg_cron` for scheduled tasks (collecte, SPDI calculation)
- **Subscriptions**: `supabase.channel().on('postgres_changes')`

### TypeScript Configuration

- `strictNullChecks: false` (relaxed mode)
- Path alias: `@/*` → `./src/*`
- `noUnusedLocals: false`, `noUnusedParameters: false`

### Important Constraints

1. **Never modify** `src/integrations/supabase/` - auto-generated
2. **Never modify** `src/components/ui/` - shadcn/ui primitives
3. **No tests** currently configured in this project
4. All database tables have RLS enabled
5. Edge functions require JWT authentication
6. Use `toast` from `sonner` for user notifications
7. Use `supabase.functions.invoke()` to call edge functions

### Security Notes

- Row-Level Security on all tables
- Role-based access control via `user_roles` table
- Admin actions logged to `admin_audit_logs`
- Secrets managed in Lovable Cloud (Settings > Secrets)
- Service role key only in Edge Functions, never frontend
