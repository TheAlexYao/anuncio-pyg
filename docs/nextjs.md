# Next.js Conventions

Using Next.js App Router with Convex as the backend.

## Project Structure

```
app/
  layout.tsx          # Root layout — ConvexProvider goes here
  page.tsx            # Home page
  dashboard/
    layout.tsx        # Dashboard layout (sidebar, nav)
    page.tsx          # Dashboard home
    [id]/
      page.tsx        # Dynamic dashboard by ID
  api/                # Only for webhooks/external integrations — prefer Convex HTTP actions
providers.tsx         # Client wrapper for ConvexProvider
```

## Server vs Client Components

**Default is Server Component** — no directive needed.

```tsx
// Server Component (default) — runs on server, no hooks, no interactivity
export default async function Page() {
  return <div>Static content</div>;
}
```

```tsx
// Client Component — add "use client" at top
"use client";
import { useQuery } from "convex/react";
export default function Dashboard() {
  const data = useQuery(api.dashboards.list);
  return <div>{/* interactive UI */}</div>;
}
```

**When to use which:**
- **Server Component**: layouts, static content, pages that just compose client components
- **Client Component**: anything using Convex hooks (`useQuery`, `useMutation`), React state, event handlers, browser APIs

## Convex + Next.js Integration

### Provider Setup (`app/providers.tsx`)

```tsx
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
```

### Root Layout (`app/layout.tsx`)

```tsx
import { ConvexClientProvider } from "./providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
```

### Using Convex in Components

```tsx
"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function TaskList() {
  const tasks = useQuery(api.tasks.list);
  const createTask = useMutation(api.tasks.create);

  if (tasks === undefined) return <div>Loading...</div>;

  return (
    <div>
      {tasks.map((task) => (
        <div key={task._id}>{task.text}</div>
      ))}
      <button onClick={() => createTask({ text: "New task" })}>Add</button>
    </div>
  );
}
```

## Routing

### Dynamic Routes

```
app/dashboard/[id]/page.tsx    → /dashboard/abc123
app/[...slug]/page.tsx         → catch-all route
```

```tsx
export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DashboardView id={id} />;
}
```

### Layouts (shared UI that persists across navigation)

```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
```

### Loading & Error States

```tsx
// app/dashboard/loading.tsx — shown while page loads
export default function Loading() {
  return <div>Loading...</div>;
}

// app/dashboard/error.tsx — shown on error
"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return <button onClick={reset}>Try again</button>;
}
```

## Key Rules

1. **No Server Actions for data** — use Convex mutations/queries instead, not Next.js server actions
2. **No `fetch` in components for Convex data** — use `useQuery`/`useMutation` hooks
3. **`useQuery` returns `undefined` while loading** — always handle the loading state
4. **Convex hooks only work in Client Components** — add `"use client"` directive
5. **Environment variable**: `NEXT_PUBLIC_CONVEX_URL` must be set in `.env.local`
6. **Don't use Next.js API routes for Convex operations** — use Convex HTTP actions instead
7. **Layouts don't re-render on navigation** — put shared state/providers in layouts
8. **`params` is a Promise in App Router** — always `await params` before using

## Styling

Use Tailwind CSS. No CSS modules, no styled-components.

```bash
bun install tailwindcss @tailwindcss/postcss postcss
```
