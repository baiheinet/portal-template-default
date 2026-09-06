/**
 * Baserow-style grid data model.
 *
 * Pure domain logic: field types, cell values, filtering, sorting,
 * search and CSV serialization. Kept free of React so it can be unit
 * tested without a DOM.
 */

export type BaserowFieldType =
  | "text"
  | "longText"
  | "number"
  | "singleSelect"
  | "multiSelect"
  | "date"
  | "boolean"
  | "rating";

export type ChipColor =
  | "blue"
  | "green"
  | "yellow"
  | "red"
  | "orange"
  | "purple"
  | "teal"
  | "slate";

export interface SelectChoice {
  id: string;
  name: string;
  color: ChipColor;
}

export interface BaserowField {
  id: string;
  name: string;
  type: BaserowFieldType;
  width: number;
  /** Choices for singleSelect / multiSelect fields. */
  choices?: SelectChoice[];
  /** Maximum star count for rating fields. */
  ratingMax?: number;
}

/** Text, number, boolean, ISO date or multi-choice ids. */
export type CellValue = string | number | boolean | null | string[];

export interface BaserowRow {
  id: string;
  cells: Record<string, CellValue>;
}

export type TableIconName = "users" | "tasks" | "table";

export interface BaserowTable {
  id: string;
  name: string;
  icon: TableIconName;
  fields: BaserowField[];
  rows: BaserowRow[];
}

export type FilterOperator =
  | "contains"
  | "notContains"
  | "equal"
  | "notEqual"
  | "higherThan"
  | "lowerThan"
  | "before"
  | "after"
  | "hasAnyOf"
  | "hasNoneOf"
  | "checked"
  | "notChecked"
  | "empty"
  | "notEmpty";

export interface FilterItem {
  fieldId: string;
  op: FilterOperator;
  value: string;
}

export type FilterGroupOperator = "and" | "or";

export interface SortSpec {
  fieldId: string;
  direction: "asc" | "desc";
}

export type RowHeight = "compact" | "regular" | "tall";

export interface ViewPrefs {
  search: string;
  groupOperator: FilterGroupOperator;
  filters: FilterItem[];
  sorts: SortSpec[];
  hiddenFieldIds: string[];
  rowHeight: RowHeight;
}

export const DEFAULT_VIEW_PREFS: ViewPrefs = {
  search: "",
  groupOperator: "and",
  filters: [],
  sorts: [],
  hiddenFieldIds: [],
  rowHeight: "regular",
};

/* ------------------------------------------------------------------ */
/* Field metadata                                                      */
/* ------------------------------------------------------------------ */

export const FIELD_TYPE_LABELS: Record<BaserowFieldType, string> = {
  text: "文本",
  longText: "长文本",
  number: "数字",
  singleSelect: "单选",
  multiSelect: "多选",
  date: "日期",
  boolean: "复选框",
  rating: "评分",
};

export const ALL_FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as BaserowFieldType[];

const TEXTUAL_TYPES: BaserowFieldType[] = ["text", "longText"];

export function isSelectType(type: BaserowFieldType): boolean {
  return type === "singleSelect" || type === "multiSelect";
}

export function filterOperatorsFor(type: BaserowFieldType): FilterOperator[] {
  switch (type) {
    case "text":
    case "longText":
      return ["contains", "notContains", "equal", "notEqual", "empty", "notEmpty"];
    case "number":
      return ["equal", "notEqual", "higherThan", "lowerThan", "empty", "notEmpty"];
    case "rating":
      return ["higherThan", "lowerThan", "equal", "empty", "notEmpty"];
    case "date":
      return ["equal", "before", "after", "empty", "notEmpty"];
    case "boolean":
      return ["checked", "notChecked"];
    case "singleSelect":
    case "multiSelect":
      return ["hasAnyOf", "hasNoneOf", "empty", "notEmpty"];
  }
}

