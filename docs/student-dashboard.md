# Student Dashboard — Implementation Brief

Status: **Specification only** (not implemented in onboarding task).  
Audience: frontend implementers and reviewers.

## Product goal

Give **students** a home surface that answers, at a glance:

1. Where am I involved today (clubs and GUIITAR projects)?
2. What needs my attention (notifications, pending join requests)?
3. What is coming up on campus (events)?
4. Where do I go next (explore clubs/projects, profile)?

This must feel like a **student-specific** home—not the faculty coordinator’s operational console or the project admin’s inventory hub. It may share low-level UI primitives with other roles but not the same layout template with different numbers.

## Design direction

### Visual language

- **Anchor:** Login page aesthetics (navy/indigo depth, gold micro-accents, Inter, crisp borders)—translated to the lighter authenticated shell (`--bg`, `--accent`, white cards).
- **Tone:** Calm, collegiate, confident—editorial headers instead of “Dashboard 📊” emoji chrome.
- **Hierarchy:** Page hero (greeting + semester/department context from `user`) → primary panels (memberships) → secondary strip (events, requests, notifications).

### Layout (desktop ≥ 1024px)

- **Hero band:** Full width inside `main-content` padding; left-aligned greeting; optional subtle indigo wash or border-left accent echoing login story panel (CSS only, no new assets required).
- **Main column (≈ 2/3):** Clubs block, then Projects block (existing section semantics, elevated presentation).
- **Side column (≈ 1/3):** Upcoming events (compact list), pending join requests, notification summary + link to inbox.
- Use CSS grid on a wrapper (e.g. `.student-dashboard-layout`); stack to single column on tablet/mobile.

### Layout (mobile)

- Hero → Clubs → Projects → Events → Requests → Notifications CTA.
- Preserve touch-friendly cards; avoid hover-only affordances.

### Motion

- Section reveal: optional staggered fade/slide (≤ 400ms), disabled under `prefers-reduced-motion`.
- No continuous ambient animation on the dashboard.
- Prefer skeleton placeholders over blocking full-page spinner when partial data exists (Header already loads notification count separately).

## Component boundaries

### Reusable (existing or lightly extended)

| Component | Role |
|-----------|------|
| `StudentClubCard` | Club membership tile; keep keyboard activation |
| `StudentProjectCard` | Project membership tile with mentors/TL context |
| `EventCard` | Upcoming event row (`compact` prop as on coordinator dashboard) |
| `UserDisplay` | Consistent name rendering |
| `LoadingScreen` | App-level only; avoid for in-dashboard refetch |
| Global `.btn`, `.badge`, `.card`, `.empty-state`, `.student-cards-grid` | Actions and empties |

### New (recommended for implementation)

| Component | Responsibility |
|-----------|----------------|
| `StudentDashboardPage` | Top-level composition, grid layout, section order |
| `StudentDashboardHero` | Greeting, role-appropriate subtitle (department, semester from `user`) |
| `StudentDashboardSection` | Shared section header: title, count badge, optional “Explore →” link |
| `StudentMembershipEmpty` | Parameterized empty state (clubs vs projects) — replaces duplicated inline empty cards |
| `StudentUpcomingEventsPanel` | Fetches/displays upcoming events list + link to `/events` |
| `StudentJoinRequestsPanel` | Pending student join requests + statuses |
| `StudentNotificationsSummary` | Unread count + 2–3 recent items OR CTA to `/notifications` (can delegate fetch logic to a hook shared with Header patterns) |
| `useStudentDashboardData` | Parallel fetching, normalization, loading/error aggregation |

### Not reusable across roles

- Overall grid composition and copy priorities for `StudentDashboardPage` (faculty dashboards keep their own compositions).

### Integration point

- Replace or wrap the `user?.role === 'student'` branch in `pages/Dashboard/Dashboard.tsx` by rendering `<StudentDashboardPage />` without altering other role branches in the same task unless explicitly scoped.

## Data requirements (backend — do not invent)

All endpoints require JWT. Base: `/api`.

### Already used by current student dashboard logic

| Method | Endpoint | Purpose | Response notes |
|--------|----------|---------|----------------|
| GET | `/clubs` | List clubs | `{ success, data: Club[] }` |
| GET | `/clubs/:clubId/members` | Find current user’s membership | `{ success, data: members[] }` with `studentId`, `membershipType`, `position` |
| GET | `/users/:userId/projects` | Student’s project memberships | `{ success, data: [{ membershipId, joinedAt, project }] }` — caller must be same student |
| GET | `/projects/:projectId/mentors` | Mentors for card display | `{ success, data: [...] }` |

