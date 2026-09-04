
## Purpose

I am restructuring the application so that the frontend is treated as an
**untrusted presentation client** and all authoritative business logic,
security decisions, calculations, validation, authorization, and
sensitive processing are enforced on the server/database side.

Implement the following as a production-grade system. Do not move
authoritative logic back into the frontend for convenience. The frontend
may collect input, display state, and provide user interaction, but it
must never be the source of truth for security or business-critical
decisions.

------------------------------------------------------------------------

# 1. Core Security Architecture

## 1.1 Treat the frontend as untrusted

Implement the system under these rules:

-   Never trust values supplied by the browser.
-   Never trust a client-supplied role.
-   Never trust a client-supplied tenant/business ID.
-   Never trust a client-supplied branch ID.
-   Never trust client-side calculations for authoritative values.
-   Never trust client-side permission checks.
-   Never trust hidden UI controls as security controls.
-   Never place secrets, service-role credentials, private keys,
    privileged configuration, or sensitive business rules in frontend
    code.
-   Assume a user can inspect, modify, replay, or fabricate every
    request sent by the frontend.
-   Every security-sensitive request must be independently validated
    server-side.

The frontend should effectively behave as a thin client.

## 1.2 Server-side authority

Move or keep the following on the server/database:

-   Authentication verification.
-   Authorization.
-   Role verification.
-   Tenant isolation.
-   Branch isolation.
-   Business-rule validation.
-   Financial calculations.
-   Inventory calculations.
-   Transaction processing.
-   Privileged administrative actions.
-   Notification targeting.
-   Broadcast authorization.
-   Maintenance-mode enforcement.
-   Audit logging.
-   Rate limiting.
-   Sensitive configuration.
-   Security event detection.

The server must recalculate authoritative values rather than accepting
calculated values from the browser.

------------------------------------------------------------------------

# 2. Authentication

Use the authentication provider as the identity authority.

For every authenticated request:

1.  Verify the authentication token/session server-side.
2.  Resolve the authenticated user's immutable identity.
3.  Retrieve the user's authoritative role from a trusted server-side
    source.
4.  Resolve the user's authorized business/tenant.
5.  Resolve the user's authorized branch where applicable.
6.  Enforce permissions for the requested operation.
7.  Only then execute the operation.

Do not authorize a request merely because the frontend says the current
user is an administrator.

------------------------------------------------------------------------

# 3. Three User Classes

The application currently has three major classes of users:

1.  **Business Owner**
2.  **Branch User**
3.  **System Administrator**

Implement explicit authorization boundaries between these classes.

## 3.1 Business Owner

Business owners may access only data belonging to their own
business/tenant and only the functionality granted to their role.

They must not:

-   Access another business.
-   Access another tenant's records.
-   Modify system-level configuration.
-   Grant themselves system-admin privileges.
-   Modify system-wide security settings.
-   Access other businesses' audit data.
-   Send system-wide administrative broadcasts unless explicitly
    authorized.

## 3.2 Branch User

Branch users must be restricted to:

-   Their authorized business/tenant.
-   Their authorized branch or branches.
-   The records permitted by their role.

Do not rely on a branch ID received from the browser.

Resolve the branch authorization server-side.

A request such as:

``` text
GET /branch-data?branch_id=another_branch
```

must not become authorized simply because the request contains a valid
branch ID.

The server must determine whether the authenticated user is actually
authorized for that branch.

## 3.3 System Administrator

The system administrator has elevated privileges and therefore requires
the strongest security controls.

System-admin privileges must never be granted based solely on:

-   Frontend state.
-   A hidden frontend variable.
-   A hard-coded password in JavaScript.
-   A hard-coded secret keyword in JavaScript.
-   A client-side role flag.
-   An email string embedded in the application bundle.

Use server-side authorization as the final authority.

------------------------------------------------------------------------

# 4. System Administrator Authentication & Authorization

Implement multiple independent security layers.

## Required layers

### Layer 1 --- Strong authentication

Require normal authenticated identity through the authentication
provider.

### Layer 2 --- Server-side system-admin authorization

After authentication, verify that the authenticated identity has the
system-admin role using a trusted server-side mechanism.

Prefer an immutable user identifier/UUID or authoritative role record
over relying on an email address as the primary authorization key.