export const FILTER_OP_LABELS: Record<FilterOperator, string> = {
  contains: "包含",
  notContains: "不包含",
  equal: "等于",
  notEqual: "不等于",
  higherThan: "高于",
  lowerThan: "低于",
  before: "早于",
  after: "晚于",
  hasAnyOf: "包含任一选项",
  hasNoneOf: "不含任何选项",
  checked: "已勾选",
  notChecked: "未勾选",
  empty: "为空",
  notEmpty: "不为空",
};

const VALUELESS_OPS = new Set<FilterOperator>(["empty", "notEmpty", "checked", "notChecked"]);

export function filterOpNeedsValue(op: FilterOperator): boolean {
  return !VALUELESS_OPS.has(op);
}

/* ------------------------------------------------------------------ */
/* Cell helpers                                                        */
/* ------------------------------------------------------------------ */

export function emptyCellValue(field: BaserowField): CellValue {
  switch (field.type) {
    case "multiSelect":
      return [];
    case "boolean":
      return false;
    case "rating":
      return 0;
    default:
      return null;
  }
}

let uidCounter = 0;

export function uid(prefix: string): string {
  uidCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${uidCounter.toString(36)}`;
}

export function getChoice(field: BaserowField, choiceId: string): SelectChoice | undefined {
  return field.choices?.find((choice) => choice.id === choiceId);
}

/** Human readable text for a cell (also used by search + CSV). */
export function displayCell(field: BaserowField, value: CellValue): string {
  if (value === null || value === undefined) return "";
  switch (field.type) {
    case "multiSelect":
      return (Array.isArray(value) ? value : [])
        .map((id) => getChoice(field, id)?.name ?? String(id))
        .join(", ");
    case "singleSelect":
      return typeof value === "string" ? (getChoice(field, value)?.name ?? value) : "";
    case "boolean":
      return value === true ? "是" : "否";
    case "rating":
      return typeof value === "number" && value > 0 ? "★".repeat(value) : "";
    default:
      return String(value);
  }
}

/** Coerce arbitrary editor input into a valid cell value. */
export function normalizeCellValue(field: BaserowField, raw: unknown): CellValue {
  switch (field.type) {
    case "text":
    case "longText": {
      const text = raw === null || raw === undefined ? "" : String(raw).trim();
      return text.length > 0 ? text : null;
    }
    case "number": {
      if (raw === null || raw === undefined || raw === "") return null;
      const numeric = Number(String(raw).replace(/[,，\s]/g, ""));
      return Number.isFinite(numeric) ? numeric : null;
    }
    case "date": {
      const iso = raw === null || raw === undefined ? "" : String(raw).slice(0, 10);
      return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null;
    }
    case "boolean":
      return raw === true || raw === "true" || raw === 1;
    case "rating": {
      const max = field.ratingMax ?? 5;
      const rating = Math.round(Number(raw));
      return Number.isFinite(rating) ? Math.min(Math.max(rating, 0), max) : 0;
    }
    case "singleSelect": {
      const id = raw === null || raw === undefined ? "" : String(raw);
      return id.length > 0 && field.choices?.some((c) => c.id === id) ? id : null;
    }
    case "multiSelect": {
      const list = Array.isArray(raw) ? raw : [];
      const allowed = new Set((field.choices ?? []).map((c) => c.id));
      return list.map(String).filter((id) => allowed.has(id));
    }
  }
}

function parseNumberLoose(text: string): number | null {
  const numeric = Number(text.replace(/[^\d.eE+-]/g, ""));
  return Number.isFinite(numeric) ? numeric : null;
}

interface ChoiceProvider { choices?: SelectChoice[] }

/** Convert a cell value when a field changes type (best effort). */
export function convertFieldValue(
  sourceField: BaserowField,
  targetField: BaserowField,
  value: CellValue,
): CellValue {
  if (value === null) return normalizeCellValue(targetField, null);
  switch (targetField.type) {
    case "longText":
    case "text": {
      if (Array.isArray(value)) return value.map((id) => resolveChoiceName(sourceField, id)).filter(Boolean).join(", ") || null;
      if (typeof value === "boolean") return value ? "是" : null;
      if (sourceField.type === "singleSelect") return resolveChoiceName(sourceField, String(value)) ?? null;
      return normalizeCellValue(targetField, String(value));
    }
    case "number": {
      if (typeof value === "number") return normalizeCellValue(targetField, value);
      if (typeof value === "boolean") return value ? 1 : 0;
      if (typeof value === "string") return parseNumberLoose(value);
      return null;
    }
    case "rating": {
      const parsed = targetField.type === "rating" ? typeof value === "string" ? parseNumberLoose(value) : Number(value) : null;
      if (parsed === null || !Number.isFinite(parsed)) return normalizeCellValue(targetField, 0);
      return normalizeCellValue(targetField, parsed);
    }
    case "boolean":
      return normalizeCellValue(targetField, typeof value === "string" ? parseNumberLoose(value) : value);
    case "date": {
      const text = typeof value === "string" ? value.slice(0, 10) : "";
      return normalizeCellValue(targetField, /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null);
    }
    case "singleSelect": {
      const nameCandidates = Array.isArray(value)
        ? value.map((id) => resolveChoiceName(sourceField, id)).filter((name): name is string => name !== null && name.length > 0)
        : [resolveChoiceName(sourceField, String(value)) ?? String(value)];
      const match = matchChoicesByName(targetField.choices ?? [], nameCandidates)[0];
      return match ?? null;
    }
    case "multiSelect": {
      const nameCandidates = Array.isArray(value)
        ? value.map((id) => resolveChoiceName(sourceField, id)).filter((name): name is string => name !== null && name.length > 0)
        : displayCellValue(sourceField, value).split(",").map((part) => part.trim()).filter((name) => name.length > 0);
      return matchChoicesByName(targetField.choices ?? [], nameCandidates);
    }
  }
}

function resolveChoiceName(field: ChoiceProvider, choiceId: string): string | null {
  return field.choices?.find((choice) => choice.id === choiceId)?.name ?? null;
}

function matchChoicesByName(choices: SelectChoice[], names: string[]): string[] {
  const lowered = names.map((name) => name.toLowerCase());
  return choices.filter((choice) => lowered.includes(choice.name.toLowerCase())).map((choice) => choice.id);
}

function displayCellValue(field: ChoiceProvider & { type: BaserowFieldType }, value: CellValue): string {
  // Internal reuse of displayCell without circular typing constraints.
  return displayCell({ ...field, width: 0 } as BaserowField, value);
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

export interface FilterContext { fields: BaserowField[] }

export function matchesFilter(ctx: FilterContext, row: BaserowRow, filter: FilterItem): boolean {
  const field = ctx.fields.find((item) => item.id === filter.fieldId);
  if (!field) return true;
  const value = row.cells[field.id] ?? emptyCellValue(field);

  switch (filter.op) {
    case "empty":
      return isEmptyValue(field, value);
    case "notEmpty":
      return !isEmptyValue(field, value);
    case "checked":
      return value === true;
    case "notChecked":
      return value !== true;
    default:
      break;
  }

  const needle = filter.value.trim().toLowerCase();

  switch (field.type) {
    case "number":
    case "rating": {
      const target = parseNumberLoose(filter.value);
      const current = typeof value === "number" ? value : null;
      if (target === null || current === null) return false;
      switch (filter.op) {
        case "equal": return current === target;
        case "notEqual": return current !== target;
        case "higherThan": return current > target;
        case "lowerThan": return current < target;
        default: return false;
      }
    }
    case "singleSelect": {
      const name = (displayCell(field, value) || "").toLowerCase();
      switch (filter.op) {
        case "contains": return name.includes(needle);
        case "notContains": return !name.includes(needle);
        case "equal": return name === needle;
        case "notEqual": return name !== needle;
        default: return false;
      }
    }
    case "multiSelect": {
      const names = Array.isArray(value)
        ? value.map((id) => (getChoice(field, id)?.name ?? id).toLowerCase())
        : [];
      const wanted = needle.split(/[,，]/).map((part) => part.trim()).filter(Boolean);
      switch (filter.op) {
        case "hasAnyOf": return wanted.some((want) => names.includes(want));
        case "hasNoneOf": return !wanted.some((want) => names.includes(want));
        default: return false;
      }
    }
    case "boolean":
      return true;
    default: {
      const text = (displayCell(field, value) || "").toLowerCase();
      switch (filter.op) {
        case "contains": return text.includes(needle);
        case "notContains": return !text.includes(needle);
        case "equal":
        case "before":
        case "after": return compareText(field.type, text, needle, filter.op);
        case "notEqual": return text !== needle;
        default: return false;
      }
    }
  }
}

function compareText(type: BaserowFieldType, text: string, needle: string, op: FilterOperator): boolean {
  if (type === "date") {
    if (!text) return false;
    if (op === "before") return text < needle;
    if (op === "after") return text > needle;
    return text === needle;
  }
  return text === needle;
}

function isEmptyValue(field: BaserowField, value: CellValue): boolean {
  switch (field.type) {
    case "boolean":
      return false;
    case "multiSelect":
      return !Array.isArray(value) || value.length === 0;
    case "rating":
      return !(typeof value === "number" && value > 0);
    default:
      return value === null || value === undefined || value === "";
  }
}

export function matchesFilters(
  ctx: FilterContext,
  row: BaserowRow,
  prefs: Pick<ViewPrefs, "filters" | "groupOperator">,
): boolean {
  if (prefs.filters.length === 0) return true;
  const results = prefs.filters.map((filter) => matchesFilter(ctx, row, filter));
  return prefs.groupOperator === "and" ? results.every(Boolean) : results.some(Boolean);
}

export function matchesSearch(row: BaserowRow, fields: BaserowField[], query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return true;
  return fields.some((field) => (displayCell(field, row.cells[field.id] ?? null) || "").toLowerCase().includes(needle));
}

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

export function applySorts<T extends BaserowRow>(rows: T[], ctx: FilterContext, sorts: SortSpec[]): T[] {
  const active = sorts.filter((sort) => ctx.fields.some((field) => field.id === sort.fieldId));
  if (active.length === 0) return [...rows];
  const ranked = rows.map((row, index) => ({ row, index }));
  for (const sort of [...active].reverse()) {
    const field = ctx.fields.find((item) => item.id === sort.fieldId)!;
    const factor = sort.direction === "asc" ? 1 : -1;
    ranked.sort((left, right) => {
      const leftValue = left.row.cells[field.id] ?? null;
      const rightValue = right.row.cells[field.id] ?? null;
      // Empties always sink to the visual bottom, independent of direction.
      const leftEmpty = isEmptyValue(field, leftValue);
      const rightEmpty = isEmptyValue(field, rightValue);
      if (leftEmpty !== rightEmpty) return leftEmpty ? 1 : -1;
      if (leftEmpty && rightEmpty) return left.index - right.index;
      const result = compareCells(field, leftValue, rightValue);
      if (result !== 0) return factor * result;
      return left.index - right.index;
    });
  }
  return ranked.map((entry) => entry.row);
}

function compareCells(field: BaserowField, left: CellValue, right: CellValue): number {
  const leftEmpty = isEmptyValue(field, left);
  const rightEmpty = isEmptyValue(field, right);
  if (leftEmpty && rightEmpty) return 0;
  if (leftEmpty) return 1; // empties always sink to the visual bottom.
  if (rightEmpty) return -1;
  if (field.type === "number" || field.type === "rating") {
    return (Number(left) || 0) - (Number(right) || 0);
  }
  if (isSelectType(field.type)) {
    const leftNames = Array.isArray(left)
      ? left.map((id) => (getChoice(field, id)?.name ?? id)).join(", ")
      : String(displayCell(field, left));
    const rightNames = Array.isArray(right)
      ? right.map((id) => (getChoice(field, id)?.name ?? id)).join(", ")
      : String(displayCell(field, right));
    return leftNames.localeCompare(rightNames, "zh-Hans-CN");
  }
  if (typeof left === "boolean" && typeof right === "boolean") {
    return Number(left) - Number(right);
  }
  return String(displayCell(field, left)).localeCompare(String(displayCell(field, right)), "zh-Hans-CN");
}

/* ------------------------------------------------------------------ */
/* View pipeline                                                       */
/* ------------------------------------------------------------------ */

export function visibleFields(table: BaserowTable, hiddenFieldIds: string[]): BaserowField[] {
  const hidden = new Set(hiddenFieldIds);
  return table.fields.filter((field) => !hidden.has(field.id));
}

export interface VisibleRow extends BaserowRow {
  /** Index in the table's unfiltered row list. */
  sourceIndex: number;
}

export function selectVisibleRows(table: BaserowTable, prefs: ViewPrefs): VisibleRow[] {
  const ctx: FilterContext = { fields: table.fields };
  const indexed = table.rows.map((row, sourceIndex) => ({ ...row, sourceIndex }));
  const filtered = indexed.filter(
    (row) => matchesSearch(row, table.fields, prefs.search) && matchesFilters(ctx, row, prefs),
  );
  return applySorts(filtered, ctx, prefs.sorts);
}

/* ------------------------------------------------------------------ */
/* CSV export                                                          */
/* ------------------------------------------------------------------ */

function csvEscape(text: string): string {
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}`;
  }
  return text;
}

