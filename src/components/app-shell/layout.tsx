"use client";

import { Header } from "@/components/app-shell/header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SupportAttentionProvider } from "@/features/support-desk/attention-count";
import { cn } from "@/lib/utils";
import type { PropsWithChildren } from "react";
import { PageErrorBoundary } from "./page-error-boundary";
import { Sidebar } from "./sidebar";

export function Layout({ children }: PropsWithChildren) {
  return (
    <SupportAttentionProvider>
      <SidebarProvider>
        <Sidebar />
        <SidebarInset className="bg-muted/25">
          <Header />
          <main
            className={cn(
              "@container/main",
              "mx-auto",
              "max-w-[1600px]",
              "relative",
              "w-full",
              "flex",
              "flex-col",
              "flex-1",
              "px-4",
              "py-5",
              "md:p-6",
              "lg:px-8",
              "lg:py-7"
            )}
          >
            <PageErrorBoundary>{children}</PageErrorBoundary>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </SupportAttentionProvider>
  );
}

Layout.displayName = "Layout";
