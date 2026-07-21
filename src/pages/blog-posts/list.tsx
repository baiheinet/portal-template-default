import { useTable } from "@refinedev/react-table";
import { createColumnHelper } from "@tanstack/react-table";
import { Eye, Pencil, Trash2 } from "lucide-react";
import React from "react";

import { DataTable } from "@/components/data-table/data-table";
import { StatusBadge } from "@/components/resources/status-badge";
import { ListView } from "@/components/resources/views/list-view";
import { EditButton } from "@/components/resources/buttons/edit";
import { ShowButton } from "@/components/resources/buttons/show";
import { DeleteButton } from "@/components/resources/buttons/delete";

type BlogPost = {
  id: string;
  title: string;
  content: string;
  status: string;
  createdAt: string;
  category: { id: string; title: string };
};

export const BlogPostList = () => {
  const columns = React.useMemo(() => {
    const columnHelper = createColumnHelper<BlogPost>();

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
      columnHelper.accessor("content", {
        id: "content",
        header: "Content",
        enableSorting: false,
        cell: ({ getValue }) => {
          const content = getValue();
          if (!content) return "-";
          return (
            <div className="max-w-xs truncate">{content.slice(0, 80)}...</div>
          );
        },
      }),
      columnHelper.accessor("category.title", {
        id: "category",
        header: "Category",
        enableSorting: false,
        cell: ({ row }) => {
          return row.original.category?.title || "-";
        },
      }),
      columnHelper.accessor("status", {
        id: "status",
        header: "Status",
        enableSorting: true,
        cell: ({ getValue }) => {
          const status = getValue();
          return <StatusBadge status={status} />;
        },
      }),
      columnHelper.accessor("createdAt", {
        id: "createdAt",
        header: "Created At",
        enableSorting: true,
        cell: ({ getValue }) => {
          const date = getValue();
          return date ? new Date(date).toLocaleDateString() : "-";
        },
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
              aria-label="Edit post"
              title="Edit"
            >
              <Pencil />
            </EditButton>
            <ShowButton
              recordItemId={row.original.id}
              variant="ghost"
              size="icon"
              aria-label="View post"
              title="View"
            >
              <Eye />
            </ShowButton>
            <DeleteButton
              recordItemId={row.original.id}
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive"
              aria-label="Delete post"
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
      meta: {
        appends: ["category"],
      },
    },
  });

  return (
    <ListView>
      <DataTable table={table} />
    </ListView>
  );
};
