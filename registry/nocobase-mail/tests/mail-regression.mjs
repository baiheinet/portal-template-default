import assert from "node:assert/strict";
import { createServer } from "vite";

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true },
});

try {
  const { getMailSenderCandidates, resolveMailSender } =
    await server.ssrLoadModule(
      "/registry/nocobase-mail/components/mail-senders.ts"
    );
  const { buildComposeInitial } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/use-mail-compose.tsx"
  );
  const { mailApi } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/mail-api.ts"
  );
  const { nocobaseClient } = await server.ssrLoadModule(
    "/src/lib/nocobase/client.ts"
  );
  const { default: mailExtension } = await server.ssrLoadModule(
    "/registry/nocobase-mail/extension.tsx"
  );
  const { appendRecipient, currentToken, mergeRecipients } = await server.ssrLoadModule(
    "/registry/nocobase-mail/components/mail-recipient-input.tsx"
  );

  assert.equal(currentToken("alice@example.com, bo"), "bo");
  assert.equal(
    appendRecipient("alice@example.com, bo", "bob@example.com"),
    "alice@example.com, bob@example.com",
    "replaces the active search token when a recipient is selected"
  );
  assert.equal(
    appendRecipient("alice@example.com, ", "bob@example.com"),
    "alice@example.com, bob@example.com",
    "appends after a completed manual recipient"
  );
  assert.equal(
    appendRecipient("Alice@example.com, ali", "alice@example.com"),
    "Alice@example.com",
    "deduplicates selected recipients case-insensitively"
  );
  assert.equal(
    mergeRecipients(
      "alice@example.com",
      "bob@example.com; ALICE@example.com, carol@example.com"
    ),
    "alice@example.com, bob@example.com, carol@example.com",
    "merges manually entered To/Cc recipients and removes duplicates"
  );

  const scenarioResources = mailExtension.resources.filter(
    (resource) => resource.name.startsWith("mail-scenario-")
  );
  assert.equal(scenarioResources.length, 5, "keeps all five mail scenario menu entries");
  assert.ok(
    scenarioResources.every((resource) => resource.meta?.parent === "mail"),
    "nests every scenario directly under Mail"
  );
  assert.equal(
    mailExtension.resources.some((resource) => resource.name === "mail-compose"),
    false,
    "removes the old standalone Compose menu entry"
  );
  assert.equal(
    mailExtension.resources.some((resource) => resource.name === "mail-scenarios"),
    false,
    "removes the intermediate Mail scenarios menu group"
  );
  const bulkResource = mailExtension.resources.find(
    (resource) => resource.name === "mail-bulk"
  );
  assert.equal(bulkResource?.list, "/admin/mail/bulk");
  assert.equal(bulkResource?.meta?.parent, "mail");
  assert.equal(bulkResource?.meta?.label, "Bulk mail");
  assert.equal(
    mailExtension.resources.at(-1)?.name,
    "mail-bulk",
    "keeps Bulk mail as the final item in the Mail menu"
  );
  assert.deepEqual(
    scenarioResources.map((resource) => resource.list),
    [
      "/admin/mail-demos/workspace",
      "/admin/mail-demos/personal",
      "/admin/mail/compose",
      "/admin/mail-demos/filtered",
      "/admin/mail-demos/compose-anywhere",
    ]
  );

  const candidates = getMailSenderCandidates([
    {
      id: 1,
      type: "gmail",
      email: "owner@example.com",
      userId: 1,
      settingId: 1,
      identities: [
        { id: 11, accountId: 1, userId: 1, email: "sales@example.com" },
        { id: 12, accountId: 1, userId: 1, email: "owner@example.com" },
      ],
    },
    {
      id: 2,
      type: "smtp",
      email: "team@example.com",
      userId: 1,
      settingId: 2,
      identities: [
        { id: 21, accountId: 2, userId: 1, email: "sales@example.com" },
      ],
    },
  ]);

  assert.equal(candidates.length, 4, "deduplicates identities within an account");
  assert.equal(new Set(candidates.map((candidate) => candidate.key)).size, 4);
  assert.deepEqual(
    resolveMailSender(candidates, {
      from: "sales@example.com",
      accountEmail: "team@example.com",
    }),
    candidates[3],
    "uses the owning account to disambiguate the same alias"
  );
  assert.equal(
    resolveMailSender(candidates, { from: "owner@example.com" })?.accountId,
    1,
    "supports legacy compose values that only contain from"
  );

  const reply = buildComposeInitial(
    {
      id: 1,
      email: "team@example.com",
      identityEmail: "sales@example.com",
      mailId: "message-1",
      rawId: "raw-1",
      boxType: "in",
      isRead: false,
      isDraft: false,
      from: "customer@example.com",
      to: "sales@example.com, colleague@example.com",
      toUsers: [
        { address: "SALES@example.com" },
        { address: "colleague@example.com" },
      ],
      cc: "observer@example.com",
      ccUsers: [{ address: "observer@example.com" }],
      subject: "Question",
      date: "2026-07-27T10:00:00.000Z",
      bodyText: "Hello",
      bodyHtml: "<p>Hello</p>",
      attachments: [],
    },
    "replyAll",
    ["team@example.com", "sales@example.com"]
  );

  assert.equal(reply.accountEmail, "team@example.com");
  assert.equal(reply.identityEmail, "sales@example.com");
  assert.equal(reply.to, "customer@example.com, colleague@example.com");
  assert.equal(reply.cc, "observer@example.com");

  const draft = buildComposeInitial(
    {
      id: 7,
      email: "team@example.com",
      identityEmail: "sales@example.com",
      mailId: "",
      rawId: "",
      boxType: "draft",
      isRead: true,
      isDraft: true,
      from: "sales@example.com",
      to: "customer@example.com",
      cc: "",
      bcc: "",
      subject: "Draft subject",
      date: "2026-07-27T10:00:00.000Z",
      bodyText: "",
      bodyHtml: "<p>Draft body</p>",
      attachments: [
        {
          filename: "stored-file",
          mimeType: "text/plain",
          attachmentId: "draft.txt",
          originalname: "draft.txt",
          path: "/tmp/stored-file",
          size: 12,
          encoding: "7bit",
          mimetype: "text/plain",
        },
      ],
    },
    "draft"
  );
  assert.equal(draft.id, 7);
  assert.equal(draft.isDraft, true);
  assert.equal(draft.attachments?.[0].path, "/tmp/stored-file");
  assert.equal(draft.attachments?.[0].filename, "draft.txt");
  assert.equal(draft.attachments?.[0].mimeType, "text/plain");
  assert.throws(
    () =>
      buildComposeInitial(
        { ...draft, id: 8, isDraft: true, mailId: "provider-draft", rawId: "raw-draft" },
        "draft"
      ),
    /read-only/,
    "provider-backed drafts must never enter the local draft mutation workflow"
  );

  const calls = [];
  const originalAction = nocobaseClient.action.bind(nocobaseClient);
  nocobaseClient.action = async (resource, action, options) => {
    calls.push({ resource, action, options });
    if (resource === "mailMassMessages" && action === "list") {
      const page = options.query.page;
      return {
        data:
          page === 1
            ? Array.from({ length: 100 }, (_, index) => ({
                id: index + 1,
                status: "pending",
                message: {},
                to: `user${index + 1}@example.com`,
              }))
            : [{ id: 101, status: "pending", message: {}, to: "user101@example.com" }],
        meta: { count: 101 },
      };
    }
    if (resource === "mail" && action === "messageAttachmentUpload") {
      return {
        originalname: "draft.txt",
        filename: "stored-file",
        path: "/tmp/stored-file",
        size: 12,
        encoding: "7bit",
        mimetype: "text/plain",
      };
    }
    return {};
  };

  try {
    await mailApi.cancelScheduled(7);
    await mailApi.destroyMessages([7, 8]);
    await mailApi.cancelMassMessage(9);
    await mailApi.resendMassMessage(9);
    const massList = await mailApi.listMassMessages(null);
    const uploaded = await mailApi.uploadAttachment(new Blob(["draft"]));

    assert.deepEqual(
      calls.slice(0, 4).map(({ resource, action }) => [resource, action]),
      [
        ["mailMessages", "cancelTimelySend"],
        ["mailMessages", "destroy"],
        ["mailMassMessages", "cancel"],
        ["mailMassMessages", "resend"],
      ]
    );
    assert.deepEqual(calls[0].options.query, { id: 7 });
    assert.deepEqual(calls[1].options.query, { filterByTk: [7, 8] });
    assert.equal(massList.count, 101);
    assert.equal(massList.rows.length, 101, "loads every bulk task page");
    assert.equal(
      calls.filter(({ resource, action }) => resource === "mailMassMessages" && action === "list").length,
      2
    );
    assert.equal(uploaded.filename, "draft.txt");
    assert.equal(uploaded.mimeType, "text/plain");
    assert.ok(calls.at(-1).options.body instanceof FormData);
  } finally {
    nocobaseClient.action = originalAction;
  }

  console.log("NocoBase mail regression tests passed");
} finally {
  await server.close();
}
