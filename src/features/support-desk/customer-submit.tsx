import { useTranslate } from "@refinedev/core";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

import type { TicketPriority } from "./model";
import { TICKET_PRIORITIES } from "./api";

const submitSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(5000),
  priority: z.enum(["normal", "urgent"]),
  contactEmail: z
    .union([z.string().trim().email(), z.literal("")])
    .optional(),
});

type SubmitValues = z.infer<typeof submitSchema>;

export interface SubmitTicketValues {
  title: string;
  description: string;
  priority: TicketPriority;
  contactEmail: string;
}

export interface CustomerSubmitProps {
  defaultEmail?: string;
  submitting?: boolean;
  success?: { ticketNo: number | null } | null;
  onSubmit: (
    values: SubmitTicketValues
  ) => { ticketNo: number | null } | Promise<{ ticketNo: number | null } | void> | void;
  onSubmitted?: (result: { ticketNo: number | null }) => void;
  className?: string;
}

export function CustomerSubmit({
  defaultEmail,
  submitting = false,
  success = null,
  onSubmit,
  onSubmitted,
  className,
}: CustomerSubmitProps) {
  const translate = useTranslate();
  const t = (key: string, fallback: string) =>
    translate(key, { ns: "starter" }, fallback);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid, isSubmitting },
  } = useForm<SubmitValues>({
    resolver: zodResolver(submitSchema),
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      priority: "normal",
      contactEmail: defaultEmail ?? "",
    },
  });

  const priority = watch("priority");
  const title = watch("title");
  const description = watch("description");
  const [submittedResult, setSubmittedResult] = useState<{
    ticketNo: number | null;
  } | null>(null);
  const shownSuccess = success ?? submittedResult;

  if (shownSuccess) {
    return (
      <div
        className={className}
        role="status"
        data-testid="customer-submit-success"
      >
        <div className="flex flex-col items-center gap-3 rounded-lg border bg-muted/40 px-6 py-10 text-center">
          <CheckCircle2 className="size-10 text-emerald-600" />
          <p className="text-base font-medium">
            {t("support.customer.submitSuccess", "提交成功")}
          </p>
          <p className="text-sm text-muted-foreground">
            {shownSuccess.ticketNo != null
              ? t("support.customer.ticketNoLabel", "工单编号") +
                " #" +
                String(shownSuccess.ticketNo).padStart(6, "0")
              : t("support.customer.successPendingNo", "我们会尽快处理你的问题")}
          </p>
        </div>
      </div>
    );
  }

  const submit = handleSubmit(async (values) => {
    const result = await onSubmit({
      title: values.title,
      description: values.description,
      priority: values.priority,
      contactEmail: values.contactEmail?.trim() || "",
    });
    const resolved =
      result && typeof result === "object" && "ticketNo" in result
        ? (result as { ticketNo: number | null })
        : { ticketNo: null };
    setSubmittedResult(resolved);
    onSubmitted?.(resolved);
  });

  const busy = submitting || isSubmitting;

  return (
    <form
      className={className}
      onSubmit={(event) => {
        void submit(event);
      }}
      noValidate
    >
      <div className="grid gap-5">
        <div className="grid gap-2">
          <Label htmlFor="support-ticket-title">
            {t("support.customer.titleLabel", "标题")}
          </Label>
          <Input
            id="support-ticket-title"
            aria-label={t("support.customer.titleLabel", "标题")}
            placeholder={t(
              "support.customer.titlePlaceholder",
              "用一句话概括遇到的问题"
            )}
            maxLength={100}
            aria-invalid={Boolean(errors.title)}
            {...register("title")}
          />
          {errors.title || !title?.trim() ? (
            <p className="text-sm text-muted-foreground">
              {t("support.customer.titleRequired", "请输入标题")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="support-ticket-description">
            {t("support.customer.descriptionLabel", "问题描述")}
          </Label>
          <Textarea
            id="support-ticket-description"
            aria-label={t("support.customer.descriptionLabel", "问题描述")}
            placeholder={t(
              "support.customer.descriptionPlaceholder",
              "发生了什么？从什么时候开始？做了哪些尝试？"
            )}
            rows={6}
            maxLength={5000}
            aria-invalid={Boolean(errors.description)}
            {...register("description")}
          />
          {errors.description || !description?.trim() ? (
            <p className="text-sm text-muted-foreground">
              {t("support.customer.descriptionRequired", "请描述遇到的问题")}
            </p>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label>{t("support.customer.priorityLabel", "紧急程度")}</Label>
          <RadioGroup
            value={priority}
            onValueChange={(value) =>
              setValue("priority", value as TicketPriority, {
                shouldValidate: true,
              })
            }
            className="flex flex-row gap-6"
          >
            {TICKET_PRIORITIES.map((value) => (
              <div key={value} className="flex items-center gap-2">
                <RadioGroupItem value={value} id={`priority-${value}`} />
                <Label htmlFor={`priority-${value}`} className="font-normal">
                  {t(
                    value === "urgent"
                      ? "support.priority.urgent"
                      : "support.priority.normal",
                    value === "urgent" ? "紧急" : "普通"
                  )}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="support-ticket-email">
            {t("support.customer.emailLabel", "联系邮箱")}
          </Label>
          <Input
            id="support-ticket-email"
            aria-label={t("support.customer.emailLabel", "联系邮箱")}
            type="email"
            placeholder={t(
              "support.customer.emailPlaceholder",
              "用于接收处理结果（可选）"
            )}
            {...register("contactEmail")}
          />
          {errors.contactEmail ? (
            <p className="text-sm text-destructive">
              {t("support.customer.emailInvalid", "邮箱格式不正确")}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={!isValid || busy}>
            {t("support.customer.submit", "提交问题")}
          </Button>
        </div>
      </div>
    </form>
  );
}