export function buildCsv(_table: BaserowTable, fields: BaserowField[], rows: BaserowRow[]): string {
  void _table; // Kept for call-site readability; CSV currently spans visible fields only.
  const headerLine = fields.map((field) => csvEscape(field.name)).join(",");
  const lines = rows.map((row) => fields.map((field) => csvEscape(displayCell(field, row.cells[field.id] ?? null))).join(","));
  return [headerLine, ...lines].join("\r\n");
}

/* ------------------------------------------------------------------ */
/* Seed data                                                           */
/* ------------------------------------------------------------------ */

interface SeedChoiceSet {
  stage: SelectChoice[];
  tags: SelectChoice[];
  status: SelectChoice[];
  priority: SelectChoice[];
}

const SEED_CHOICES: SeedChoiceSet = {
  stage: [
    choice("stage-lead", "线索", "slate"),
    choice("stage-opportunity", "商机", "blue"),
    choice("stage-negotiating", "谈判", "yellow"),
    choice("stage-won", "赢单", "green"),
    choice("stage-lost", "输单", "red"),
  ],
  tags: [
    choice("tag-key", "重点客户", "purple"),
    choice("tag-renewal", "续约", "teal"),
    choice("tag-demo", "演示完成", "blue"),
    choice("tag-price", "价格敏感", "orange"),
  ],
  status: [
    choice("status-todo", "待办", "slate"),
    choice("status-doing", "进行中", "blue"),
    choice("status-blocked", "阻塞", "red"),
    choice("status-done", "已完成", "green"),
  ],
  priority: [
    choice("priority-p0", "P0 紧急", "red"),
    choice("priority-p1", "P1 重要", "orange"),
    choice("priority-p2", "P2 普通", "slate"),
  ],
};

