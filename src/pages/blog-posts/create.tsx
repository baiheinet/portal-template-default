import { useForm } from "@refinedev/react-hook-form";
import { useSelect } from "@refinedev/core";
import { useNavigate } from "react-router";
import { Textarea } from "@/components/ui/textarea";

import { CreateView } from "@/components/resources/views/create-view";
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

export const BlogPostCreate = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish },
    ...form
  } = useForm({
    refineCoreProps: {},
  });

  const { options: categoryOptions } = useSelect({
    resource: "categories",
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
    <CreateView>
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
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value?.toString() || ""}
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
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={"draft"}>
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
              {form.formState.isSubmitting ? "Creating..." : "Create"}
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
    </CreateView>
  );
};
