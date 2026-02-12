# Anuncio PYG

## Runtime

- Use Bun, not Node.js/npm/pnpm
- `bun install` for packages, `bun run <script>` for scripts, `bun test` for tests
- Bun auto-loads .env — don't use dotenv

## Backend: Convex

All backend logic lives in `convex/`. Convex is the database, server functions, and file storage.

### Commands

```bash
npx convex dev          # Start dev server (watches convex/ for changes)
npx convex deploy       # Deploy to production
npx convex env set KEY value  # Set environment variable
npx convex env get KEY  # Get environment variable
```

### Schema (`convex/schema.ts`)

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  tasks: defineTable({
    text: v.string(),
    isCompleted: v.boolean(),
    userId: v.id("users"),
  })
    .index("by_user", ["userId"])
    .index("by_completed", ["isCompleted"]),
});
```

- Every table needs `defineTable` with validators
- Always add indexes for fields you query/filter on
- Use `v.id("tableName")` for foreign keys
- `_creationTime` is auto-added to every document

### Validators (`v`)

```ts
v.string()              // string
v.number()              // number (float64)
v.boolean()             // boolean
v.null()                // null
v.id("tableName")       // document ID reference
v.array(v.string())     // array of strings
v.object({ k: v.string() })  // nested object
v.optional(v.string())  // optional field
v.union(v.string(), v.number())  // union type
v.literal("active")     // literal value
```

### Queries (read-only, reactive, cached)

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tasks")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});
```

- Queries are pure — no side effects, no network calls
- Always use `.withIndex()` instead of `.filter()` for performance
- Use `.collect()` for all results, `.first()` for one, `.take(n)` for n
- Queries auto-rerun when underlying data changes (reactive)

### Mutations (read/write, transactional)

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const create = mutation({
  args: { text: v.string() },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("tasks", {
      text: args.text,
      isCompleted: false,
    });
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("tasks"), isCompleted: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { isCompleted: args.isCompleted });
  },
});

export const remove = mutation({
  args: { id: v.id("tasks") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

- Entire mutation is a transaction — no begin/end needed
- Auto-retried on conflicts
- No side effects allowed (no network calls, no randomness)
- Use `ctx.db.insert()`, `ctx.db.patch()`, `ctx.db.replace()`, `ctx.db.delete()`

### Actions (side effects, external APIs)

```ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const sendEmail = action({
  args: { to: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    // Can make network calls
    await fetch("https://api.email.com/send", {
      method: "POST",
      body: JSON.stringify(args),
    });
    // Can call mutations/queries via scheduler
    await ctx.runMutation(api.emails.markSent, { to: args.to });
  },
});
```

- Use actions for: external API calls, non-deterministic logic
- Actions can NOT read/write DB directly — use `ctx.runQuery()` / `ctx.runMutation()`
- Actions are NOT automatically retried

### Internal Functions (not exposed to client)

```ts
import { internalQuery, internalMutation, internalAction } from "./_generated/server";
```

- Use `internal` prefix for functions only called server-side
- Reference with `internal.filename.functionName` instead of `api.`

### HTTP Actions (`convex/http.ts`)

```ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";

const http = httpRouter();

http.route({
  path: "/webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const body = await request.json();
    await ctx.runMutation(api.events.create, { data: body });
    return new Response("OK", { status: 200 });
  }),
});

export default http;
```

### Scheduling & Cron Jobs (`convex/crons.ts`)

```ts
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

crons.daily("cleanup", { hourUTC: 3, minuteUTC: 0 }, api.tasks.cleanup);
crons.interval("heartbeat", { minutes: 5 }, api.health.ping);

export default crons;
```

One-off scheduling from mutations:
```ts
await ctx.scheduler.runAfter(60000, api.tasks.remind, { taskId });
```

### File-based Routing

- `convex/tasks.ts` → `api.tasks.list`, `api.tasks.create`
- `convex/users.ts` → `api.users.get`, `api.users.update`
- Organize by domain, not by function type

### Key Rules

1. Always validate args with `v` validators — never trust client input
2. Queries and mutations run in the Convex runtime — no Node.js APIs, no `fs`, no `process`
3. Actions run in Node.js — full access to Node APIs and npm packages
4. Use `convex/` folder only for Convex functions — client code goes elsewhere
5. `_generated/` is auto-generated — never edit these files
6. Environment variables: set via `npx convex env set`, access via `process.env` in actions only
7. For pagination use `.paginate(opts)` with `paginationOptsValidator`
8. IDs are opaque strings — don't parse or construct them manually
