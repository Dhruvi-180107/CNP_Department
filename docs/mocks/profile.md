# Profile — what is derived or client-side

The profile area keeps the existing contracts: `GET /auth/me` on boot, `PATCH /users/profile` on
save and `POST /users/profile-image` on upload. Field names, required attributes, the `FormData`
key (`image`), the save/cancel rules and the messages the API returns are untouched.

Everything below is computed from the response those calls already return.

| What | Where | Why it is client-side today | Suggested API |
|---|---|---|---|
| Completeness percentage, meter fill and "Missing …" label | Identity band | No completeness field exists. It is derived from `name`, `department`, `phone`, plus `universityId` and `semester` for students — the exact predicate behind `isProfileComplete()`. Marked `// MOCK:` in `Profile.tsx` | Return `completeness: { percent, missing[] }` (or a required-field list) from `GET /auth/me` so the rule lives in one place |
| "Member since" date | Account panel | `createdAt` is returned by Mongoose on the user document but is not in the documented `User` shape or `frontend/src/types`. The row is omitted when the field is missing. Marked `// MOCK:` | Add `createdAt` to the documented user payload and to the `User` type |
| Live identity preview while editing | Identity band above the form | Reads the unsaved `formData` (falling back to the saved user) so the name and academic line reflect typing; it is a preview, not a persisted value | Not needed — presentation only |
| Photo state ("Uploaded image" / "Initials monogram") | Account panel | Derived from the presence of `profileImage`; there is no separate media record | Not needed |
| Copy-email button and "Email address copied" announcement | Contact panel | Client clipboard only. Action is a progressive enhancement: the `mailto:` link remains and failures are silent | Not needed |
| Initials monogram | Identity band, UserDisplay, UserSelect | Derived from the name's first two words when `profileImage` is null. `profileImage` itself comes from the API | Not needed |

## Verification-only substitutes

The screenshots for the incomplete, save-error and save-success states were produced with Puppeteer
request interception (an empty `phone`, a 400 from `PATCH`, a 200 carrying a bio). Those responses
are **not** shipped code and no seed record was written. The real pages render from the API.

The temporary dev preview entry used to capture screenshots while other agents' imports were
incomplete (`frontend/__profile-preview.html`, `src/pages/Profile/__preview.tsx`) has been deleted.

## Integration note

`UserDisplay` is still exported with the same props and guards, but no page in the current tree
imports it any more — other areas replaced it with their own person markup while this work was in
progress. `UserSelect` is still imported by `ClubManagement`, `ProjectManagement` and
`ProjectMentors`; it was checked inside the club "Add member" modal.
