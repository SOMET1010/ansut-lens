

## Role-Based Access Controls for Admin Panel and Danger Zone Alerting

### Current State

The routing layer already enforces permission-based access via `PermissionRoute` for most admin sub-pages. However, several gaps exist:

1. **Unprotected admin routes**: `/admin/presentation`, `/admin/formation`, `/admin/documentation` have no permission checks -- any authenticated user with `access_admin` can reach them.
2. **Admin dashboard shows all cards**: The `AdminPage` renders every navigation card regardless of the user's permissions. A user with `access_admin` but without `manage_users` still sees the "Utilisateurs" card.
3. **Sidebar admin check is inconsistent**: `AppSidebar` uses `isAdmin || hasPermission('manage_users') || hasPermission('manage_roles')` instead of the canonical `hasPermission('access_admin')`.
4. **No danger zone alerting**: Destructive actions (delete user, disable user, role changes, cron toggle) lack visual "danger zone" grouping and confirmation warnings.

### Plan

#### 1. Wrap AdminPage nav cards with PermissionGate

Each `AdminNavCard` on the admin dashboard will be conditionally rendered based on the user's permissions. Cards the user cannot access will simply not appear.

**File**: `src/pages/AdminPage.tsx`

- Import `PermissionGate` from `@/components/auth`
- Wrap each card with the matching permission:
  - "Utilisateurs" -> `manage_users`
  - "Roles & Permissions" -> `manage_roles`
  - "Audit Logs" -> `view_audit_logs`
  - "Mots-cles" -> `manage_keywords`
  - "Sources & Medias" -> `manage_sources`
  - "Import Acteurs" -> `import_actors`
  - "Newsletters" -> `manage_newsletters`
  - "Diffusion" -> `manage_newsletters`
  - "Taches CRON" -> `manage_cron_jobs`
  - "Statut SPDI Batch" -> `manage_cron_jobs`
  - "Formation", "Presentation", "Documentation" -> `access_admin` (visible to all admin users)

#### 2. Add permission routes for unprotected admin pages

**File**: `src/App.tsx`

- Wrap `/admin/presentation`, `/admin/formation`, `/admin/documentation` inside a `PermissionRoute` with permission `access_admin` (they are already nested under the `access_admin` route, so this is already enforced at the parent level -- no change needed here actually).

After re-examining, these three routes are already nested inside `<PermissionRoute permission="access_admin">`, so they are protected. No routing change is needed.

#### 3. Fix sidebar admin access check

**File**: `src/components/layout/AppSidebar.tsx`

- Change line 94 from:
  ```
  const hasAdminAccess = isAdmin || hasPermission('manage_users') || hasPermission('manage_roles');
  ```
  to:
  ```
  const hasAdminAccess = hasPermission('access_admin');
  ```
  This aligns the sidebar visibility with the actual route permission.

#### 4. Create a DangerZoneAlert component

**File**: `src/components/admin/DangerZoneAlert.tsx` (new)

A reusable alert banner for dangerous action sections. It will display:
- A red/amber warning border and icon (AlertTriangle)
- A title (e.g., "Zone sensible")
- A description explaining the risk
- Children slot for the actual dangerous actions

#### 5. Add danger zone sections to key admin pages

**File**: `src/pages/admin/UsersPage.tsx`
- Group the "Disable", "Delete" actions inside a visual danger zone within the user dropdown menu, with a separator and a red-tinted label "Actions dangereuses"
- Add a `DangerZoneAlert` banner above the delete confirmation dialog to reinforce the irreversibility

**File**: `src/pages/admin/CronJobsPage.tsx`
- Wrap the toggle (enable/disable) controls for cron jobs in a danger zone callout when toggling OFF, since disabling automated collection can cause data gaps

**File**: `src/pages/admin/RolesPage.tsx`
- Add a danger zone warning inside the `RolePermissionsDialog` when modifying admin-level permissions (manage_users, manage_roles), alerting that changes take effect immediately

#### 6. Add audit logging for danger zone actions (enhancement)

The existing audit log infrastructure already captures `user_deleted`, `user_disabled`, `role_changed`. We will add a visual toast warning before these actions confirming the audit trail: "Cette action sera tracee dans le journal d'audit."

---

### Technical Details

**Components affected:**
- `src/pages/AdminPage.tsx` -- wrap cards with `PermissionGate`
- `src/components/layout/AppSidebar.tsx` -- fix admin access check
- `src/components/admin/DangerZoneAlert.tsx` -- new reusable component
- `src/pages/admin/UsersPage.tsx` -- danger zone UI in actions dropdown
- `src/pages/admin/CronJobsPage.tsx` -- danger zone for toggle-off
- `src/pages/admin/RolesPage.tsx` -- danger zone for sensitive permission changes

**No database changes required.** All permission codes already exist in `permissions_registry` and `role_permissions`.

**No new dependencies.** Uses existing `lucide-react` icons and shadcn components.

