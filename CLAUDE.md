# Anuncio PYG

Custom dashboard builder with AI-assisted generation. Convex backend, Next.js frontend.

## Stack

- **Runtime**: Bun (not Node/npm/pnpm)
- **Backend**: Convex (database, server functions, file storage)
- **Frontend**: Next.js App Router + React
- **Styling**: Tailwind CSS

## Before You Start

- Read `docs/convex.md` before working on backend (`convex/` directory)
- Read `docs/nextjs.md` before working on frontend (`app/` directory)

## Quick Reference

```bash
bun install             # Install dependencies
npx convex dev          # Start Convex dev server
bun run dev             # Start Next.js dev server
npx convex deploy       # Deploy Convex to production
```

## Key Rules

- Use Bun for all package management and script running
- Convex handles all data — no external databases, no ORMs
- Convex hooks (`useQuery`, `useMutation`) only work in `"use client"` components
- Don't use Next.js server actions for data ops — use Convex mutations
- Don't use Next.js API routes for Convex ops — use Convex HTTP actions
- Always validate Convex function args with `v` validators
- Never edit files in `convex/_generated/` — they're auto-generated