### Layer 3 --- Multi-factor authentication

Require MFA for system administrators.

Prefer an authenticator-based MFA mechanism or another strong
phishing-resistant method where supported.

Do not treat a secret keyword as a substitute for MFA.

### Layer 4 --- Privileged-action verification

For especially sensitive actions, require step-up authentication or
reauthentication.

Examples:

-   Changing administrator roles.
-   Deleting major datasets.
-   Exporting sensitive information.
-   Changing security configuration.
-   Disabling security controls.
-   Changing tenant configuration globally.
-   Changing system-admin accounts.
-   Modifying authentication/security settings.

### Layer 5 --- Audit event

Record every privileged action.

At minimum capture:

-   Event ID.
-   Timestamp.
-   Authenticated user ID.
-   Role.
-   Action.
-   Target resource.
-   Target resource ID where applicable.
-   Tenant/business context where applicable.
-   Branch context where applicable.
-   Result: success/failure.
-   Failure reason where appropriate.
-   Request/correlation ID.
-   Source IP where legally and operationally appropriate.
-   User-agent/device metadata where appropriate.
-   Before/after values for configuration changes where appropriate.

Never log passwords, authentication tokens, API secrets, MFA secrets, or
other credentials.

------------------------------------------------------------------------

# 5. Secret Management

Audit the entire frontend repository and deployed frontend bundle.

Remove:

-   Service-role keys.
-   Private API keys.
-   Database credentials.
-   Admin passwords.
-   Admin secret keywords.
-   Encryption keys.
-   Internal signing secrets.
-   Third-party private credentials.
-   Sensitive environment variables.

A secret is not protected merely because it is stored in:

-   `.env` files included in a frontend build.
-   JavaScript variables.
-   Minified JavaScript.
-   Obfuscated code.
-   Base64.
-   Hidden HTML.
-   Local storage.
-   Session storage.

Anything shipped to the browser should be assumed publicly readable.

Use server-side environment variables or a secure secret-management
system for privileged credentials.

Rotate any secret that may previously have been exposed.

------------------------------------------------------------------------

# 6. Input Validation

Implement server-side validation for every external input.

Validate:

-   Required fields.
-   Data types.
-   String lengths.
-   Numeric ranges.
-   Decimal precision.
-   Enumerated values.
-   Date formats.
-   Date ranges.
-   IDs/UUID formats.
-   Pagination parameters.
-   Sort parameters.
-   Filter parameters.
-   File types and file sizes.
-   Uploaded content where applicable.
-   Nested objects.
-   Arrays and array lengths.
-   Business-specific constraints.

Reject malformed input rather than attempting to silently repair
security-sensitive input.

Use allowlists wherever possible.

Never trust client-side validation as the final validation layer.

------------------------------------------------------------------------

# 7. Rate Limiting

Implement server-side rate limiting.

Protect at minimum:

-   Login attempts.
-   Password reset requests.
-   MFA verification attempts.
-   Admin authentication.
-   Admin privileged actions.
-   Chatbot requests.
-   Notification/broadcast creation.
-   File uploads.
-   Expensive database operations.
-   Public API endpoints.
-   Search endpoints where abuse could create high load.
-   Repeated failed authorization attempts.

Use appropriate limits per endpoint rather than one universal limit.

Consider multiple dimensions where appropriate:

-   User ID.
-   IP address.
-   Session.
-   Tenant.
-   Endpoint.
-   Device/session fingerprint where appropriate.

Return a controlled rate-limit response when the threshold is exceeded.

Do not expose internal rate-limit implementation details.

------------------------------------------------------------------------

# 8. Abuse Detection

Create security events for suspicious behavior.

Detect patterns such as:

-   Repeated failed logins.
-   Repeated failed MFA attempts.
-   Rapid privilege failures.
-   Attempts to access unauthorized tenants.
-   Attempts to access unauthorized branches.
-   Large bursts of requests.
-   Repeated administrative failures.
-   Unusual bulk exports.
-   Unusual changes to permissions.
-   Repeated invalid API payloads.
-   Repeated attempts to access nonexistent resources.
-   Sudden high-volume chatbot requests.
-   Abnormal notification/broadcast activity.

