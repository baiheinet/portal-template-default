"use client";

import { cn } from "@/lib/utils";
import {
  useBack,
  useResourceParams,
  useUserFriendlyName,
} from "@refinedev/core";
import type { PropsWithChildren } from "react";
import { Breadcrumb } from "@/components/app-shell/breadcrumb";
import { Button } from "@/components/ui/button";
import { RefreshButton } from "@/components/resources/buttons/refresh";
import { ArrowLeftIcon } from "lucide-react";

type EditViewProps = PropsWithChildren<{
  className?: string;
}>;

export function EditView({ children, className }: EditViewProps) {
  return (
    <div className={cn("flex flex-col", "gap-6", className)}>
      <EditViewHeader />
      {children}
    </div>
  );
}

type EditViewHeaderProps = PropsWithChildren<{
  resource?: string;
  title?: string;
  wrapperClassName?: string;
  headerClassName?: string;
  actionsSlot?: React.ReactNode;
}>;

export const EditViewHeader = ({
  resource: resourceFromProps,
  title: titleFromProps,
  actionsSlot,
  wrapperClassName,
  headerClassName,
}: EditViewHeaderProps) => {
  const back = useBack();

  const getUserFriendlyName = useUserFriendlyName();

  const { resource, identifier } = useResourceParams({
    resource: resourceFromProps,
  });
  const { id: recordItemId } = useResourceParams();

  const resourceName = resource?.name ?? identifier;

  const resourceTitle = getUserFriendlyName(
    resource?.meta?.label ?? identifier ?? resource?.name,
    "singular"
  );
  const title = titleFromProps ?? `Edit ${resourceTitle}`;

  return (
    <div className={cn("flex flex-col", "gap-3", wrapperClassName)}>
      <div className="flex items-center text-muted-foreground">
        <Breadcrumb />
      </div>
      <div
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between",
          headerClassName
        )}
      >
        <div className="flex items-start gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 rounded-lg"
            onClick={back}
          >
            <ArrowLeftIcon className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-3xl font-semibold tracking-[-0.035em]">
              {title}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Update this {resourceTitle.toLowerCase()} while NocoBase keeps
              the data consistent.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionsSlot}
          <RefreshButton
            variant="outline"
            recordItemId={recordItemId}
            resource={resourceName}
          />
        </div>
      </div>
    </div>
  );
};

EditView.displayName = "EditView";
