import { type BaseRecord } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { ListView } from "@/components/resources/views/list-view";
import { EditButton } from "@/components/resources/buttons/edit";
import { ShowButton } from "@/components/resources/buttons/show";
import { DeleteButton } from "@/components/resources/buttons/delete";

type Category = {
  id: string;
  title: string;
};

export const CategoryList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<Category>();

    return [
      columnHelper.accessor("id", {
        id: "id",
        header: "ID",
        enableSorting: false,
      }),
      columnHelper.accessor("title", {
        id: "title",
        header: "Title",
        enableSorting: true,
      }),
      columnHelper.display({
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <div className="flex items-center gap-1">
            <EditButton
              recordItemId={row.original.id}
              variant="ghost"
              size="icon"
              aria-label="Edit category"
              title="Edit"
            >
              <Pencil />
            </EditButton>
            <ShowButton
              recordItemId={row.original.id}
              variant="ghost"
              size="icon"
              aria-label="View category"
              title="View"
            >
              <Eye />
            </ShowButton>
            <DeleteButton
              recordItemId={row.original.id}
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label="Delete category"
              title="Delete"
            >
              <Trash2 />
            </DeleteButton>
          </div>
        ),
        enableSorting: false,
        size: 144,
      }),
    ];
  }, []);

  const table = useTable({
    columns,
    refineCoreProps: {
      syncWithLocation: true,
    },
  });

  return (
    <ListView>
      <DataTable table={table} />
    </ListView>
  );
};
