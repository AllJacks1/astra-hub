# Astra Team Hub --- Phase 6: Deployment, Domain, Pilot Launch, and Handover

## Purpose

Deploy Astra Team Hub to Astra-owned production services, validate the
temporary HTTPS pilot URL, configure `hub.astragroupph.com` safely, and
prepare a controlled 10-person pilot.

**Prerequisite:** Phases 1--5 are complete, critical security tests
pass, and Astra has provided the necessary access to its owned accounts.

## 1. Account ownership and access

Production resources must be created under Astra-owned accounts:

-   GitHub organization/repository.
-   Vercel team/project.
-   Supabase organization/project.
-   Resend account/domain.
-   Google Cloud OAuth project.
-   Domain registrar/DNS provider.

Astra must retain owner/billing access. The developer receives the
minimum required developer/admin access. Use separate individual
accounts; do not share passwords.

Enable MFA for owner and administrator accounts. Store recovery codes
securely with Astra.

## 2. Production environment

Create a production environment separate from development.

Verify:

-   Production Supabase project is correct.
-   Production database migrations have been reviewed.
-   RLS is enabled on all exposed tables.
-   Storage bucket is private.
-   Production Google OAuth credentials are configured.
-   Resend sender domain is verified.
-   VAPID keys are production-specific and protected.
-   All environment variables are entered into Vercel securely.
-   No development credentials or test users are accidentally shipped.
-   Error reporting and logs do not contain secrets or private message
    bodies.

Use a staging/preview environment where feasible. Never run destructive
migrations directly against production without a backup and review.

## 3. Vercel deployment

1.  Connect the Astra-owned GitHub repository to the Astra-owned Vercel
    team.
2.  Configure build settings.
3.  Add environment variables for the correct environment.
4.  Deploy to the temporary Vercel HTTPS URL.
5.  Verify the deployment is healthy.
6.  Test authentication callback and redirect URLs.
7.  Test messaging, attachments, notifications, and RLS against
    production services.
8.  Confirm HTTPS and security headers.
9.  Confirm the app works on mobile devices.

Do not use the developer's personal Vercel project for production.

## 4. OAuth URL configuration

Update Supabase Auth URL configuration:

-   Site URL: temporary production URL initially.
-   Redirect allowlist: exact callback URLs required for local, preview,
    and production environments.
-   Google Cloud authorized redirect URI: the Supabase callback URL
    shown in the Supabase dashboard.
-   App callback route: exact deployed application callback.

When moving to the custom domain, add the custom-domain app URL and
required redirects. Remove temporary/preview URLs from production
allowlists when no longer needed, unless they remain operationally
required.

Do not use wildcard redirects broadly. Restrict redirect destinations to
trusted application URLs.

## 5. Temporary URL pilot verification

Before touching DNS, provide Astra with the temporary HTTPS URL.

Run the acceptance checklist with:

-   One company Google account (`@astragroupph.com`).
-   One invited personal Gmail account.
-   At least one additional user to test group and private conversation
    permissions.
-   An admin account.
-   A guest account.

Verify:

### Authentication

-   Company account can sign in.
-   Invited personal Gmail can sign in.
-   Uninvited Gmail cannot sign in.
-   Invitation email arrives.
-   Invitation expires and cannot be reused.

### Messaging

-   Company and invited Gmail accounts can exchange messages.
-   They can exchange photos.
-   Group DMs work.
-   Channel messages update across devices.
-   Unread indicators update.

### Permissions

-   Users only access assigned private channels.
-   Users only access DMs where they are participants.
-   Guest permissions are restricted.
-   Admin functions are inaccessible to non-admins.
-   Direct URL/ID manipulation does not bypass RLS.
-   Unauthorized users cannot retrieve private attachment URLs.

### Devices

-   Desktop browser works.
-   iPhone PWA installs and opens.
-   Android PWA installs and opens.
-   Push behavior is verified on supported devices.

Record test date, tester, account type (avoid exposing full email
addresses in broadly shared reports), result, evidence, and issue IDs.

## 6. Custom domain availability and DNS

Target hostname:

`hub.astragroupph.com`

Do not claim that the hostname is available until it has been checked.

### Before making changes

1.  Identify Astra's authoritative DNS provider.
2.  Review the existing DNS zone.
3.  Check for an existing `hub` A, AAAA, CNAME, or conflicting record.
4.  Confirm whether the subdomain is used by another service.
5.  Export or record the current DNS zone.
6.  Obtain Astra DNS administrator approval.
7.  Obtain the exact DNS record values from Vercel's domain
    configuration screen.

### DNS safety rules

-   Add only the record(s) required by Vercel.
-   Do not change the root/apex domain unless explicitly required and
    approved.
-   Do not delete or overwrite existing MX records.
-   Do not alter SPF, DKIM, or DMARC records.
-   Do not change existing website A/CNAME records.
-   If a conflicting `hub` record exists, stop and ask the DNS owner
    before changing it.
-   Never guess a Vercel IP address or CNAME target.
-   Verify DNS propagation and Vercel domain validation after the
    approved change.

A subdomain record should normally be independent of the root website
and email records, but existing DNS must be inspected first.

## 7. Production smoke test after domain change

After `hub.astragroupph.com` is configured:

