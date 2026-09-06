import {
  useCreate,
  useGetIdentity,
  useList,
  useTranslate,
  type HttpError,
} from "@refinedev/core";

import { CustomerSubmit, type SubmitTicketValues } from "@/features/support-desk/customer-submit";
import {
  CUSTOMERS_RESOURCE,
  TICKETS_RESOURCE,
  ticketNoOf,
} from "@/features/support-desk/api";

type Identity = { id: number | string; email?: string | null };

type CustomerRecord = {
  id: number | string;
  company?: string | null;
  contactEmail?: string | null;
};

type SupportTicketData = {
  id: number | string;
  ticketNo?: number | string | null;
};

export default function SupportSubmitPage() {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);

  const { data: identity } = useGetIdentity<Identity>();
  const { result: customersResult } = useList<CustomerRecord>({
    resource: CUSTOMERS_RESOURCE,
    filters: [
      { field: "user.id", operator: "eq", value: identity?.id },
    ],
    pagination: { mode: "server", currentPage: 1, pageSize: 1 },
    queryOptions: { enabled: identity != null, retry: false },
    errorNotification: false,
  });
  const customer = customersResult?.data?.[0];

  const { mutateAsync: createTicket, mutation } =
    useCreate<SupportTicketData, HttpError>();
  const submitting = mutation.isPending;

  const handleSubmit = async (values: SubmitTicketValues) => {
    const created = await createTicket({
      resource: TICKETS_RESOURCE,
      values: {
        title: values.title,
        description: values.description,
        priority: values.priority,
        contactEmail: values.contactEmail || undefined,
        customer: customer?.id,
      },
      successNotification: (data) => ({
        key: "support-ticket-created",
        type: "success",
        message: t("support.customer.submitSuccess", "提交成功"),
        description:
          ticketNoOf(data?.data?.ticketNo) != null
            ? `${t("support.customer.ticketNoLabel", "工单编号")} #${String(
                ticketNoOf(data?.data?.ticketNo)
              ).padStart(6, "0")}`
            : undefined,
      }),
      errorNotification: (_error, _values, resource) => ({
        key: `${resource}-create-error`,
        type: "error",
        message: t("support.customer.submitFailed", "提交失败，请稍后重试"),
      }),
    });
    return { ticketNo: ticketNoOf(created?.data?.ticketNo) };
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {t("support.nav.submit", "提交问题")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t(
            "support.customer.submitDescription",
            "描述你遇到的问题并提交，客服会尽快跟进处理。"
          )}
        </p>
      </div>
      <div className="rounded-xl border bg-card p-5 shadow-sm sm:p-6">
        <CustomerSubmit
          defaultEmail={customer?.contactEmail || identity?.email || ""}
          submitting={submitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}
