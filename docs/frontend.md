# Frontend — Next.js

The frontend uses **Next.js 16** with the **App Router**.

## Key Decisions

- **Server components by default** — only add `"use client"` when interactivity requires it
- **`@repo/shared-types`** — Never write API response types manually. Import them from the shared package.
- **`@repo/ui`** — Look here before creating a new component.

## Using Types from the Shared Package

```typescript
import type { HealthResponse } from "@repo/shared-types";

async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch("http://localhost:8000/health");
  return res.json();
}
```

## Using the UI Library

```typescript
import { Button } from "@repo/ui";

export default function Page() {
  return <Button variant="primary">Click me</Button>;
}
```

## Page Structure

Pages go in `src/app/` following App Router conventions:

```
src/app/
├── layout.tsx          # Root layout (html, body, providers)
├── page.tsx            # Home page (/)
├── users/
│   ├── page.tsx        # /users
│   └── [id]/page.tsx   # /users/:id
```
