import { useForm } from "@refinedev/react-hook-form";
import { useNavigate } from "react-router";

import { CreateView } from "@/components/resources/views/create-view";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

export const CategoryCreate = () => {
  const navigate = useNavigate();

  const {
    refineCore: { onFinish },
    ...form
  } = useForm({
    refineCoreProps: {},
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
                    placeholder="Enter category title"
                  />}
                />
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