-   HTTPS certificate is valid.
-   Hostname resolves to the intended Vercel project.
-   Login and OAuth callback work.
-   Invitation links use the correct hostname.
-   Push subscriptions work on the custom origin.
-   Service worker registers on the custom origin.
-   Attachments work.
-   Email links use the correct host.
-   Existing Astra website still works.
-   Existing Astra email delivery still works.
-   No redirect loop or mixed-content warning occurs.

Changing origin can affect PWA installation and push subscriptions.
Users may need to reinstall the PWA or re-enable push on the final
domain. Include this in launch communications if applicable.

## 8. Pilot rollout

Do not invite all 10 users at once unless Astra explicitly prefers it.

Suggested controlled rollout:

1.  Admin and developer smoke test.
2.  Two-user test (company + invited personal Gmail).
3.  Three-to-five-user internal test.
4.  Fix critical usability/security issues.
5.  Invite remaining pilot participants.
6.  Collect feedback during the first week.
7.  Review usage, error rates, support requests, and costs.

Prepare a short onboarding guide covering:

-   How to sign in.
-   How to install on iPhone.
-   How to install on Android.
-   How to enable notifications.
-   How to join channels.
-   How to start DMs.
-   How to share photos/files.
-   How to report a problem.

## 9. Backup, recovery, and operational readiness

Before launch:

-   Confirm Supabase backup configuration and retention for the selected
    plan.
-   Document restore procedure and responsible owner.
-   Consider an export/backup of critical configuration and migrations.
-   Keep database migrations in Git.
-   Document how to revoke a user session and suspend an account.
-   Document how to revoke a leaked invitation.
-   Document how to rotate API keys and VAPID credentials.
-   Confirm billing alerts/usage monitoring where available.
-   Establish a support contact and incident escalation path.

Do not claim backups are tested merely because the provider says backups
are enabled. Perform a restore test in a non-production project if the
plan and tools allow it.

## 10. Cost estimate and ongoing ownership

Provide a dated cost estimate based on current provider pricing and the
actual selected plans. The initial planning estimate may use:

  -----------------------------------------------------------------------
  Service                                             Planning assumption
  ------------------------------ ----------------------------------------
  Vercel Pro                                 Approximately USD \$20/month

  Supabase Pro                               Approximately USD \$25/month

  Resend Free                         USD \$0/month within current limits

  Web Push                                  No separate provider fee when
                                                             self-managed

  Domain                                  Existing Astra-owned domain; no
                                      incremental domain purchase assumed
  -----------------------------------------------------------------------

Planning baseline: approximately USD \$45/month before taxes, overages,
add-ons, and any additional services. Re-check current pricing and
billing terms before approval. Supabase compute/storage/bandwidth and
Vercel usage may increase costs. Do not guarantee that this estimate
will remain fixed.

Astra owns and pays for production subscriptions. The developer
maintains application code, deployments, database migrations, security
updates, and technical support under an agreed maintenance arrangement.

## 11. Maintenance agreement

Document:

-   Named technical owner.
-   Named Astra business/admin owner.
-   Support channel.
-   Expected response times (agree these with Astra; do not invent an
    SLA).
-   Backup/recovery responsibilities.
-   Update cadence.
-   Incident handling.
-   Change approval process.
-   Cost/billing owner.
-   Offboarding and access revocation process.

Astra must retain repository, hosting, database, email, OAuth, and
domain ownership throughout.

## 12. Final handover package

Provide:

1.  Production URL.
2.  GitHub repository location.
3.  Architecture overview.
4.  Environment variable names (never secret values).
5.  Database schema/migration documentation.
6.  RLS/security model summary.
7.  Admin guide.
8.  Staff onboarding guide.
9.  PWA installation instructions.
10. Backup and recovery notes.
11. Current cost estimate and plan names.
12. Known limitations/deferred features.
13. Test checklist and results.
14. Maintenance ownership and support process.

## Final pilot sign-off checklist

-   [ ] Astra owns all production accounts.
-   [ ] Astra has owner/admin access.
-   [ ] Temporary HTTPS URL was tested.
-   [ ] Company Google account can sign in.
-   [ ] Invited personal Gmail can sign in.
-   [ ] Uninvited Gmail is rejected.
-   [ ] Company and personal accounts can exchange messages.
-   [ ] Company and personal accounts can exchange photos.
-   [ ] Channel and DM permissions are verified.
-   [ ] Guest and admin permissions are verified.
-   [ ] iPhone installation is tested.
-   [ ] Android installation is tested.
-   [ ] Push behavior is tested on supported devices.
-   [ ] Domain availability/conflicts were checked.
-   [ ] DNS change was approved and uses provider-supplied values.
-   [ ] Existing website and email DNS records remain intact.
-   [ ] Production smoke tests pass on `hub.astragroupph.com`.
-   [ ] Backup/recovery and maintenance responsibilities are documented.
-   [ ] Pilot URL and checklist have been sent to Astra before staff
    invitations.

## Completion report format

At handover, report:

-   Production URL:
-   Deployment date:
-   Hosting/provider accounts owned by Astra:
-   Monthly recurring estimate:
-   Number of pilot users invited:
-   Company account test result:
-   Personal Gmail test result:
-   Messaging/photo test result:
-   Permission test result:
-   iPhone test result:
-   Android test result:
-   Domain/DNS result:
-   Known issues:
-   Deferred features:
-   Maintenance owner:
-   Astra administrator:
