# Project memory

## Product intent & audience

- Finance-focused web app with a Zoho Books integration module for pushing sales and purchase invoices.
- Menu structure includes Finance → Zoho Books Integration.
- Audience: business users managing invoice sync between the app and Zoho Books.

## Brand personality & voice

- Utility/finance admin tooling; clarity and trustworthiness prioritized over novelty.
- Support-oriented tone when surfacing integration errors and recovery actions.

## Visual design & UX direction

- Built with Vite + React, Tailwind CSS, Lucide React icons.
- Admin/dashboard-style interface with menus and sub-menus.
- Integration status UI currently shows "Connected" based only on token existence, not validity — needs to reflect real OAuth state.
- Planned UX: explicit "Reconnect Zoho Books" button visible when tokens expire, so users don't need Disconnect first.
- Desired status labels: distinguish "Connected" from "Reconnect Required" for expired/invalid tokens.

## Decisions, constraints & rationale

- Zoho Books integration uses OAuth2: access token + refresh token stored per connection.
- Access tokens expire; refresh tokens can be rejected by Zoho after expiry or app/secret/org changes.
- Existing invoice links should be preserved across reconnection; only non-pushed invoices retried (pending user confirmation).
- Reconnection should reuse the same Zoho account and organization currently linked (pending user confirmation).
- Do not install additional UI/icon packages beyond Tailwind + lucide-react.

## Open questions & assumptions

- Whether Zoho developer app, client secret, or organization changed since initial connection (asked of user).
- Whether a fresh OAuth authorization (not just refresh) is acceptable as the recovery path.
- Whether all historical invoice links must remain intact after reconnect.
- Assumption: the backend stores tokens and performs invoice push; frontend only manages connection status and triggers reconnect.
- Assumption: Zoho client ID/secret are configured server-side and unchanged unless user reports otherwise.