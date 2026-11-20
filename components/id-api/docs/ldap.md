# LDAP / Active Directory login

The `ldap` provider lets users sign in to Liquio with their directory account. Membership in directory groups decides:

- whether the user can sign in to this Liquio environment at all (`accessGroups`);
- which units the user belongs to, as member or head (configured on the units, see [Unit mapping](#unit-mapping)).

Membership is re-checked in the background. When a user is removed from the access groups, disabled or deleted in the directory, their Liquio sessions and tokens are revoked.

The provider targets Active Directory. Other servers work only for plain `memberOf` group resolution (`nestedGroups: false`) and are not supported beyond that.

User roles (`users.role`) are never read or written by this provider. Access levels come from units only.

## Prerequisites

- A read-only service account that can search users and groups under `baseDN`.
- `ldaps://` (port 636) or `ldap://` with StartTLS. If the directory certificate isn't signed by a public CA, provide the CA certificate.
- Redis shared by id-api and task: the same instance, db 0. The background sync needs it for its lock, and revocation clears task's cached sessions in it.
- Users need these attributes:
  - a stable unique id (`objectGUID` by default);
  - `userAccountControl`, `accountExpires` and `msDS-User-Account-Control-Computed` (AD), used to detect disabled, expired and locked accounts;
  - `memberOf`, or group `member` values (nested groups);
  - whatever you map in `attributes` (email, names, phone).

### Group naming convention

Every Liquio environment is configured with its own groups, so the same person can be given access to several environments independently. A convention that works well:

| Group | Purpose |
|---|---|
| `LIQUIO-<ENV>-USERS` | Access to the environment (`accessGroups`) |
| `LIQUIO-<ENV>-ADMINS` | Mapped to the admin unit (`admin.adminUnitId` in task) |
| `LIQUIO-<ENV>-UNIT-<name>` | Members of a unit |
| `LIQUIO-<ENV>-UNIT-<name>-HEADS` | Heads of a unit |

Removing someone from `LIQUIO-PROD-USERS` revokes access to that environment only. Disabling the account revokes every environment.

## Configuration

Everything lives under `auth_providers.ldap` in the id-api config (in the helm chart: `config.id.config.production.auth_providers.ldap`):

```json
"ldap": {
  "isEnabled": true,
  "display": { "title": "Corporate account" },
  "connection": {
    "url": "ldaps://dc.domain.loc:636",
    "startTLS": false,
    "tlsOptions": { "ca": "/run/secrets/ldap-ca.pem", "rejectUnauthorized": true },
    "bindDN": "svc-liquio@domain.loc",
    "bindPassword": "***",
    "timeout": 5000,
    "connectTimeout": 5000
  },
  "baseDN": "dc=domain,dc=loc",
  "userSearchBase": "ou=Staff,dc=domain,dc=loc",
  "userFilter": "(&(objectClass=user)(|(sAMAccountName={{username}})(userPrincipalName={{username}})))",
  "idAttribute": "objectGUID",
  "nestedGroups": true,
  "attributes": { "email": "mail", "first_name": "givenName", "last_name": "sn", "middle_name": "middleName", "phone": "telephoneNumber" },
  "linkByEmail": false,
  "accessGroups": ["CN=LIQUIO-PROD-USERS,OU=Groups,DC=domain,DC=loc"],
  "sync": { "isEnabled": true, "intervalMinutes": 15 }
}
```

| Key | Required | Default | Meaning |
|---|---|---|---|
| `isEnabled` | yes | `false` | Turns the provider, its routes and the login button on. |
| `display.title` / `icon` / `description` | no | "Sign in with directory account" | Login button text, icon and tooltip. |
| `connection.url` | yes | — | `ldap://` or `ldaps://` only. |
| `connection.startTLS` | no | `false` | Upgrade an `ldap://` connection with StartTLS. Ignored for `ldaps://`. |
| `connection.tlsOptions.ca` | no | system CAs | PEM text or a path to a PEM file. |
| `connection.tlsOptions.rejectUnauthorized` | no | `true` | Keep `true` outside of tests. |
| `connection.bindDN`, `bindPassword` | yes | — | Service account. Startup fails without them, so the service never binds anonymously. |
| `connection.timeout`, `connectTimeout` | no | ldapts defaults | Milliseconds. |
| `baseDN` | yes | — | Search base for groups, and for users if `userSearchBase` isn't set. |
| `userSearchBase` | no | `baseDN` | Where users are searched. |
| `userFilter` | no | `sAMAccountName` or `userPrincipalName` | Search filter. `{{username}}` is replaced with the escaped login. |
| `idAttribute` | no | `objectGUID` | Stable unique user id. Binary values are stored hex-encoded. |
| `nestedGroups` | no | `false` | `true`: AD nested membership (`LDAP_MATCHING_RULE_IN_CHAIN`). `false`: the user's `memberOf` as-is. |
| `attributes` | no | none | Directory attribute → Liquio user field. Without `email` users are created without an email. Protected fields (`role`, `ipn`, `isActive`, …) can't be mapped. |
| `linkByEmail` | no | `false` | On first login, link to an existing Liquio user with the same email. **This turns that user into an LDAP user** (ipn and identification type are replaced), so keep it off unless that's intended. |
| `accessGroups` | yes | — | Group DNs. The user must be in at least one to sign in. DNs are compared case-insensitively. |
| `sync.isEnabled` | no | `false` | Background re-check and the refresh-token check. |
| `sync.intervalMinutes` | no | `15` | Must be greater than 0. |

Startup fails with `Invalid LDAP provider config: …` if a required key is missing or invalid.

### Secrets

Don't keep `bindPassword`, or an inline PEM CA, in values or configmaps. id-api merges every JSON file from `SECRET_PATH` over its config, so put them into the id secret's `config.json` under `production.auth_providers.ldap.connection`. The [helm chart README](../../../helm-chart/README.md#ldap--active-directory-login) has a patch command.

### Identification types

LDAP users have identification type `ldap`. If `allowIdentificationTypes` is set, add `ldap` to it, otherwise LDAP users are rejected after login.

## Sign-in

`POST /authorise/ldap` with `{ "username": "...", "password": "..." }`. The login page shows a username/password form for the provider. Password change and reset are not offered: the directory owns passwords.

1. The user is looked up with `userFilter` under `userSearchBase`, and the password is checked with a bind as that user. Empty passwords are rejected before contacting the directory.
2. Disabled, locked and expired accounts are rejected.
3. The user's groups are resolved and checked against `accessGroups`.
4. The Liquio user is created or updated:
   - mapped attributes are written;
   - `ipn` is set to `#` + sha256 of the directory id;
   - onboarding is skipped;
   - the identification type is `ldap`.
5. The user's groups are stored with the `ldap` user service record (`groups`, `accessGroups`, `syncedAt`).

Responses: every rejection returns the same `401 Invalid login or password.`, and the real reason is only logged (`user-auth-by-ldap|…`). Too many attempts return `429`, using the same limits as local login (`passwordManager.maxAttempts` / `maxAttemptDelay`). A directory that can't be reached returns `503`.

## Unit mapping

Units are mapped to groups in task, in the unit's `data`:

```json
"data": {
  "ldap": {
    "memberGroups": ["CN=LIQUIO-PROD-UNIT-X,OU=Groups,DC=domain,DC=loc"],
    "headGroups": ["CN=LIQUIO-PROD-UNIT-X-HEADS,OU=Groups,DC=domain,DC=loc"]
  }
}
```

admin-front has no editor for these lists yet. Set them through admin-api's unit update, which stores `data` as given. admin-front keeps `data` untouched when a unit is saved.

Rules:

- **A unit with `memberGroups` or `headGroups` is LDAP-managed.** Its members (or heads) come entirely from the directory. People added by hand are removed when they aren't in a mapped group.
- Units without these lists are never touched.
- Users are added and removed at login, and when id-api reports changed groups (see below). Changes are recorded in access history (`initUserName: ldap-sync`).
- Additions are mirrored to `basedOn` units, unless those are LDAP-managed themselves. **Removals never touch base units**, because access there may come from somewhere else, so remove those by hand if needed.
- **Groups deleted in the directory:** before removing anyone, task asks id-api whether the unit's configured groups still exist. If one doesn't, nobody is removed from that unit, and `ldap-unit-sync|group-not-found` is logged on every check until the unit config is fixed. Remove deleted groups from unit configs.
- Admin access is membership in the `admin.adminUnitId` unit, so map the admins group there. `access.allowableUnits` keeps working on the same membership.

## Revocation and background sync

With `sync.isEnabled`, every id-api replica schedules a job every `sync.intervalMinutes`. A Redis lock makes sure only one of them runs at a time. Without Redis the job doesn't run (`ldap-sync|disabled`).

For every LDAP user:

- **Deleted, disabled or in no access group:** access is revoked. Access and refresh tokens, sessions and task's cached user info are deleted, and the stored groups are cleared (`ldap-sync|access-revoked`). The user record and `isActive` are not touched: adding the user back to the group lets them sign in again straight away.
- **Groups changed:** the stored groups and `syncedAt` are updated, and task's cached user info is cleared. task then re-syncs units on the user's next request (`ldap-sync|groups-changed`).
- **Nothing changed:** nothing is written.

The same check runs when a refresh token is used. A user who lost access can't refresh, and their tokens are revoked.

An immediate check of one user: `POST /user/ldap/sync/:userId` (Basic auth). It returns `{ userId, status, reason? }`.

Worst-case delay until a removed user is cut off: `intervalMinutes`, or the next token refresh if that comes first.

### Failure behaviour

- A connection failure aborts the run without changing anyone, so a directory outage never logs users out. Five errors in a row also abort it.
- During a refresh, an unreachable directory lets the refresh through and logs a warning.
- **A wrong but valid `userSearchBase`, `idAttribute` or `userFilter` makes every lookup succeed with "not found", so every LDAP user is revoked on the next run.** Test config changes against a staging environment, or with sync disabled, first.
- A user who is revoked keeps their unit membership in task until they sign in again, but they can't use it.

## Deployment notes

- id-api and task must run the same version. Both hash task's session cache keys the same way (`token.<sha256(accessToken)>`), and revocation relies on that.
- The service endpoint `POST /ldap/groups/exists` (Basic auth) is called by task for the deleted-groups check.
- Useful log keys: `ldap-strategy`, `user-auth-by-ldap|*`, `ldap-sync|*`, `ldap-unit-sync|*`, `ldap-connect-*`.