Create an administrative security dashboard for these events.

------------------------------------------------------------------------

# 9. Tenant & Branch Isolation

Tenant isolation is a hard security boundary.

For every tenant-owned table:

-   Associate records with the authoritative tenant/business ID.
-   Enforce access server-side.
-   Enforce database-level policies where supported.
-   Never trust tenant IDs supplied by the client.
-   Never derive authorization from frontend routing alone.
-   Never allow a user to switch tenant context by modifying a request
    parameter.

For branch-owned records:

-   Verify both tenant authorization and branch authorization.
-   Ensure a branch user cannot access another branch even if both
    branches belong to the same business.

Test these boundaries explicitly with negative authorization tests.

------------------------------------------------------------------------

# 10. Database Security

Use database-level security as an additional defense layer.

Where applicable:

-   Enable Row Level Security.
-   Create restrictive policies.
-   Use server-side functions for privileged operations.
-   Restrict direct access to sensitive tables.
-   Separate public/client-readable data from authoritative data.
-   Prevent users from directly modifying authoritative transaction
    records.
-   Use database constraints for invariants.
-   Use transactions for multi-step state changes.
-   Prevent race conditions for financial/inventory operations.

The application server and database must agree on authorization; neither
layer should assume the other will always catch an error.

------------------------------------------------------------------------

# 11. Transaction Integrity

For authoritative operations:

-   Use database transactions.
-   Validate state before mutation.
-   Recalculate authoritative values server-side.
-   Prevent duplicate processing.
-   Use idempotency keys for operations that may be retried.
-   Lock or otherwise protect records where concurrent writes could
    create inconsistent state.
-   Record immutable transaction/audit history where required.

Never let the browser dictate the final balance, stock quantity,
commission, total, or other authoritative result.

------------------------------------------------------------------------

# 12. Session Security

Implement:

-   Secure session handling.
-   Appropriate session expiration.
-   Refresh-token protection.
-   Logout/revocation mechanisms.
-   Reauthentication for highly sensitive actions.
-   Session invalidation after critical security changes where
    appropriate.
-   Protection against token leakage.
-   HTTPS everywhere in production.
-   Secure cookie attributes where cookies are used.
-   Appropriate SameSite policy.
-   CSRF protection where cookie-based authentication is used.

Do not store sensitive long-lived credentials in insecure browser
storage.

------------------------------------------------------------------------

# 13. System Administrative Audit Logging

Create a dedicated audit log for privileged actions.

Log at least:

-   Authentication events.
-   Failed authentication events.
-   MFA events.
-   Role changes.
-   Permission changes.
-   Tenant changes.
-   Branch configuration changes.
-   System configuration changes.
-   Maintenance-mode changes.
-   Broadcast creation/editing/deletion.
-   Notification changes.
-   Popup changes.
-   Banner changes.
-   Data exports.
-   Sensitive record access where appropriate.
-   Deletions.
-   Recovery/restoration actions.
-   Security configuration changes.

Audit records should be append-oriented and protected from ordinary
administrators.

A user should not be able to erase the evidence of their own privileged
action.

------------------------------------------------------------------------

# 14. Audit Log UI

Create a system-admin audit interface.

Provide:

-   Search.
-   Filtering.
-   Date range.
-   Administrator filter.
-   Action filter.
-   Resource type.
-   Tenant/business filter.
-   Branch filter.
-   Success/failure filter.
-   Event severity.
-   Correlation/request ID.
-   Detail view.
-   Before/after comparison where appropriate.
-   Export capability restricted to authorized administrators.

Do not expose sensitive credentials or secrets in the audit interface.

------------------------------------------------------------------------

# 15. Monitoring & Alerts

Create centralized monitoring for:

-   Authentication failures.
-   Authorization failures.
-   Tenant-isolation violations.
-   Rate-limit violations.
-   Admin security events.
-   Server errors.
-   Database errors.
-   API latency.
-   Unusual request volume.
-   Queue failures.
-   Notification failures.
-   Broadcast failures.
-   Chatbot failures.
-   External service failures.

Create alerts for high-severity events.

The goal is not merely to store logs; the system should make important
anomalies visible to administrators.

------------------------------------------------------------------------

# 16. Admin Security Dashboard