function choice(id: string, name: string, color: ChipColor): SelectChoice {
  return { id, name, color };
}

const CRM_FIELDS: BaserowField[] = [
  text("f-company", "公司", 190),
  select("f-stage", "阶段", "singleSelect", SEED_CHOICES.stage, 140),
  text("f-contact", "联系人", 120),
  field("f-email", "邮箱", "text", 200),
  field("f-amount", "合同金额", "number", 130),
  field("f-followup", "下次跟进", "date", 140),
  field("f-vip", "重要客户", "boolean", 100),
  ratingField("f-satisfaction", "满意度"),
  select("f-tags", "标签", "multiSelect", SEED_CHOICES.tags, 220),
  field("f-note", "跟进记录", "longText", 280),
];

const TASK_FIELDS: BaserowField[] = [
  text("t-name", "任务名称", 240),
  field("t-owner", "负责人", "text", 110),
  select("t-status", "状态", "singleSelect", SEED_CHOICES.status, 130),
  select("t-priority", "优先级", "singleSelect", SEED_CHOICES.priority, 140),
  field("t-due", "截止日期", "date", 130),
  field("t-hours", "预估工时", "number", 110),
  field("t-done", "完成", "boolean", 90),
  field("t-desc", "描述", "longText", 300),
];

function field(id: string, name: string, type: BaserowField["type"], width: number): BaserowField {
  return { id, name, type, width };
}

