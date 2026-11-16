# Astra Team Hub --- Phase 5: PWA, Responsive Experience, and Quality Assurance

## Purpose

Make Astra Team Hub installable on iPhone and Android, improve mobile
usability, and complete cross-device quality and security testing before
production launch.

**Prerequisite:** Core authentication, messaging, attachments, and
notifications are implemented.

## 1. PWA requirements

Implement a standards-based Progressive Web App. Use a maintained PWA
approach compatible with the installed Next.js version. Do not add a PWA
plugin blindly; inspect compatibility with the current App Router/build
setup first.

Required assets/configuration:

-   Web app manifest.
-   192×192 icon.
-   512×512 icon.
-   Apple touch icon.
-   Theme/background colors.
-   Standalone display mode.
-   Service worker.
-   HTTPS.
-   Offline fallback page.
-   Appropriate metadata and viewport settings.

Example manifest (adjust paths and colors to approved brand assets):

``` json
{
  "name": "Astra Team Hub",
  "short_name": "Team Hub",
  "description": "Private internal communications for Astra.",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#430062",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
```

Use actual approved Astra icon artwork. Do not ship placeholder icons as
final branding.

## 2. Service worker behavior

The service worker should:

-   Support push event handling.
-   Display notifications with safe generic content.
-   Handle notification clicks by opening the correct authorized app
    route.
-   Avoid caching authenticated API responses, private messages, signed
    attachment URLs, or sensitive user data.
-   Avoid caching Supabase session/auth endpoints.
-   Provide a safe offline fallback.
-   Update safely when a new deployment is available.

Do not attempt to make private messaging fully offline for the pilot
unless offline data security and synchronization are explicitly
designed. Show a clear connection/offline state instead.

## 3. Installation experience

### iPhone/iPad

Provide an installation help screen:

1.  Open Astra Team Hub in Safari.
2.  Tap Share.
3.  Select Add to Home Screen.
4.  Confirm the name and tap Add.
5.  Open the installed app.
6.  Enable notifications from within the installed app, if desired and
    supported.

Web Push on iOS/iPadOS requires version 16.4 or later and Home Screen
installation. The permission request must be triggered by a user gesture
from the installed web app.

### Android

Provide a help screen:

1.  Open Astra Team Hub in a supported browser (typically Chrome).
2.  Use the browser's Install app or Add to Home Screen option.
3.  Confirm installation.
4.  Open the installed app.
5.  Enable notifications if desired.

Do not assume the browser always displays an install prompt. Provide
manual instructions.

## 4. Responsive design audit

Test and refine:

-   Small iPhone viewport.
-   Large iPhone viewport.
-   Android phone viewport.
-   Tablet portrait and landscape.
-   Desktop and laptop.
-   Browser zoom at 200%.

Check:

-   Sidebar becomes a usable mobile navigation/drawer.
-   Conversation list and conversation view fit mobile.
-   Message composer stays visible above the virtual keyboard.
-   Safe-area insets are respected.
-   Attachment selection works on mobile.
-   Dialogs and menus fit small screens.
-   No horizontal overflow.
-   Tap targets are comfortably sized.
-   Text remains readable.
-   Focus indicators and keyboard navigation work.

## 5. Reliability and performance

Implement or verify:

-   Pagination for message history.
-   Lazy loading for older messages.
-   Image sizing/optimization.
-   Loading skeletons.
-   Empty/error states.
-   Retry behavior for transient network failures.
-   Realtime reconnection behavior.
-   Cleanup of subscriptions and event listeners.
-   No duplicate messages after reconnect.
-   No unnecessary repeated full-table queries.
-   Sensible database indexes.
-   Error reporting that does not expose secrets or message contents.

Do not add aggressive caching to authenticated data.

## 6. Security QA

Perform a security-focused review of:

-   RLS on all exposed tables.
-   Storage bucket policies.
-   Server action authorization.
-   Route handler authorization.
-   Admin-only operations.
-   Invitation token lifecycle.
-   User role escalation attempts.
-   Private channel membership.
-   DM participant membership.
-   Attachment URL access.
-   Push subscription ownership.
-   Service-role key isolation.
-   XSS protection for message rendering.
-   Input validation and rate limiting.
-   Open redirect protection.
-   Error messages that could leak account information.

Render message content safely. Do not inject arbitrary HTML from user
messages. If rich text is added, use a safe, constrained format and
sanitize any HTML on the server.

## 7. Test matrix

Test with at least three identities and two device types:

  Scenario                            Admin    Member   Guest
  ----------------------------------- -------- -------- --------
  Sign in                             Yes      Yes      Yes
  Assigned channel                    Yes      Yes      Yes
  Unassigned private channel          Denied   Denied   Denied
  One-to-one DM participant           Yes      Yes      Yes
  Nonparticipant DM                   Denied   Denied   Denied
  Invite users                        Yes      Denied   Denied
  Manage roles                        Yes      Denied   Denied
  Upload to assigned conversation     Yes      Yes      Yes
  Upload to unassigned conversation   Denied   Denied   Denied

Also test a suspended user and an uninvited personal Gmail account.

## 8. Browser/device matrix

At minimum:

-   Current Safari on a physical iPhone.
-   Current Chrome on a physical Android device.
-   Desktop Chrome.
-   Desktop Safari or Firefox where available.

Record OS/browser versions, test date, expected result, actual result,
and issue reference. Test push notifications with the app both
foregrounded and backgrounded. Explain platform/browser limitations in
the handover notes.

## 9. Accessibility

Check:

-   Semantic headings and landmarks.
-   Accessible labels for icon buttons.
-   Keyboard navigation.
-   Focus visibility.
-   Contrast.
-   Form error announcements.
-   Screen-reader-friendly unread indicators.
-   Reduced-motion preference.
-   No status communicated by color alone.

## Acceptance criteria

-   [ ] Manifest validates.
-   [ ] Approved icons are installed.
-   [ ] App installs on a supported iPhone.
-   [ ] App installs on a supported Android device.
-   [ ] Standalone app opens to the authenticated experience.
-   [ ] Push works on supported installed devices.
-   [ ] Sensitive data is not cached by the service worker.
-   [ ] Responsive layouts work across the test matrix.
-   [ ] Realtime reconnect is reliable.
-   [ ] No critical/high security findings remain unresolved.
-   [ ] Permission test matrix passes.
-   [ ] Accessibility and usability issues are documented.

## Deliverables

1.  PWA manifest and icons.
2.  Service worker and offline fallback.
3.  Installation help page.
4.  Responsive refinements.
5.  Cross-browser/device QA report.
6.  Security review report.
7.  Known limitations and deferred features list.
