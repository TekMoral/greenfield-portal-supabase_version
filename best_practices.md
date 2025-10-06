# 📘 Project Best Practices

## 1. Project Purpose
A modern school portal web application built with React and Vite. It provides role-based dashboards and workflows for students, teachers, and administrators, including authentication, class/subject management, assignments (theory and objective), exams, results, timetables, news, and reports. Supabase is used for authentication, data storage, and server-side RPCs with RLS-aware design.

## 2. Project Structure
- Root
  - index.html, vite.config.js, tailwind.config.js, eslint.config.js
  - .env/.env.example for environment configuration
  - package.json with Vite scripts and Supabase CLI shortcuts
- src/
  - App.jsx, main.jsx, App.css, index.css
  - assets/: static assets
  - components/: shared UI, domain-specific components, guards (RoleBasedRoute), debug tools
  - constants/: app-wide constants
  - contexts/: global React contexts (e.g., SupabaseAuthContext)
  - data/: sample or fixture data
  - examples/: example snippets
  - features/: feature-first modules (e.g., assignments) with api, components, hooks
  - hooks/: reusable hooks (auth, audit log, toasts, reports)
  - layouts/: top-level layout shells (DashboardLayout, StudentLayout, TeacherLayout)
  - lib/: low-level libraries and clients (supabaseClient)
  - pages/: route-level pages grouped by domain (student/, admin/, dashboard/, academics/)
  - routes/: central route configuration (AppRouter.jsx)
  - services/: legacy/aggregate service facades, currently supabase/ domain services
  - utils/: shared utility functions (auth, RLS, uploads, schema, etc.)
  - public/: static public assets

Aliases (vite.config.js):
- @features -> src/features
- @shared -> src/shared
- @lib -> src/lib
- @services -> src/services
- @pages -> src/pages

Entry points and configuration:
- App.jsx wraps the app with AuthProvider, Router, ErrorBoundary, and react-hot-toast.
- routes/AppRouter.jsx defines all routes with Suspense and lazy loading via utils/lazyWithRetry.
- contexts/SupabaseAuthContext.jsx provides auth state, role, and helpers. It augments user as { id, uid } for legacy compatibility.
- lib/supabaseClient.js configures the Supabase client, validates env vars, and exposes debug helpers.

## 3. Test Strategy
Current state:
- No formal test framework or test folders detected.

Recommended approach:
- Frameworks: Vitest + React Testing Library for unit/component tests; Playwright or Cypress for basic E2E flows.
- Structure: co-locate tests as `*.test.jsx` next to modules or under `src/__tests__/` mirroring structure.
- Mocks: mock Supabase client (src/lib/supabaseClient) via vi.mock; provide fake RPC responses. Prefer testing service functions by mocking network/database; test UI with RTL and mock hooks/contexts where needed.
- Types/Contracts: validate service function contracts that follow `{ success, data, error }` shape.
- Coverage: aim for ~70%+ on services and critical UI flows (auth, routing guards, assignments submit flow).
- Integration tests: cover auth flows, role-guarded routes (RoleBasedRoute), assignment submission (objective + theory), and RLS-sensitive service fallbacks (RPC -> direct select).

## 4. Code Style
- Language & modules: ESM ("type": "module"). React 19, React Router v7.
- Linting: ESLint with `@eslint/js`, react-hooks, and react-refresh. `no-unused-vars` ignores UPPERCASE pattern.
- Styling: Tailwind CSS (v4). Keep utility classes concise and semantic.
- Naming conventions:
  - Files: PascalCase for components (Component.jsx), camelCase for utilities/services (serviceName.js).
  - Variables/functions: camelCase; React components PascalCase; hooks start with `use...`.
  - Exports: prefer named exports for services; maintain index.js aggregators to expose modules.
- Async/await: use try/catch; service functions return `{ success, data, error }` consistently.
- Error handling:
  - Log errors in services; return friendly error messages.
  - In UI, fail soft with toasts or user-friendly messages; keep console noise low in production code.
  - For Supabase + RLS: Prefer SECURITY DEFINER RPCs; implement safe fallbacks (see assignments API).