function text(id: string, name: string, width: number): BaserowField {
  return field(id, name, "text", width);
}

function select(id: string, name: string, type: "singleSelect" | "multiSelect", choices: SelectChoice[], width: number): BaserowField {
  return { ...field(id, name, type, width), choices };
}

function ratingField(id: string, name: string): BaserowField {
  return { ...field(id, name, "rating", 150), ratingMax: 5 };
}

function row(id: string, cells: Record<string, CellValue>): BaserowRow {
  return { id, cells };
}

const CRM_ROWS: BaserowRow[] = [
  row("r-1", { "f-company": "北方智造集团", "f-stage": "stage-opportunity", "f-contact": "沈总", "f-email": "shen@northmfg.cn", "f-amount": 1280000, "f-followup": "2025-07-02", "f-vip": true, "f-satisfaction": 4, "f-tags": ["tag-key", "tag-demo"], "f-note": "已完成二期产线调研，等待报价确认。" }),
  row("r-2", { "f-company": "蓝湾物流", "f-stage": "stage-negotiating", "f-contact": "林经理", "f-email": "lin@bluebay-log.com", "f-amount": 640000, "f-followup": "2025-06-28", "f-vip": false, "f-satisfaction": 3, "f-tags": ["tag-price"], "f-note": "对运输模块报价敏感，需提供分期方案。" }),
  row("r-3", { "f-company": "星辰半导体", "f-stage": "stage-lead", "f-contact": "周工", "f-email": "zhou@starsemi.com", "f-amount": null, "f-followup": "2025-08-15", "f-vip": true, "f-satisfaction": 5, "f-tags": ["tag-key"], "f-note": null }),
  row("r-4", { "f-company": "恒信金融", "f-stage": "stage-won", "f-contact": "吴女士", "f-email": "wu@hengxin-fin.cn", "f-amount": 920000, "f-followup": "2025-09-01", "f-vip": true, "f-satisfaction": 5, "f-tags": ["tag-key", "tag-renewal"], "f-note": "一期已验收，开始谈风控模块续约。" }),
  row("r-5", { "f-company": "青山能源", "f-stage": "stage-opportunity", "f-contact": "郑总", "f-email": "zheng@greenhill-energy.com", "f-amount": 430000, "f-followup": "2025-07-11", "f-vip": false, "f-satisfaction": 2, "f-tags": ["tag-demo"], "f-note": "演示后反馈报表性能待优化。" }),
  row("r-6", { "f-company": "天启零售", "f-stage": "stage-lost", "f-contact": "马店长", "f-email": "ma@skyretail.cn", "f-amount": 210000, "f-followup": null, "f-vip": false, "f-satisfaction": 1, "f-tags": [], "f-note": "预算削减，项目搁置至明年。" }),
  row("r-7", { "f-company": "云帆教育", "f-stage": "stage-lead", "f-contact": null, "f-email": null, "f-amount": null, "f-followup": "2025-07-20", "f-vip": false, "f-satisfaction": 0, "f-tags": ["tag-price"], "f-note": null }),
  row("r-8", { "f-company": "华曜医疗", "f-stage": "stage-negotiating", "f-contact": "高主任", "f-email": "gao@huayao-med.cn", "f-amount": 1550000, "f-followup": "2025-06-30", "f-vip": true, "f-satisfaction": 4, "f-tags": ["tag-key", "tag-renewal", "tag-demo"], "f-note": "合规评审中，法务条款待更新。" }),
];

