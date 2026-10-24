# Staff dashboards — what is derived or held client-side

Area: `frontend/src/pages/Dashboard/*` (faculty coordinator, club admin, faculty mentor, project admin).
Nothing below invents a value: each row is computed from a payload the four screens already fetch.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| Join-request queue sorted newest first across clubs | Coordinator — "Requests to review" | `/join-requests/club/:id` is fetched per club and merged; the merge is re-sorted by `createdAt` in the browser | `GET /join-requests/reviewer?status=pending&sort=createdAt` returns the reviewer's queue in order |
| Core-team share per club ("2 in core") | Coordinator — club rows | `/clubs?coordinatorId=` already returns `coreTeamCount` and `totalMembers`; the ratio is drawn as a meter | — (no new call needed) |
| Pending-request count per club | Coordinator — club rows | Derived by grouping the merged pending requests by `clubId` | Include `pendingRequestCount` on `GET /clubs` |
| Coordinator coverage meter ("2 / 3") | Club admin — clubs panel | `withCoordinator / totalClubs`, both already computed in the dashboard | — |
| Clubs without a coordinator, and request counts per club | Club admin — "Needs attention" | Filter over `GET /clubs` on `facultyCoordinatorId`, plus `status === 'pending'` filter over `/join-requests/club/all` | `GET /clubs?unassigned=true` and a `pendingCount` on the club record |
| Portfolio status filter (All / Active / Completed / Inactive) | Project admin — Portfolio | `GET /projects` returns every project; the segmented control filters in memory | `GET /projects?status=active` |
| Teams without a leader | Project admin — ops strip + stats | `totalProjects - withTeamLeader`, both already derived in the dashboard | — |
| Units on loan ("57 of 215 units on loan") | Project admin — ops strip, Inventory head, mobile inventory list | Sum of `totalQuantity - availableQuantity` over `GET /inventory`; the endpoint has no aggregate | `GET /inventory/summary` returning `{ items, unitsTotal, unitsOnLoan }` |
| Inventory shelf list (first 4 rows on desktop) and "N more" notes | Project admin — Inventory table, queues | The full `/inventory` and `/material-requests` payloads are already in memory; the table slices for density | Add pagination params to `/inventory` and `/material-requests` |
| "N more in the queues" footnote | Project admin — "Waiting on you" | `pendingMaterials` and `pendingJoins` are sliced to 4 rows each | Return queue counts with the list payloads |
| Unread notification count | All four screens — page head | Counts `isRead === false` over `GET /notifications` (same derivation the old dashboard used) | `GET /notifications/unread-count` already exists; the shell header uses it |
| "Updated 24 Oct" recency on projects | Mentor and project admin — project rows | Uses the real `updatedAt` on each project document, not an activity feed | `GET /projects/:id/activity` if per-project activity is wanted |
| Team size on mentored projects | Mentor — rows (omitted) | `/mentors/:id/projects` returns `assignmentId`, `isPrimary`, `assignedAt` and the project, but no member count, so no team size is shown | Add `memberCount` to the project object in that payload, or call `GET /projects/:id/members` |

Notes

- No placeholder chart, fake number, disabled invented control or fabricated name is rendered anywhere on these four screens.
- The event create/edit form is the existing `EventForm` component, embedded in the events panel; no events API call or guard was changed.
- The coordinator error state (`/clubs?coordinatorId=` failing) is preserved and shown as a `.ui-notice--error` with a retry.
