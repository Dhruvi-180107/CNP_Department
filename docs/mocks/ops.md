# Operations console — what is mocked or client-side

Screens: `/inventory` and `/material-requests` (`pages/Inventory`, `pages/MaterialRequests`).
Nothing below invents a record, a name or a count. Every list, name and quantity comes
from `GET /inventory`, `GET /allocations` or `GET /material-requests`.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| "Running low" count and `Low` / `Out` row tags | Inventory stats + stock table | `GuitarInventory` has no minimum-stock field. "Low" is a presentation rule: available stock is under 25% of that item's own `totalQuantity` (`LOW_STOCK_RATIO` in `Inventory.tsx`). It never changes stock. **This threshold is a mock policy**; replace it with a real field before treating it as an operational alert. | Add `minimumStock` to `GuitarInventory`, returned by `GET /inventory`; or `GET /inventory/stock-health`. |
| Item search and category filter | Inventory page head + table | `GET /inventory` returns every item; the filter narrows the client list. Category filter only renders when at least one item has a category. | `GET /inventory?q=&category=` |
| "Allocated" stat (`total - available`) | Inventory stats strip | Derived from the two fields the API already returns. It counts every unit not on the shelf; manual quantity adjustments can make it differ from the sum of allocation records. | `GET /inventory/summary` if the account needs to tell allocation drift from approvals. |
| Request status / project / text filters and their counts | Material requests toolbar | `GET /material-requests` returns the full list. Status tabs existed before; project + text filters are new. Counts are computed from the same list. | `GET /material-requests?status=&projectId=&q=` and a `counts` block in the response. |
| "Units requested" and "Oldest waiting" stats | Material requests stats strip | Derived from pending `quantity` and `createdAt`. `Oldest waiting` is a duration, not a timestamp returned by the API. | `GET /material-requests/summary` returning `pendingCount`, `pendingUnits`, `oldestPendingAt`. |
| Resolved section collapsed by default | Material requests | Presentation only; the data is already in the list. | None |
| Approved/rejected `View` and the row-open drawer | Material requests | The drawer reuses the existing populated request object; no extra fetch. | None |
| Inventory edit form | Inventory row actions, edit modal | New UI over the **existing** `PUT /inventory/:id` endpoint (name, description, category, location only). Quantity is deliberately not editable there; `PATCH /inventory/:id/quantity` keeps available stock in step. | None |
| Inventory search, allocation approver identity | Inventory aside rows | Allocations return `allocatedBy`; the row shows the name and date, with email + department tucked into the hover title (the previous `UserDisplay` block showed them permanently). | None |
| Approve confirmation | Material requests approve modal | Replaces `window.confirm` with a styled modal. The guard is identical: if requested quantity exceeds current stock it warns that approval may fail and offers "Attempt approval"; otherwise it states the one-time deduction. | None |
| Refresh buttons | Both panel heads | Re-read the same endpoint; no extra capability. | None |

No bulk approve/reject action was added. Rejecting still requires a non-empty
`rejectionReason` and still posts to `PATCH /material-requests/:id/reject`; approving
still posts to `PATCH /material-requests/:id/approve`.

## Shared stylesheet repairs

`ops.css` restores a few `ui.css` declarations that the legacy `app.css` overrides by
specificity on the page where those primitives are used (not a new skin):

- bare `label` → `text-transform: none` and normal tracking;
- bare `input[type]` / `select` / `textarea` → sheet background, rule border, body font
  and size for `.ui-field`;
- `.ui-seg button` → borderless children (the browser default frame showed through).

These should be fixed in the primitive layer or the global reset so no other area has to
repeat them.
