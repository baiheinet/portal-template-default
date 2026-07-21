"use client";

import type { PropsWithChildren } from "react";

import { useResourceParams, useUserFriendlyName } from "@refinedev/core";
import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { CreateButton } from "@/components/resources/buttons/create";
import { cn } from "@/lib/utils";

type ListViewProps = PropsWithChildren<{
  className?: string;
}>;

export function ListView({ children, className }: ListViewProps) {
  return (
    <div className={cn("flex flex-col", "gap-6", className)}>
      <ListViewHeader />
      {children}
    </div>
  );
}

type ListHeaderProps = PropsWithChildren<{
  resource?: string;
  title?: string;
  canCreate?: boolean;
  headerClassName?: string;
  wrapperClassName?: string;
}>;

export const ListViewHeader = ({
  canCreate,
  resource: resourceFromProps,
  title: titleFromProps,
  wrapperClassName,
  headerClassName,
}: ListHeaderProps) => {
  const getUserFriendlyName = useUserFriendlyName();

  const { resource, identifier } = useResourceParams({
    resource: resourceFromProps,
  });
  const resourceName = identifier ?? resource?.name;

  const isCreateButtonVisible = canCreate ?? !!resource?.create;

  const title =
    titleFromProps ??
    getUserFriendlyName(
      resource?.meta?.label ?? identifier ?? resource?.name,
      "plural"
    );
  const description = resource?.meta?.description as string | undefined;

  return (
    <div className={cn("flex flex-col", "gap-3", wrapperClassName)}>
      <div className="flex items-center text-muted-foreground">
        <Breadcrumb />
      </div>
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
          headerClassName
        )}
      >
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.035em]">
            {title}
          </h2>
          {description && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          )}
        </div>
        {isCreateButtonVisible && (
          <div className="flex items-center gap-2">
            <CreateButton resource={resourceName} />
          </div>
        )}
      </div>
    </div>
  );
};

ListView.displayName = "ListView";
