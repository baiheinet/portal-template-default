# NocoBase Mail

Reusable mail inbox, compose, detail, and label components backed by the NocoBase mail API.

After installation, import the components from `@/extensions/nocobase-mail`.

- `MailInbox` full inbox with toolbar, table, detail panel, and compose.
- `MailCompose` / `MailComposeForm` standalone compose dialog or embedded form.
- `useMailMessages` hook for paginated message listing with search and filters.
- `useMailCompose` hook to open compose from anywhere.
- `MailLabelBadge` / `MailLabelsEditor` label display and management.
- `MailNoteEditor` per-message private notes.
- `MailAttachmentList` attachment preview and download.

The mail API client (`mailApi`) uses the Starter's built-in `API_URL`, `getNocoBaseHeaders`, and `NOCOBASE_TOKEN_KEY` from `@/providers/constants`. A compatible NocoBase backend with the mail plugin enabled is required.
