import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ATTENTION_POLL_INTERVAL_MS,
  countAttentionTickets,
  usePolledCount,
} from "@/features/support-desk/attention-count";
import type { TicketRecord } from "@/features/support-desk/model";

const T0 = Date.UTC(2026, 8, 1, 9, 0, 0);
const h = (n: number) => n * 3_600_000;

function ticket(patch: Partial<TicketRecord> = {}): TicketRecord {
  return {
    id: "t1",
    ticketNo: 1,
    title: "登录失败",
    description: "无法登录",
    status: "pending",
    priority: "normal",
    firstRespondedAt: null,
    resolvedAt: null,
    lastActivityAt: null,
    createdAt: new Date(T0).toISOString(),
    ...patch,
  };
}

describe("countAttentionTickets", () => {
  it("只统计命中关注规则的工单", () => {
    const nowMs = T0 + h(30);
    const count = countAttentionTickets(
      [
        ticket({ id: "a" }), // overdue
        ticket({ id: "b", status: "resolved" }),
        ticket({ id: "c", priority: "urgent" }), // urgentUnanswered
        ticket({ id: "d", status: "processing" }), // no stale yet
        ticket({ id: "e", status: "processing", createdAt: new Date(T0 - h(50)).toISOString() }), // stale
      ],
      nowMs
    );
    expect(count).toBe(3);
  });

  it("空列表为 0", () => {
    expect(countAttentionTickets([], T0)).toBe(0);
  });
});

describe("usePolledCount", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("按 60s 轮询刷新", () => {
    const fetcher = vi.fn();
    const { result } = renderHook(() => usePolledCount(fetcher));

    expect(fetcher).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(ATTENTION_POLL_INTERVAL_MS);
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.refresh();
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
