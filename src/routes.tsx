import { Box, LayoutDashboard } from "lucide-react";

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
  {
    name: "pcf-viewer",
    path: "/pcf-viewer",
    lazy: () => import("./pages/pcf-viewer"),
    resource: {
      meta: {
        label: "PCF/IDF Viewer",
        icon: <Box />,
        priority: 2,
      },
    },
  },
]);