Create a dedicated security/operations dashboard containing:

-   Active administrators.
-   Recent admin logins.
-   Failed admin login attempts.
-   Recent privileged actions.
-   Suspicious activity.
-   Rate-limit events.
-   Unauthorized access attempts.
-   Security alerts.
-   Active sessions where appropriate.
-   System health.
-   API errors.
-   Notification delivery health.
-   Broadcast status.
-   Maintenance status.

Use severity levels such as:

-   Informational.
-   Warning.
-   High.
-   Critical.

------------------------------------------------------------------------

# 17. Centralized User Communication System

Create a centralized communication/engagement management module.

The system should allow the system administrator to communicate with
users without modifying application code.

Support:

1.  In-app notifications.
2.  Real-time toast messages.
3.  Announcement banners.
4.  Promotional/information pop-ups.
5.  Scheduled broadcasts.
6.  Targeted broadcasts.
7.  Maintenance announcements.
8.  System alerts.
9.  Optional push notifications where supported.

------------------------------------------------------------------------

# 18. Notification Management

Create an admin notification manager.

Allow administrators to:

-   Create notifications.
-   Edit notifications before publication.
-   Schedule notifications.
-   Publish immediately.
-   Cancel scheduled notifications.
-   Expire notifications.
-   Target specific users.
-   Target a business/tenant.
-   Target branches.
-   Target user roles.
-   Target groups/segments.
-   Mark notifications as system-critical where appropriate.

Store:

-   Notification ID.
-   Title.
-   Body.
-   Type.
-   Priority.
-   Targeting rules.
-   Created by.
-   Created timestamp.
-   Scheduled timestamp.
-   Published timestamp.
-   Expiration timestamp.
-   Status.
-   Delivery statistics.

------------------------------------------------------------------------

# 19. Notification Types

Implement clear notification categories.

Examples:

-   System.
-   Security.
-   Maintenance.
-   Transaction.
-   Account.
-   Announcement.
-   Promotion.
-   Reminder.
-   Administrative.

Allow the UI to visually distinguish them without making the frontend
responsible for determining whether the user is actually authorized to
receive them.

------------------------------------------------------------------------

# 20. Read Receipts & Delivery Tracking

Track notification lifecycle where appropriate.

Use states such as:

-   Created.
-   Scheduled.
-   Queued.
-   Sent.
-   Delivered.
-   Seen.
-   Dismissed.
-   Expired.
-   Failed.

Do not assume that "sent" means "seen."

Provide aggregate analytics to administrators.

------------------------------------------------------------------------

# 21. User Notification Preferences

Implement notification preferences for non-critical communications.

Allow users to control categories such as:

-   Promotional messages.
-   General announcements.
-   Optional reminders.
-   Marketing communications.

Do not allow users to disable mandatory security or
legally/operationally required system notices.

Clearly distinguish:

-   Mandatory system notifications.
-   Optional notifications.

------------------------------------------------------------------------

# 22. Real-Time Toast Broadcasts

Implement an admin-controlled real-time toast system.

Allow the administrator to:

-   Compose a short message.
-   Select severity/type.
-   Select target audience.
-   Publish immediately.
-   Set duration.
-   Set expiration.
-   Cancel an active broadcast.

The server must authorize the broadcast and determine the recipients.

Do not let the client decide whether a user belongs to the target
audience.

------------------------------------------------------------------------

# 23. Announcement Banners

Create an admin banner manager.

Support:

-   Draft.
-   Preview.
-   Schedule.
-   Publish.
-   Pause.
-   Expire.
-   Archive.

Allow targeting by:

-   All users.
-   Business.
-   Branch.
-   Role.
-   User segment.

Store display rules server-side.

Examples:

-   Start date/time.
-   End date/time.
-   Audience.
-   Priority.
-   Dismissible/non-dismissible.
-   Frequency.
-   Maximum impressions if required.

------------------------------------------------------------------------

# 24. Pop-Up Management

Create an administrator-controlled popup system.

Support:

-   Title.
-   Message.
-   Optional action button.
-   Action destination.
-   Audience targeting.
-   Schedule.
-   Expiration.
-   Frequency.
-   Priority.
-   Dismissal.
-   Impression tracking.

