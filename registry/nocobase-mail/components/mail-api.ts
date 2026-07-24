import { nocobaseClient } from "@/lib/nocobase/client";
import type {
  MailAccount,
  MailLabel,
  MailListParams,
  MailListResponse,
  MailMessage,
  MailNote,
  MailSendPayload,
  MailUserRecord,
} from "./types";

function parseListResponse(payload: unknown): MailListResponse {
  if (!payload || typeof payload !== "object") return { rows: [], count: 0 };
  const obj = payload as {
    data?: unknown;
    meta?: { count?: number };
    rows?: unknown;
    count?: number;
  };
  if (Array.isArray(obj.data)) {
    return { rows: obj.data, count: obj.meta?.count ?? obj.data.length };
  }
  if (Array.isArray(obj.rows)) {
    return { rows: obj.rows, count: obj.count ?? obj.rows.length };
  }
  if (Array.isArray(payload)) {
    return { rows: payload, count: payload.length };
  }
  return { rows: [], count: 0 };
}

export const mailApi = {
  listMessages(params: MailListParams = {}): Promise<MailListResponse> {
    const filter: Record<string, unknown> = {};
    if (params.boxType) filter.boxType = { $in: [params.boxType] };
    if (params.isRead !== undefined) filter.isRead = params.isRead;
    if (params.labelId) filter["labels.id"] = { $in: [params.labelId] };
    if (params.userId !== undefined) filter.userId = params.userId;
    if (params.search) {
      filter.$or = [
        { subject: { $includes: params.search } },
        { from: { $includes: params.search } },
        { to: { $includes: params.search } },
      ];
    }
    if (params.filter) Object.assign(filter, params.filter);

    const action = params.scope === "personal" ? "listPerson" : "list";

    return nocobaseClient
      .action<unknown>("mailMessages", action, {
        query: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 20,
          subjectMerge: true,
          appends: "user",
          ...(Object.keys(filter).length ? { filter: JSON.stringify(filter) } : {}),
          sort: params.sort ?? "-relatedMessageLatestDate",
        },
        unwrap: "none",
      })
      .then(parseListResponse);
  },

  getMessage(id: number | string): Promise<MailMessage> {
    return nocobaseClient.action<MailMessage>("mailMessages", "get", {
      query: { filterByTk: id, appends: "children,labels,note" },
    });
  },

  trashMessages(ids: (number | string)[], moveToTrash = true): Promise<unknown> {
    return nocobaseClient.action("mailMessages", "trash", {
      body: { filterByTk: ids, moveToTrash },
    });
  },

  destroyMessages(ids: (number | string)[]): Promise<unknown> {
    return nocobaseClient.action("mailMessages", "destroy", {
      query: { filterByTk: ids.join(",") },
    });
  },

  setRead(mailIds: string[], isRead: boolean): Promise<unknown> {
    return nocobaseClient.action("mail", "messageSetReaded", {
      body: { mailIds, isRead },
    });
  },

  send(payload: MailSendPayload): Promise<unknown> {
    return nocobaseClient.action("mail", "messageSend", { body: payload });
  },

  saveDraft(payload: MailSendPayload): Promise<{ id: number }> {
    return nocobaseClient.action<{ id: number }>("mail", "messageSavingDraft", {
      body: payload,
    });
  },

  sync(emails: string[]): Promise<unknown> {
    return nocobaseClient.action("mail", "messagesSync", { body: { emails } });
  },

  unreadCount(): Promise<number> {
    return nocobaseClient.action<number>("mail", "messageUnreadCount");
  },

  getAccounts(): Promise<MailAccount[]> {
    return nocobaseClient.action<MailAccount[]>("mail", "getMailAccounts");
  },

  getUsers(): Promise<MailUserRecord[]> {
    return nocobaseClient
      .action<MailUserRecord[]>("users", "list", {
        query: { pageSize: 100 },
      })
      .then((res) => (Array.isArray(res) ? res : []));
  },

  getLabels(userId?: number | string): Promise<MailLabel[]> {
    const filter =
      userId !== undefined ? { createdBy: { id: userId } } : undefined;
    return nocobaseClient
      .action<MailLabel[]>("mailMessageLabels", "list", {
        query: {
          paginate: false,
          ...(filter ? { filter: JSON.stringify(filter) } : {}),
        },
      })
      .then((res) => (Array.isArray(res) ? res : []));
  },

  createLabel(values: {
    label: string;
    color: string;
    description?: string;
  }): Promise<MailLabel> {
    return nocobaseClient.action<MailLabel>("mailMessageLabels", "create", {
      body: values,
    });
  },

  setMessageLabels(
    messageId: number | string,
    labelIds: number[]
  ): Promise<unknown> {
    return nocobaseClient.action("mailMessages", "update", {
      query: { filterByTk: messageId },
      body: { labels: labelIds },
    });
  },

  setTodo(messageId: number | string, isTodo: boolean): Promise<unknown> {
    return nocobaseClient.action("mailMessages", "update", {
      query: { filterByTk: messageId },
      body: { isTodo },
    });
  },

  setBoxType(messageId: number | string, boxType: string): Promise<unknown> {
    return nocobaseClient.action("mailMessages", "update", {
      query: { filterByTk: messageId },
      body: { boxType },
    });
  },

  createNote(messageId: number | string, note: string): Promise<MailNote> {
    return nocobaseClient.action<MailNote>("mailMessageNotes", "create", {
      body: { mailMessageId: messageId, note },
    });
  },

  updateNote(
    noteId: number | string,
    messageId: number | string,
    note: string
  ): Promise<MailNote> {
    return nocobaseClient.action<MailNote>("mailMessageNotes", "update", {
      query: { filterByTk: noteId },
      body: { mailMessageId: messageId, note },
    });
  },

  attachmentUrl(messageId: number | string, attachmentId: string): string {
    return nocobaseClient
      .buildUrl("mail:messageAttachmentGet", {
        id: messageId,
        attachmentId,
      })
      .toString();
  },
};
