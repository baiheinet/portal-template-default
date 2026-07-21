import { useShow } from "@refinedev/core";
import React from "react";

import { ShowView } from "@/components/resources/views/show-view";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const CategoryShow = () => {
  const { result: record, query } = useShow({});
  const { isLoading } = query;

  return (
    <ShowView>
      <Card className="resource-detail-card max-w-3xl">
        <CardHeader>
          <CardTitle>{record?.title}</CardTitle>
          <CardDescription>Category ID: {record?.id}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Title</h4>
              <p className="text-sm text-muted-foreground">
                {record?.title || "-"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </ShowView>
  );
};
