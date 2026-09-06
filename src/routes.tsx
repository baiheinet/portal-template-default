import { Box, Gauge, Headset, Inbox, LifeBuoy, Sheet } from "lucide-react";

import { defineAppRoutes } from "@nocobase/portal-sdk/routing";

export const registryRoutesEnabled = false;

// Role names come from the NocoBase server ACL: r_customer (客户),
// r_support (客服), plus the built-in admin/root roles for staff oversight.
const STAFF_ROLES = { anyOf: ["r_support", "admin", "root"] };
const SUPPORT_ENTRY_ROLES = {
  anyOf: ["r_customer", "r_support", "admin", "root"],
};

export const appRoutes = defineAppRoutes([
  {
    name: "support-submit",
    path: "/support",
    lazy: () => import("./pages/support"),
    access: { roles: SUPPORT_ENTRY_ROLES },
    resource: {
      meta: {
        label: "提交问题",
        i18nKey: "support.nav.submit",
        i18nOptions: { ns: "starter" },
        icon: <LifeBuoy />,
        priority: 1,
      },
    },
  },
  {
    name: "support-tickets",
    path: "/support/tickets",
    lazy: () => import("./pages/support/tickets"),
    access: { roles: SUPPORT_ENTRY_ROLES },
    resource: {
      meta: {
        label: "我的问题",
        i18nKey: "support.nav.myTickets",
        i18nOptions: { ns: "starter" },
        icon: <Inbox />,
        priority: 2,
      },
    },
    children: [
      {
        name: "support-ticket-detail",
        path: ":ticketId",
        resourceAction: "show",
        lazy: () => import("./pages/support/ticket-detail"),
      },
    ],
  },
  {
    name: "helpdesk",
    path: "/helpdesk",
    lazy: () => import("./pages/helpdesk"),
    access: { roles: STAFF_ROLES },
    resource: {
      meta: {
        label: "客服工作台",
        i18nKey: "support.nav.helpdesk",
        i18nOptions: { ns: "starter" },
        icon: <Headset />,
        priority: 3,
      },
    },
    children: [
      {
        name: "helpdesk-ticket-detail",
        path: ":ticketId",
        resourceAction: "show",
        lazy: () => import("./pages/helpdesk/ticket-detail"),
      },
    ],
  },
  {
    name: "helpdesk-overview",
    path: "/helpdesk/overview",
    lazy: () => import("./pages/helpdesk/overview"),
    access: { roles: STAFF_ROLES },
    resource: {
      meta: {
        label: "服务总览",
        i18nKey: "support.nav.overview",
        i18nOptions: { ns: "starter" },
        icon: <Gauge />,
        priority: 4,
      },
    },
  },
  {
    name: "pcf-viewer",
    path: "/pcf-viewer",
    lazy: () => import("./pages/pcf-viewer"),
    access: { roles: STAFF_ROLES },
    resource: {
      meta: {
        label: "PCF/IDF Viewer",
        icon: <Box />,
        priority: 9,
      },
    },
  },
  {
    name: "baserow",
    path: "/baserow",
    lazy: () => import("./pages/baserow"),
    resource: {
      meta: {
        label: "Baserow 表格",
        icon: <Sheet />,
        priority: 3,
      },
    },
  },
]);
