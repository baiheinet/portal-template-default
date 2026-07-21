import type {
  BaseRecord,
  CreateManyParams,
  CreateManyResponse,
  CreateParams,
  CreateResponse,
  DataProvider,
  DeleteManyParams,
  DeleteManyResponse,
  DeleteOneParams,
  DeleteOneResponse,
  GetListParams,
  GetListResponse,
  GetManyParams,
  GetManyResponse,
  GetOneParams,
  GetOneResponse,
  MetaQuery,
  UpdateManyParams,
  UpdateManyResponse,
  UpdateParams,
  UpdateResponse,
} from "@refinedev/core";

import { API_URL, getNocoBaseHeaders, NOCOBASE_TOKEN_KEY } from "./constants";

type NocoBaseListResponse<T> = {
  rows?: T[];
  count?: number;
  data?: T[] | NocoBaseListResponse<T>;
  meta?: {
    count?: number;
  };
};

type NocoBaseMeta = MetaQuery & {
  appends?: string[];
  token?: string;
};

type NocoBaseFilter = Record<string, unknown>;

const getToken = (meta?: NocoBaseMeta) =>
  meta?.token ??
  localStorage.getItem(NOCOBASE_TOKEN_KEY) ??
  import.meta.env.NOCOBASE_API_TOKEN;

const toNocoBaseFilter = (
  filters: GetListParams["filters"] = [],
): NocoBaseFilter | undefined => {
  const filterItems: NocoBaseFilter[] = filters.flatMap((filter) => {
    if ("field" in filter) {
      const operatorMap: Record<string, string> = {
        eq: "$eq",
        ne: "$ne",
        lt: "$lt",
        gt: "$gt",
        lte: "$lte",
        gte: "$gte",
        in: "$in",
        nin: "$notIn",
        contains: "$includes",
        containss: "$includes",
        startswith: "$startsWith",
        endswith: "$endsWith",
        null: "$null",
        nnull: "$notNull",
        between: "$between",
        nbetween: "$notBetween",
      };

      const operator = operatorMap[filter.operator] ?? "$eq";
      return [{ [filter.field]: { [operator]: filter.value } }];
    }

    const value = toNocoBaseFilter(filter.value as GetListParams["filters"]);
    return value ? [{ [`$${filter.operator}`]: value.$and ?? [value] }] : [];
  });

  if (!filterItems.length) return undefined;
  return filterItems.length === 1 ? filterItems[0] : { $and: filterItems };
};

const buildUrl = (
  resource: string,
  action: string,
  query: Record<string, string | number | undefined> = {},
  meta?: NocoBaseMeta,
) => {
  const endpoint = `${API_URL.replace(/\/$/, "")}/${resource}:${action}`;
  const url = endpoint.startsWith("http://") || endpoint.startsWith("https://")
    ? new URL(endpoint)
    : new URL(endpoint, window.location.origin);

  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }

  meta?.appends?.forEach((append) => url.searchParams.append("appends[]", append));
  if (Array.isArray(meta?.fields)) {
    meta.fields
      .filter((field): field is string => typeof field === "string")
      .forEach((field) => url.searchParams.append("fields[]", field));
  }

  return url;
};

const request = async <T>(
  resource: string,
  action: string,
  options: {
    method?: "GET" | "POST";
    query?: Record<string, string | number | undefined>;
    body?: unknown;
    meta?: NocoBaseMeta;
    unwrapData?: boolean;
  } = {},
): Promise<T> => {
  const token = getToken(options.meta);
  const response = await fetch(buildUrl(resource, action, options.query, options.meta), {
    method: options.method ?? "GET",
    headers: getNocoBaseHeaders({
      token,
      includeContentType: Boolean(options.body),
    }),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => undefined);
  if (!response.ok) {
    throw new Error(
      payload?.errors?.[0]?.message ?? payload?.message ?? `NocoBase request failed (${response.status})`,
    );
  }

  // Most NocoBase resource actions return their record in `data`. List endpoints
  // can also return `{ data: [...], meta: { count } }`, which must stay intact.
  return (options.unwrapData === false ? payload : payload?.data ?? payload) as T;
};

export const dataProvider: DataProvider = {
  async getList<TData extends BaseRecord = BaseRecord>({
    resource,
    pagination,
    sorters,
    filters,
    meta,
  }: GetListParams): Promise<GetListResponse<TData>> {
    const page = pagination?.currentPage ?? 1;
    const pageSize = pagination?.pageSize ?? 10;
    const filter = toNocoBaseFilter(filters);
    const sort = sorters?.map((sorter) => `${sorter.order === "desc" ? "-" : ""}${sorter.field}`);
    const response = await request<NocoBaseListResponse<TData>>(resource, "list", {
      query: {
        page,
        pageSize,
        ...(filter ? { filter: JSON.stringify(filter) } : {}),
        ...(sort?.length ? { sort: sort.join(",") } : {}),
      },
      meta,
      unwrapData: false,
    });

    const list = Array.isArray(response.data)
      ? { rows: response.data, count: response.meta?.count }
      : response.data ?? response;

    return {
      data: list.rows ?? [],
      total: list.count ?? list.rows?.length ?? 0,
    };
  },

  async getOne<TData extends BaseRecord = BaseRecord>({ resource, id, meta }: GetOneParams): Promise<GetOneResponse<TData>> {
    return { data: await request<TData>(resource, "get", { query: { filterByTk: id }, meta }) };
  },

  async getMany<TData extends BaseRecord = BaseRecord>({ resource, ids, meta }: GetManyParams): Promise<GetManyResponse<TData>> {
    const data = await Promise.all(
      ids.map((id) => request<TData>(resource, "get", { query: { filterByTk: id }, meta })),
    );
    return { data };
  },

  async create<TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, variables, meta }: CreateParams<TVariables>): Promise<CreateResponse<TData>> {
    return { data: await request<TData>(resource, "create", { method: "POST", body: variables, meta }) };
  },

  async createMany<TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, variables, meta }: CreateManyParams<TVariables>): Promise<CreateManyResponse<TData>> {
    const data = await Promise.all(
      variables.map((values) => request<TData>(resource, "create", { method: "POST", body: values, meta })),
    );
    return { data };
  },

  async update<TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id, variables, meta }: UpdateParams<TVariables>): Promise<UpdateResponse<TData>> {
    return {
      data: await request<TData>(resource, "update", {
        method: "POST",
        query: { filterByTk: id },
        body: variables,
        meta,
      }),
    };
  },

  async updateMany<TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, ids, variables, meta }: UpdateManyParams<TVariables>): Promise<UpdateManyResponse<TData>> {
    const data = await Promise.all(
      ids.map((id) => request<TData>(resource, "update", {
        method: "POST",
        query: { filterByTk: id },
        body: variables,
        meta,
      })),
    );
    return { data };
  },

  async deleteOne<TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, id, meta }: DeleteOneParams<TVariables>): Promise<DeleteOneResponse<TData>> {
    return { data: await request<TData>(resource, "destroy", { method: "POST", query: { filterByTk: id }, meta }) };
  },

  async deleteMany<TData extends BaseRecord = BaseRecord, TVariables = {}>({ resource, ids, meta }: DeleteManyParams<TVariables>): Promise<DeleteManyResponse<TData>> {
    const data = await Promise.all(
      ids.map((id) => request<TData>(resource, "destroy", { method: "POST", query: { filterByTk: id }, meta })),
    );
    return { data };
  },

  getApiUrl: () => API_URL,
};
