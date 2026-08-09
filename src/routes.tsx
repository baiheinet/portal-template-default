import { LayoutDashboard } from "lucide-react";

import { defineAppRoutes } from "@nocobase/portal-sdk/routing";

export const registryRoutesEnabled = false;

export const appRoutes = defineAppRoutes([
  {
    name: "showcase",
    path: "/showcase",
    lazy: () => import("./pages/showcase"),
    resource: {
      meta: {
        label: "AI Portal Showcase",
        icon: <LayoutDashboard />,
        priority: 1,
      },
    },
  },
]);