const TASK_ROWS: BaserowRow[] = [
  row("k-1", { "t-name": "整理二季度销售复盘数据", "t-owner": "小舟", "t-status": "status-doing", "t-priority": "priority-p1", "t-due": "2025-07-05", "t-hours": 12, "t-done": false, "t-desc": "汇总 CRM 与财务口径差异并输出图表。" }),
  row("k-2", { "t-name": "新版网格组件联调", "t-owner": "阿珂", "t-status": "status-blocked", "t-priority": "priority-p0", "t-due": "2025-06-27", "t-hours": 30, "t-done": false, "t-desc": "键盘导航与原生日期输入冲突，待排期修复。" }),
  row("k-3", { "t-name": "发布 v2.3 更新日志", "t-owner": "大白", "t-status": "status-todo", "t-priority": "priority-p2", "t-due": "2025-07-18", "t-hours": 4, "t-done": false, "t-desc": null }),
  row("k-4", { "t-name": "迁移演示环境数据库", "t-owner": "小舟", "t-status": "status-done", "t-priority": "priority-p1", "t-due": "2025-06-21", "t-hours": 8, "t-done": true, "t-desc": "旧实例已归档，DNS 切换完成。" }),
  row("k-5", { "t-name": "客服话术知识库扩充", "t-owner": "路遥", "t-status": "status-todo", "t-priority": "priority-p2", "t-due": "2025-07-25", "t-hours": 16, "t-done": false, "t-desc": "补充退款与发票相关问答模板。" }),
  row("k-6", { "t-name": "季度安全巡检", "t-owner": "老纪", "t-status": "status-doing", "t-priority": "priority-p0", "t-due": "2025-06-30", "t-hours": 24, "t-done": false, "t-desc": "依赖扫描结果评审时间暂定周四。" }),
];