Prevent abusive popup behavior by enforcing server-side limits and
sensible display frequency.

Do not allow an administrator's malformed content to inject arbitrary
executable code.

Sanitize/escape content appropriately.

Avoid rendering arbitrary HTML unless there is a controlled, sanitized
content system.

------------------------------------------------------------------------

# 25. Broadcast Management

Create a central broadcast composer.

The administrator should be able to choose:

-   Message type.
-   Audience.
-   Priority.
-   Immediate or scheduled delivery.
-   Expiration.
-   Delivery channels.
-   Optional action.
-   Preview.
-   Confirmation before publication.

Before sending a high-impact broadcast, show:

-   Audience count.
-   Audience definition.
-   Message preview.
-   Schedule.
-   Expiration.
-   Delivery method.

Require explicit confirmation for large-scale broadcasts.

------------------------------------------------------------------------

# 26. Broadcast Targeting

Targeting must be performed server-side.

Support filters such as:

-   All users.
-   Specific business.
-   Specific branch.
-   Business owners.
-   Branch users.
-   Active users.
-   Inactive users.
-   Selected users.
-   User groups.
-   Other application-defined segments.

Do not accept a browser-supplied recipient list as authoritative without
revalidating every recipient against current authorization and targeting
rules.

------------------------------------------------------------------------

# 27. Broadcast Safety Controls

For high-volume communications:

-   Show estimated recipient count.
-   Require confirmation.
-   Prevent accidental duplicate broadcasts.
-   Support cancellation of scheduled messages.
-   Record the administrator who created the broadcast.
-   Record who approved it where an approval workflow exists.
-   Maintain an immutable history.
-   Rate-limit broadcast creation.
-   Prevent unauthorized system-wide broadcasts.
-   Add optional two-person approval for critical communications.

------------------------------------------------------------------------

# 28. Scheduled Communications

Implement server-side scheduling.

A scheduled message must not depend on the user's browser remaining
open.

The server/worker should:

1.  Detect scheduled items.
2.  Validate that the item is still active.
3.  Recalculate the target audience if targeting is dynamic.
4.  Confirm the sender remains authorized.
5.  Publish/queue the communication.
6.  Record delivery status.
7.  Handle retries safely.
8.  Prevent duplicate delivery.

------------------------------------------------------------------------

# 29. Communication Analytics

Create analytics for administrator-managed communications.

Track:

-   Total targeted users.
-   Sent count.
-   Delivered count.
-   Seen count.
-   Dismissed count.
-   Failed count.
-   Click/action count where applicable.
-   Delivery percentage.
-   Engagement percentage.
-   Time of publication.
-   Audience breakdown.

Do not expose individual-level data to administrators who do not need
it.

Apply least privilege to analytics access.

------------------------------------------------------------------------

# 30. Maintenance Mode Integration

Integrate communication management with maintenance mode.

When maintenance mode is enabled:

-   Regular users receive the configured maintenance experience.
-   System administrators retain the documented bypass only if
    explicitly authorized.
-   The bypass must be enforced server-side.
-   Maintenance configuration must be audited.
-   Maintenance start/end times must be logged.
-   Users should receive a clear maintenance message.
-   Optional advance announcements should be supported.
-   Emergency maintenance should support immediate publication.

Do not rely solely on hiding application pages in the frontend.

------------------------------------------------------------------------

# 31. Admin Confirmation & Dangerous Actions

Require explicit confirmation for destructive or high-impact actions.

Examples:

-   Delete records.
-   Disable accounts.
-   Change administrator roles.
-   Change tenant ownership.
-   Publish system-wide broadcasts.
-   Enable maintenance mode.
-   Disable security controls.
-   Export sensitive datasets.

For particularly sensitive operations, require reauthentication/MFA.

Use clear confirmation dialogs that identify the exact action and
target.

Avoid vague confirmation buttons such as "Continue" when the action is
destructive.

------------------------------------------------------------------------

# 32. Least Privilege

Review every system-admin capability.

Do not give every administrator unrestricted access simply because they
are administrators.

Create granular permissions where appropriate:

-   View users.
-   Manage users.
-   View tenants.
-   Manage tenants.
-   Manage branches.
-   Manage communications.
-   Manage maintenance.
-   View audit logs.
-   Export data.
-   Manage security.
-   Manage system configuration.

