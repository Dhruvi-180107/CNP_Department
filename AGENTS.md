# AGENTS.md — CNP Department

Guidance for AI agents and contributors working in this repository.

## Project purpose

**CNP Department** is a college platform for **Student Managed Clubs (SMCs)** and **GUIITAR Projects**. Verified users (students, faculty, club/project administrators) discover organizations, participate in clubs and projects, manage events, handle join workflows, notifications, and (for project admins) inventory and material requests.

Five **role experiences** must remain distinct over time (different information architecture, priorities, and actions—not one generic dashboard with swapped cards):

| Role | `User.role` value |
|------|-------------------|
| Student | `student` |
| Faculty Coordinator | `faculty_coordinator` |
| Faculty Mentor | `faculty_mentor` |
| Club Admin | `club_admin` |
| Project Admin | `project_admin` |

**Team leader** is not a global role; it is a **project-level** assignment (`Project.teamLeaderId`).

## Absolute frontend stack (do not replace)

The frontend is **React only**, with the existing toolchain:

- React 19 + React DOM
- TypeScript
- Vite 8
- React Router 7
- Global styles in `frontend/src/app.css` (CSS custom properties, no component CSS framework)
- Shared API client: `frontend/src/services/api.ts`
- Auth: `frontend/src/context/AuthContext.tsx`

Do **not** migrate to Next.js, Vue, Svelte, Angular, or a second SPA. Do **not** add a UI kit or CSS framework without explicit approval and justification.

## Repository layout

```
CNP_Department/
├── backend/          Express 5 API, Mongoose models, JWT auth, Cloudinary uploads
├── frontend/         Vite React SPA (entry: src/main.tsx → App.tsx)
├── design-assets/    Source design files (e.g. loading screen)
├── docs/             Product and implementation briefs
└── .cursor/rules/    Cursor project rules
```

Backend entry: `backend/server.js`. API base path: `/api` (default `http://localhost:5000/api`).

Frontend dev server: Vite default (`npm run dev` in `frontend/`). Configure `VITE_API_URL` via `frontend/.env` (see `.env.example`).

## Architecture (frontend)

- **Routing:** `frontend/src/App.tsx` — public `/login`, `/register`; authenticated tree under `ProtectedRoute` + `AppLayout` (sidebar + header + `<Outlet />`).
- **Guards:** `ProtectedRoute` (auth), `RoleProtectedRoute` (e.g. `project_admin` for `/inventory`, `/material-requests`), profile completeness via `isProfileComplete()` (students need `universityId` + `semester`).
- **Layout:** `AppLayout`, `Sidebar` (`NAVIGATION` role-filtered), `Header` (page title, notification dropdown).
- **Loading:** `LoadingScreen` during auth bootstrap, route transitions (`RouteTransition` in `App.tsx`), and some page spinners.

**Styles:** Only `app.css` is loaded in production entry (`main.tsx` and `index.html`). Treat `frontend/src/style.css` and `main.ts` as unused Vite scaffold unless wired again.

**Design identity:** The **login page** (`pages/Auth/Login.tsx` + `.login-*` in `app.css`) is the visual reference—deep indigo/navy story panel, gold accent dots, Inter typography, editorial spacing. Authenticated shell uses a related but lighter palette (`--accent` indigo, soft gray surfaces). Preserve login branding; extend identity into dashboards without redesigning login.

## Architecture (backend)

- **Auth:** JWT in `Authorization: Bearer`; identity in `req.user` from middleware (`requireAuth`, `requireRole` / `requireAnyRole`).
- **Data:** MongoDB via Mongoose models under `backend/src/models/`.
- **Responses:** Typically `{ success, message?, data?, token?, user? }` — always read existing route handlers before assuming shapes.

Do **not** change API contracts, database models, or auth semantics unless explicitly tasked.

## Before modifying code

1. Read the files you will touch and their imports (follow the graph, do not assume dead code).
2. Confirm which CSS file is active (`app.css`).
3. Trace data from UI → `api()` → backend route → model.
4. Check role checks on both frontend routes and backend middleware.
5. Prefer extending existing components (`StudentClubCard`, `EventCard`, etc.) over duplicates.

## Coding standards

- **TypeScript:** Functional React components; typed props; avoid new `any` where domain types exist in `frontend/src/types/index.ts`.
- **Components:** Small, composable; separate fetch/hooks from presentation when complexity grows.
- **States:** Handle loading, error, empty, and success explicitly. Never show fabricated metrics or lists as if they came from the API.
- **CSS:** Use existing tokens in `:root` (`--accent`, `--text`, `--border`, etc.). Extend `app.css` or scoped class names—no second global design system.
- **Security:** Token in `localStorage` key `cnp_auth_token`; never log secrets; respect 401/403 from API.

## Backend integration rules

- Base URL: `import.meta.env.VITE_API_URL` (no trailing slash).
- Use `api<T>(method, endpoint, body?)` from `services/api.ts`; throws `ApiError` on non-OK responses.
- Auth endpoints: `POST /auth/login`, `POST /auth/register`, `POST /auth/logout`, `GET /auth/me`.
- After login, incomplete student profiles redirect to `/profile`.

## Scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `frontend/` | `npm run dev` | Vite dev server |
| `frontend/` | `npm run build` | `tsc && vite build` |
| `frontend/` | `npm run preview` | Preview production build |
| `backend/` | `npm run dev` | Node watch mode |
| `backend/` | `npm start` | Production server |
| `backend/` | `npm run seed` | Seed database |

There is **no** frontend ESLint/Jest script in `package.json` today; run `npm run build` in `frontend/` to typecheck.

## Related documentation

- `README.md` — overview (note: `PROJECT_DOCUMENTATION.md` is referenced but may be missing from the tree; rely on code and `docs/`).
- `docs/student-dashboard.md` — Student Dashboard implementation brief.
- `.cursor/rules/frontend-design.mdc` — visual and interaction standards.
- `.cursor/rules/react-components.mdc` — React/TS component standards.

## Current implementation notes (as of onboarding)

- `Dashboard.tsx` is a **single file** with role-specific branches; student UI already uses `StudentClubCard` / `StudentProjectCard` but shares a generic page chrome with other roles.
- Student club membership is resolved client-side by listing all clubs and calling `/clubs/:id/members` per club—**N+1 requests**; improving this requires a backend change (out of scope unless approved).
- Some inline styles reference CSS variables such as `--primary` that are **not** defined in `:root` (use `--accent` / login navy tokens when styling new work).

## Task boundaries for agents

- Inspect before implementing.
- Do not delete existing project files without explicit instruction.
- Do not commit unless the user asks.
- For dashboard work: follow `docs/student-dashboard.md` and wait for approval after onboarding before large UI implementation.
