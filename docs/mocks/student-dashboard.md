# Student dashboard — client-side values

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| Days to the next event ("Next event in 7 days", the `7` tile) | `StudentDashboardPage.tsx`, `StudentDashboardHeader.tsx`, `StudentUpcomingEvents.tsx` | `/events/upcoming` returns a list of events; the page sorts it and diffs local calendar days | `GET /students/me/summary` returning `nextEvent` + `daysUntil` |
| "3 events ahead" | Next-up panel head, stat strip | Count of the upcoming-events payload (the endpoint is already scoped to future dates) | Same summary endpoint |
| "`1 core team`" / "`1 as team lead`" stat qualifiers | `StudentOverview.tsx` | Derived from `membership.membershipType` and `project.teamLeaderId === user._id` | Summary endpoint with role counts |
| Pending join-request ids per project ("Request pending" tag) | `StudentProjects.tsx` | `/join-requests/student` is fetched whole and matched to project ids on the client | Include `requestStatus` on each project in `/users/:id/projects` |
| "2h ago" on notifications | `StudentNotificationSummary.tsx` | Notifications return `createdAt` only | Optional: `createdLabel` (but relative time is a display concern) |
| Clubs joined (count + membership role) | `useStudentDashboardData.ts` (existing, untouched) | The hook lists every club and calls `GET /clubs/:id/members` per club to find the student's membership — N+1 requests | `GET /students/me/clubs` returning the student's memberships |

Nothing on this screen is fabricated. Every number and label resolves to a field in one of
the five existing fetches (`/clubs`, `/clubs/:id/members`, `/users/:id/projects`,
`/events/upcoming`, `/join-requests/student`, `/notifications`, `/notifications/unread-count`)
or to arithmetic over those fields. Grep `// MOCK:` for the derived ones.

Unchanged and deliberately not "fixed": the N+1 club-membership resolution lives in
`useStudentDashboardData.ts`, which was not in scope for this redesign. It is the one
obvious candidate for a dedicated endpoint.
