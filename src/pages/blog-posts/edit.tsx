import { useForm } from "@refinedev/react-hook-form";
import { useSelect } from "@refinedev/core";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Textarea } from "@/components/ui/textarea";

import { EditView } from "@/components/resources/views/edit-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const BlogPostEdit = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish, query },
    ...form
  } = useForm({
    refineCoreProps: {
      meta: {
        appends: ["category"],
      },
    },
  });

  const blogPostsData = query?.data?.data;
  const defaultCategoryId =
    blogPostsData?.categoryId ?? blogPostsData?.category?.id;

  useEffect(() => {
    if (defaultCategoryId != null && !form.getValues("categoryId")) {
      form.setValue("categoryId", defaultCategoryId.toString(), {
        shouldDirty: false,
      });
    }
  }, [defaultCategoryId, form]);

  const { options: categoryOptions } = useSelect({
    resource: "categories",
    defaultValue: defaultCategoryId?.toString(),
    optionLabel: "title",
    optionValue: "id",
    pagination: {
      currentPage: 1,
      pageSize: 100,
    },
  });

  function onSubmit(values: Record<string, string>) {
    onFinish(values);
  }

  return (
    <EditView>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="resource-form">
          <FormField
            control={form.control}
            name="title"
            rules={{ required: "Title is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl
                  render={<Input
                    {...field}
                    value={field.value || ""}
                    placeholder="Enter title"
                  />}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="content"
            rules={{ required: "Content is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Content</FormLabel>
                <FormControl
                  render={<Textarea
                    {...field}
                    value={field.value || ""}
                    placeholder="Enter content"
                    rows={10}
                  />}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="categoryId"
            rules={{ required: "Category is required" }}
            render={({ field }) => {
              const selectedCategoryId = field.value ?? defaultCategoryId;

              return <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  items={categoryOptions?.map((option) => ({
                    label: option.label,
                    value: option.value.toString(),
                  }))}
                  onValueChange={field.onChange}
                  value={selectedCategoryId?.toString() || ""}
                >
                  <FormControl
                    render={<SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>}
                  />
                  <SelectContent>
                    {categoryOptions?.map((option) => (
                      <SelectItem key={option.value} value={option.value.toString()}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>;
            }}
          />

          <FormField
            control={form.control}
            name="status"
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  items={{
                    draft: "Draft",
                    published: "Published",
                    rejected: "Rejected",
                  }}
                  onValueChange={field.onChange}
                  value={field.value || ""}
                >
                  <FormControl
                    render={<SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>}
                  />
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex gap-2">
            <Button
              type="submit"
              {...form.saveButtonProps}
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Updating..." : "Update"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(-1)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </EditView>
  );
};