export const SEED_TABLES: BaserowTable[] = [
  { id: "tbl-crm", name: "客户 CRM", icon: "users", fields: CRM_FIELDS, rows: CRM_ROWS },
  { id: "tbl-tasks", name: "项目任务板", icon: "tasks", fields: TASK_FIELDS, rows: TASK_ROWS },
];

export function createStarterTable(name: string): BaserowTable {
  return {
    id: uid("tbl"),
    name,
    icon: "table",
    fields: [
      text(uid("f"), "名称", 200),
      field(uid("f"), "备注", "longText", 260),
    ],
    rows: [],
  };
}

export function createNewField(afterType?: BaserowFieldType): BaserowField {
  const type: BaserowFieldType = afterType ?? "text";
  const base = field(uid("f"), FIELD_TYPE_LABELS[type], type, 180);
  if (isSelectType(base.type)) {
    return {
      ...base,
      choices: [
        choice(uid("c"), "选项一", "blue"),
        choice(uid("c"), "选项二", "green"),
        choice(uid("c"), "选项三", "orange"),
      ],
    };
  }
  return base;
}

export function createEmptyRow(fields: BaserowField[]): BaserowRow {
  const cells: Record<string, CellValue> = {};
  for (const f of fields) cells[f.id] = emptyCellValue(f);
  return row(uid("r"), cells);
}

// Re-exported for store/UI convenience.
export const TEXT_FIELD_TYPES = TEXTUAL_TYPES;