**Performance note:** Membership detection via “all clubs + per-club members” is **O(n clubs)** HTTP calls. Document in UI if slow; fixing requires a **new backend endpoint** (out of scope unless approved). Do not fake membership.

### Recommended for richer student home (existing APIs)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/events/upcoming` | Cross-club upcoming events (same as `Events.tsx` for students) |
| GET | `/join-requests/student` | Student’s join requests (club + project), all statuses |
| GET | `/notifications/unread-count` | Badge/summary (also used in Header) |
| GET | `/notifications?limit=5` | Recent items for summary panel (same as Header dropdown) |

### Explicitly out of scope unless backend adds routes

- Aggregated “student home” payload
- Activity timelines, streaks, leaderboard stats
- Cross-club analytics

Use only fields present on models/populated documents returned today.

### Auth context

- `useAuth().user` — `_id`, `name`, `department`, `semester`, `universityId`, `profileImage`, etc.
- Profile incomplete students are redirected to `/profile` before reaching dashboard routes.

## Responsive rules

- Breakpoints: align with existing `app.css` media queries for sidebar/mobile topbar (~768px).
- `.student-cards-grid`: maintain `auto-fill` min card width; single column on narrow screens.
- Side panel blocks become stacked sections with consistent vertical rhythm (`gap: 24–36px`).

## Accessibility

- Page title: rely on Header `h1` (“Dashboard”) plus in-content `h2` for “Your clubs” / “Your projects” (do not skip heading levels).
- Section headers associated with lists (`aria-labelledby`).
- Live regions: optional polite announcement when fetch completes with errors.
- Notification and request lists: list semantics (`ul`/`li` or `role="list"`).
- Focus order: hero → primary actions → cards left-to-right, top-to-bottom.

## Animation principles

- Enter: opacity + translateY(8px) max on sections.
- Cards: subtle hover elevation consistent with `.student-card` existing styles.
- Reduced motion: disable transforms; keep instant paint.

## Acceptance criteria

### Functional

- [ ] Only users with `role === 'student'` see the new student dashboard composition.
- [ ] Clubs section lists only clubs where the authenticated student has a membership (same data rules as today).
- [ ] Projects section lists projects from `/users/:userId/projects` with mentor enrichment as today (or fewer calls if optimized without backend change).
- [ ] Empty states for zero clubs and zero projects with working CTAs to `/clubs` and `/projects`.
- [ ] Upcoming events panel uses `/events/upcoming` or shows empty state; link to `/events`.
- [ ] Join requests panel uses `/join-requests/student`; shows pending (and optionally recent decided) requests without fabricating entries.
- [ ] Notification summary uses real unread count and/or recent notifications; links to `/notifications`.
- [ ] Loading and error states do not crash the page; errors are human-readable.
- [ ] No mock data presented as production content.

### Design

- [ ] Visually aligned with login indigo/gold identity and authenticated `app.css` tokens.
- [ ] Distinct from faculty/admin dashboard layouts (not the same card grid of operational widgets).
- [ ] Responsive single-column behavior on mobile; no critical content only on hover.
- [ ] `prefers-reduced-motion` respected for new animations.

### Technical

- [ ] TypeScript without new unnecessary `any`.
- [ ] No new npm dependencies unless approved with justification.
- [ ] No changes to login page, auth flow, or backend routes/models for the initial student dashboard UI pass.
- [ ] `npm run build` in `frontend/` succeeds.

## Out of scope (follow-up tasks)

- Faculty Coordinator, Faculty Mentor, Club Admin, Project Admin dashboard redesigns.
- Backend endpoint to fetch “my club memberships” in one call.
- Replacing emoji sidebar icons with SVG set.
- Fixing undefined `--primary` CSS variables globally (may be done separately).

## Test plan (manual)

1. Log in as student with club + project memberships → all sections populated.
2. Student with none → empty states and CTAs.
3. Student with pending join request → visible in requests panel.
4. Upcoming events exist → panel lists items; none → empty copy.
5. Resize to mobile → order and tap targets acceptable.
6. Keyboard: navigate cards and primary buttons.
7. Enable reduced motion in OS → no staggered animation.
8. Other roles unchanged on `/dashboard`.