- Environment access: only via `import.meta.env.*` in client; validate required vars (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
- State management: use React hooks and context; update state immutably; keep derived values in memoized selectors when necessary.
- Suspense/lazy: use lazyWithRetry for resilience; wrap in <Suspense> with small loading placeholders.

## 5. Common Patterns
- Service layer pattern (src/services/supabase/*):
  - Functions interact with tables, RPCs, or compose domain operations.
  - Return object shape `{ success, data, error }` for predictable UI handling.
  - Handle RLS by preferring RPCs; fallback to direct selects when permitted.
- Feature-first architecture (src/features/assignments):
  - api/: CRUD and domain logic (crud.js, submissions.js, questions.js, management.js, normalize.js)
  - The legacy service facade (src/services/supabase/assignmentService.js) adapts feature APIs to existing UI shapes and normalizes rows through mappers like `mapAssignmentRowToUI`.
  - Objective assignments use a modal with client-side validation and auto-scoring persisted via `assignment_question_responses` then summarized to `auto_score` (teacher finalizes grade).
- Auth context:
  - contexts/SupabaseAuthContext.jsx provides `user`, `profile`, `role`, `isActive`, helpers, and guards (hasRole/isAdmin/isSuperAdmin).
  - `withUid` augments user with `uid` to support legacy code.
  - AbortController is used to avoid race conditions when fetching profiles.
- Routing & guards:
  - AppRouter uses `RoleBasedRoute` for role-protected sections.
  - Lazy routes with Suspense and small spinner fallback.
- Tailwind UI patterns:
  - Utility classes for layout and status chips; consistent semantic colors per status.
- Build optimization:
  - manualChunks configured for react, router, and supabase to improve caching.

## 6. Do's and Don'ts
- ✅ Do
  - Use path aliases (@lib, @features, @services, @pages) for imports.
  - Prefer SECURITY DEFINER Supabase RPCs for RLS-sensitive reads; implement fallback strategies thoughtfully.
  - Maintain the `{ success, data, error }` return shape in services for consistency.
  - Validate inputs in UI before calling services (e.g., non-empty submission text or all objective answers filled).
  - Use AuthProvider (contexts/SupabaseAuthContext) and `useAuth()` for user/role data. Check `user?.id` before queries.
  - Keep UI state updates immutable and minimal; compute derived status in helpers.
  - Use Suspense with lazyWithRetry for route-level code-splitting.
  - Keep environment variables in `.env` and validate in `lib/supabaseClient.js`.
  - Prefer named exports; aggregate via `index.js` where appropriate.
  - Add unit tests for services and critical components following the recommendations above.

- ❌ Don't
  - Don’t query tables directly when an RPC exists for the same purpose under RLS; avoid complex multi-join client queries that may fail with RLS.
  - Don’t access localStorage directly for auth/session; use the wrapped `customStorage` in supabaseClient.
  - Don’t rely on `window.supabase` outside of debugging contexts.
  - Don’t use `useAuth` outside of AuthProvider; don’t assume `user.uid` exists unless coming from the context (legacy aliasing is provided).
  - Don’t break the service return contract; avoid throwing in UI layers—prefer returning structured results from services.
  - Don’t bypass role checks; use RoleBasedRoute and helper guards.

## 7. Tools & Dependencies
- Core
  - React 19 + React Router v7: SPA and routing
  - Vite 7: dev/build tooling; manualChunks configured
  - Tailwind CSS 4: styling
  - ESLint 9: linting with react-hooks and react-refresh integration
- Data & Auth
  - @supabase/supabase-js v2: auth, DB, RPCs; RLS-aware patterns
- UX
  - react-hot-toast: toasts
  - react-hook-form: form handling (where applicable)
- Other deps present
  - @tanstack/react-query: available for data fetching patterns (introduce consistently if used)
  
Setup & Scripts
- Environment: create `.env` from `.env.example` and set VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- Install: `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build` and `npm run preview`
- Supabase: `npm run supabase:start|stop|serve|deploy`

## 8. Other Notes
- Path aliases are required for imports; keep them in sync if folders move.
- Maintain the auth augmentation of `user.uid = user.id` for legacy compatibility.
- For assignments domain:
  - Use feature APIs under `src/features/assignments/api/*` for new code.
  - Use the facade in `src/services/supabase/assignmentService.js` when interacting with legacy pages to ensure normalized UI shapes.
  - Prefer RPCs `rpc_list_assignments_for_current_student` and `rpc_list_questions_for_current_student` for student-facing reads.
- When adding new services, follow the consistent return contract, handle RLS (RPC-first), and colocate domain logic under `features/<domain>/api`.
- Keep UI consistent with Tailwind utilities and status color conventions (graded/ submitted/ pending/ overdue).
- This codebase uses ESM and modern React; avoid deprecated lifecycle patterns and ensure hooks rules compliance.
