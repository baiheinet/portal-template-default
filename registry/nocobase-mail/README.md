# NocoBase Mail

Reusable mail inbox, compose, detail, and label components backed by the NocoBase mail API.

After installation, import the components from `@/extensions/nocobase-mail`.

- `MailInbox` full inbox with toolbar, table, detail panel, and compose.
- `MailCompose` / `MailComposeForm` standalone compose dialog or embedded form,
  with immediate and scheduled sending plus opt-in bulk mode, account-aware sender aliases,
  server templates/signatures, recipient suggestions, and real attachment uploads.
- `MailComposeAttachments` uploads files through `mail:messageAttachmentUpload`
  with retry, removal, and the backend's 25 MB limit.
- `MailFilters` folder, read-state, label, and starred-message filters.
- `MailUnreadProvider` / `MailUnreadIcon` unread-count polling and navigation badge.
- `MailMassTracking` bulk delivery tracking with recipient status, cancel, and resend.
- `useMailMessages` hook for paginated message listing with search and filters.
- `useMailCompose` hook to open compose from anywhere.
- `MailLabelBadge` / `MailLabelsEditor` label display, assignment, and full CRUD.
- `MailNoteEditor` per-message private notes.
- `MailAttachmentList` attachment preview and download.

The mail API client (`mailApi`) uses the Starter's built-in `API_URL`, `getNocoBaseHeaders`, and `NOCOBASE_TOKEN_KEY` from `@/providers/constants`. A compatible NocoBase backend with the mail plugin enabled is required.

## Send modes

The standard compose form enables scheduled sending by default. Bulk sending is
kept on the dedicated `/admin/mail/bulk` page, where the bulk form and delivery
jobs are visible together. Reusable compose forms can still opt into bulk mode:

- **Schedule send** calls `mail:messageSend` with an ISO `scheduleSendAt` value.
- **Bulk send** calls `mailMassMessages:send`, creates one separate message per
  To recipient, and defaults to a 2-second interval between messages.

```tsx
<MailComposeForm
  allowScheduleSend
  allowBulkSend
  defaultBulkIntervalMs={2000}
/>
```

Bulk and scheduled sending are separate modes, matching the NocoBase email
manager backend. Bulk sending requires at least two recipients and does not
support a scheduled start time.

Scheduled messages can be canceled back into drafts and edited or rescheduled.
Opening a local draft enters compose mode with its uploaded attachments; local
drafts can be updated or permanently deleted. Provider-backed drafts remain
read-only and must be changed in the original mailbox so provider state and
attachments are preserved. Trash actions are provider-backed: messages
can be moved to trash, put back, or permanently deleted after confirmation.

Templates are stored in `mailTemplates`; the backend model stores template
content but no subject. Signatures are stored per mail account in
`mailAccounts.config.signatures`, so changing the selected sender also changes
the available/default signature. Use `recipientOptions` on the compose
components to add application-specific record recipients alongside NocoBase
users.

Mailbox account creation, OAuth authorization, and provider settings are not
part of this component package; they remain owned by the separate mail settings
center.