Separate high-risk permissions from ordinary administrative permissions.

------------------------------------------------------------------------

# 33. Admin Account Protection

Protect system-admin accounts with:

-   MFA.
-   Strong authentication.
-   Reauthentication for critical actions.
-   Session monitoring.
-   Login alerts.
-   Failed-login alerts.
-   Audit logging.
-   Account lockout/rate limiting where appropriate.
-   Recovery procedures.
-   Emergency account-revocation procedures.

Avoid shared administrator accounts.

Each administrator should have an individually identifiable account so
actions can be attributed correctly.

------------------------------------------------------------------------

# 34. API Security

For every protected endpoint:

1.  Authenticate.
2.  Authorize.
3.  Validate input.
4.  Validate tenant context.
5.  Validate branch context.
6.  Validate resource ownership.
7.  Execute the operation.
8.  Log security-relevant actions.
9.  Return only the minimum necessary response.

Do not create endpoints that rely on the frontend to enforce
authorization.

Avoid exposing internal database structure unnecessarily through API
responses.

------------------------------------------------------------------------

# 35. Error Handling

Never return sensitive internal errors to users.

Do not expose:

-   Stack traces.
-   SQL statements.
-   Internal filesystem paths.
-   Secret values.
-   Authentication internals.
-   Database credentials.
-   Internal service topology.

Return safe user-facing errors while logging the detailed technical
error server-side.

Use correlation/request IDs so support staff can locate the
corresponding server-side event.

------------------------------------------------------------------------

# 36. Chatbot Security

The chatbot must remain server-authoritative.

The frontend should send the user's message and required session/context
information.

The server should:

1.  Authenticate the user.
2.  Resolve their role.
3.  Resolve tenant/branch context.
4.  Validate the message.
5.  Apply server-side chatbot instructions/policies.
6.  Determine what data the user is authorized to access.
7.  Retrieve authorized data.
8.  Perform processing server-side.
9.  Generate the response.
10. Return only the authorized response.

Never allow the browser to modify the authoritative system prompt,
privileged instructions, tool permissions, tenant scope, or
authorization context.

Do not treat hidden frontend prompts as secrets.

------------------------------------------------------------------------

# 37. Chatbot Input Controls

Implement:

-   Message length limits.
-   Request rate limits.
-   Abuse detection.
-   Authentication checks.
-   Tenant authorization.
-   Tool authorization.
-   Data-access authorization.
-   Cost controls where applicable.
-   Request timeouts.
-   Error handling.
-   Conversation/session limits where necessary.

The chatbot must not be able to bypass normal application authorization
simply because it is an AI interface.

------------------------------------------------------------------------

# 38. AI Tool Access

If the chatbot can call backend tools/functions:

-   Give each tool an explicit permission boundary.
-   Validate all tool parameters server-side.
-   Recheck authorization inside the tool.
-   Never rely on the model to decide whether a user is allowed to
    perform an operation.
-   Keep sensitive tools inaccessible unless explicitly authorized.
-   Log sensitive tool invocations.
-   Apply rate limits.
-   Apply transaction controls.
-   Return only the minimum required data.

The AI is not the security boundary. The server is the security
boundary.

------------------------------------------------------------------------

# 39. Content Security for Admin Communications

Any administrator-created content displayed to users must be treated as
untrusted content.

Protect against:

-   Cross-site scripting.
-   Script injection.
-   HTML injection.
-   Malicious URLs.
-   Unsafe redirects.

Prefer plain text or a tightly controlled formatting system.

If HTML/Markdown is supported:

-   Sanitize it server-side.
-   Sanitize again at the rendering boundary where appropriate.
-   Strip scripts and dangerous attributes.
-   Restrict links to approved protocols.
-   Consider an allowlist of supported tags.

------------------------------------------------------------------------

# 40. Data Export Security

For administrative exports:

-   Require explicit permission.
-   Require reauthentication for sensitive exports where appropriate.
-   Record who exported the data.
-   Record what data was exported.
-   Record the target scope.
-   Record timestamp.
-   Rate-limit exports.
-   Apply tenant/role restrictions.
-   Avoid exposing data beyond the administrator's authorization.

