import assert from "node:assert/strict";
import test from "node:test";

import { isDataTableLoading } from "../src/components/data-table/data-table-loading.ts";

test("treats a paginated refetch as table loading", () => {
  assert.equal(isDataTableLoading({ isLoading: false, isFetching: true }), true);
});
