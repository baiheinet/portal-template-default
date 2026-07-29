import type { AppExtension } from "@/app/extension";
import {
  ListFilter,
  Mail,
  MessagesSquare,
  PanelsLeftRight,
  PenLine,
  Users,
  UsersRound,
} from "lucide-react";
import { Outlet, Route } from "react-router";
import { MailUnreadProvider } from "./components";
import { MailBulkPage, MailComposePage, MailManagerPage } from "./mail-pages";
import {
  MailAudienceScenario,
  MailCorrespondenceScenario,
  MailScenarioOverview,
  MailUnreadScenario,
} from "./mail-demo-pages";

const nocobaseMailExtension: AppExtension = {
  id: "nocobase-mail",
  Provider: MailUnreadProvider,
  resources: [
    {
      name: "mail",
      list: "/admin/mail",
      meta: {
        label: "Mail",
        icon: <Mail />,
        description: "Read, send, and manage mailbox messages.",
      },
    },
    {
      name: "mail-scenario-workspace",
      list: "/admin/mail-demos/workspace",
      meta: {
        parent: "mail",
        label: "My mailbox",
        icon: <PanelsLeftRight />,
      },
    },
    {
      name: "mail-scenario-audiences",
      list: "/admin/mail-demos/personal",
      meta: {
        parent: "mail",
        label: "Mailbox views",
        icon: <Users />,
      },
    },
    {
      name: "mail-scenario-unread",
      list: "/admin/mail-demos/unread",
      meta: {
        parent: "mail",
        label: "Unread indicator",
        icon: <MessagesSquare />,
      },
    },
    {
      name: "mail-scenario-compose",
      list: "/admin/mail/compose",
      meta: {
        parent: "mail",
        label: "Compose & send",
        icon: <PenLine />,
      },
    },
    {
      name: "mail-scenario-correspondence",
      list: "/admin/mail-demos/filtered",
      meta: {
        parent: "mail",
        label: "Correspondence per user",
        icon: <ListFilter />,
      },
    },
    {
      name: "mail-bulk",
      list: "/admin/mail/bulk",
      meta: {
        parent: "mail",
        label: "Bulk mail",
        icon: <UsersRound />,
        description: "Send bulk mail and track delivery jobs.",
      },
    },
  ],
  routes: (
    <Route key="nocobase-mail" path="/admin" element={<Outlet />}>
      <Route path="mail" element={<MailManagerPage />} />
      <Route path="mail/compose" element={<MailComposePage />} />
      <Route path="mail/bulk" element={<MailBulkPage />} />
      <Route path="mail-demos" element={<Outlet />}>
        <Route index element={<MailScenarioOverview />} />
        <Route path="workspace" element={<MailManagerPage />} />
        <Route path="personal" element={<MailAudienceScenario />} />
        <Route path="unread" element={<MailUnreadScenario />} />
        <Route path="filtered" element={<MailCorrespondenceScenario />} />
      </Route>
    </Route>
  ),
};

export default nocobaseMailExtension;