For large exports, use controlled server-side jobs rather than
browser-side bulk extraction.

------------------------------------------------------------------------

# 41. Backup & Recovery

Implement and regularly test:

-   Automated backups.
-   Backup retention.
-   Point-in-time recovery where supported.
-   Recovery procedures.
-   Disaster recovery documentation.
-   Restoration tests.
-   Auditability of restoration actions.

A backup is not considered reliable until restoration has been tested.

------------------------------------------------------------------------

# 42. Security Testing

Create automated tests for:

### Authentication

-   Unauthenticated request is rejected.
-   Expired session is rejected.
-   Invalid token is rejected.

### Authorization

-   Business owner cannot access another business.
-   Branch user cannot access another branch.
-   Normal user cannot execute admin actions.
-   Admin-only endpoints reject ordinary users.

### Tenant isolation

-   User cannot change tenant ID to access another tenant.
-   User cannot modify another tenant's records.
-   User cannot infer authorization from resource IDs.

### Admin security

-   Non-admin cannot access admin endpoints.
-   Admin privileges are not granted by frontend state.
-   Sensitive operations require appropriate step-up verification.

### Rate limiting

-   Excessive requests are blocked.
-   Failed authentication attempts are throttled.
-   Broadcast/chatbot abuse is controlled.

### Communications

-   Unauthorized user cannot create broadcasts.
-   Unauthorized user cannot change targeting.
-   Scheduled messages execute server-side.
-   Expired messages are not delivered.

### Database

-   RLS/policies reject unauthorized access.
-   Constraints prevent invalid state.
-   Concurrent transactions remain consistent.

------------------------------------------------------------------------

# 43. Security Headers & Browser Protections

Where applicable, configure:

-   Content Security Policy.
-   Strict-Transport-Security.
-   X-Content-Type-Options.
-   Referrer-Policy.
-   Frame/embedding protection.
-   Secure cookie settings.
-   Appropriate CORS policy.

Do not use permissive CORS configurations unnecessarily.

Never use wildcard origins for privileged APIs unless there is a
documented and justified reason.

------------------------------------------------------------------------

# 44. Dependency & Infrastructure Security

Maintain:

-   Updated dependencies.
-   Dependency vulnerability scanning.
-   Secure deployment credentials.
-   Separate development/staging/production environments.
-   Production secret isolation.
-   Restricted database credentials.
-   Restricted server access.
-   Deployment audit logs.
-   Environment-specific configuration.

Do not allow development credentials to access production systems
unnecessarily.

------------------------------------------------------------------------

# 45. Security Operations Workflow

When a serious security event occurs:

1.  Detect.
2.  Log.
3.  Alert.
4.  Identify affected account/resource.
5.  Contain the issue.
6.  Revoke compromised sessions/credentials if necessary.
7.  Preserve relevant logs.
8.  Investigate.
9.  Correct the vulnerability.
10. Rotate affected secrets.
11. Restore normal service.
12. Document the incident.
13. Add a regression test so the same issue is less likely to recur.

------------------------------------------------------------------------

# 46. Admin Communication Center UI

Create a dedicated section in the system administration interface:

**Administration → Communications**

Include:

-   Dashboard.
-   Notifications.
-   Toast broadcasts.
-   Banners.
-   Pop-ups.
-   Scheduled messages.
-   Broadcast composer.
-   Audience management.
-   Delivery analytics.
-   Message history.
-   Templates.
-   User preferences overview.

Keep all communication management operations protected by granular
permissions.

------------------------------------------------------------------------

# 47. Recommended Communication Data Model

Create appropriate server-side entities for concepts such as:

-   `notifications`
-   `notification_recipients`
-   `notification_events`
-   `banners`
-   `popups`
-   `broadcasts`
-   `broadcast_targets`
-   `broadcast_events`
-   `communication_templates`
-   `notification_preferences`

Adapt names to the existing schema instead of blindly creating
duplicates.

Use foreign keys, indexes, timestamps, status fields, and audit
metadata.

------------------------------------------------------------------------

# 48. Idempotency & Duplicate Prevention

For operations that can be retried:

-   Generate/use an idempotency key.
-   Store the processing result.
-   Reject duplicate processing.
-   Make background jobs retry-safe.
-   Make notification delivery retry-safe.
-   Make broadcast publication retry-safe.
-   Make financial operations transaction-safe.

Never assume a request is executed exactly once.

------------------------------------------------------------------------

# 49. Observability

Every important request should be traceable.

Use:

-   Request IDs.
-   Structured logs.
-   Consistent event names.
-   Severity levels.
-   Server timestamps.
-   User IDs.
-   Tenant IDs where appropriate.
-   Resource IDs where appropriate.

Do not place secrets or sensitive personal data unnecessarily into logs.

------------------------------------------------------------------------

# 50. Final Implementation Standard

Before considering this work complete, verify all of the following:

-   [ ] Frontend is treated as untrusted.
-   [ ] No privileged secrets are exposed to the client.
-   [ ] All authorization decisions are server-side.
-   [ ] Business-owner isolation is enforced.
-   [ ] Branch isolation is enforced.
-   [ ] System-admin authorization is server-side.
-   [ ] MFA is enabled for system administrators.
-   [ ] Sensitive admin actions use step-up verification where
    appropriate.
-   [ ] Server-side input validation exists for all protected endpoints.
-   [ ] Rate limiting exists for sensitive endpoints.
-   [ ] Security events are logged.
-   [ ] Admin actions are audited.
-   [ ] Audit logs are protected from unauthorized modification.
-   [ ] Monitoring and alerts are configured.
-   [ ] Notification management is server-authoritative.
-   [ ] Broadcast targeting is server-authoritative.
-   [ ] Banners are manageable without code changes.
-   [ ] Pop-ups are manageable without code changes.
-   [ ] Real-time toasts are manageable without code changes.
-   [ ] Scheduled broadcasts work without the user's browser being open.
-   [ ] Notification preferences exist for optional communications.
-   [ ] Mandatory notifications cannot be disabled improperly.
-   [ ] Delivery/read analytics exist where appropriate.
-   [ ] Maintenance mode is server-enforced.
-   [ ] Destructive admin actions require confirmation.
-   [ ] High-risk operations require stronger verification.
-   [ ] Admin permissions follow least privilege.
-   [ ] Chatbot processing remains server-side.
-   [ ] Chatbot tools independently enforce authorization.
-   [ ] AI instructions are not treated as the security boundary.
-   [ ] Admin-created content is sanitized.
-   [ ] Error responses do not expose internal details.
-   [ ] API CORS/security configuration is restrictive.
-   [ ] Security headers are configured.
-   [ ] Backups are tested.
-   [ ] Dependency security is monitored.
-   [ ] Automated authorization/tenant-isolation tests exist.
-   [ ] Incident-response procedures are documented.

------------------------------------------------------------------------

# 51. Implementation Instruction to the Agent

Do not simply implement the visible UI.

First inspect the existing application architecture, authentication
flow, Supabase schema, RLS policies, server-side functions/API routes,
admin system, existing maintenance system, notification system,
banner/popup system, and chatbot architecture.

Then produce an implementation map identifying:

1.  What already exists.
2.  What is already secure.
3.  What is incomplete.
4.  What must be changed.
5.  What must not be changed because it is already correct.
6.  Which database migrations are required.
7.  Which server-side functions/endpoints are required.
8.  Which frontend components are required.
9.  Which security policies are required.
10. Which automated tests are required.

Do not duplicate existing functionality.

Do not weaken existing tenant isolation.

Do not move business logic back into the frontend.

Do not expose secrets in the client.

Do not implement security controls merely as UI restrictions.

Every privileged operation must have a server-side authorization check.

Every authoritative mutation must be validated and executed server-side.

Every high-impact administrative operation must be auditable.

Every communication-management feature must be server-authoritative.

When implementation is complete, perform a security review against this
document and report:

-   Implemented items.
-   Partially implemented items.
-   Remaining risks.
-   Required migrations.
-   Required environment variables/secrets.
-   Required deployment changes.
-   Required manual verification.
-   Automated test results.
-   Any architectural decisions that differ from this specification and
    why.

The final implementation should be production-oriented, defensive,
auditable, multi-tenant safe, and designed on the assumption that the
frontend can be fully inspected and manipulated by an attacker.
