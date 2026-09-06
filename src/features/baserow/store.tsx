"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from "react";

import {
  convertFieldValue,
  createEmptyRow,
  createStarterTable,
  emptyCellValue,
  normalizeCellValue,
  uid,
  SEED_TABLES,
  type BaserowField,
  type BaserowRow,
  type BaserowTable,
  type SelectChoice,
} from "./model";

const STORAGE_KEY = "portal.baserow.v1";

interface PersistedState {
  version: 1;
  activeTableId: string | null;
  tables: BaserowTable[];
}

export type BaserowState = PersistedState;

export type UpdateFieldPatch = Partial<Omit<BaserowField, "id">>;

export type BaserowAction =
  | { type: "selectTable"; tableId: string }
  | { type: "addTable"; name?: string }
  | { type: "renameTable"; tableId: string; name: string }
  | { type: "deleteTable"; tableId: string }
  | { type: "updateCell"; tableId: string; rowId: string; fieldId: string; raw: unknown }
  | { type: "addRow"; tableId: string; aboveRowId?: string; row?: BaserowRow }
  | { type: "duplicateRow"; tableId: string; rowId: string }
  | { type: "deleteRows"; tableId: string; rowIds: string[] }
  | { type: "addField"; tableId: string; afterFieldId?: string; base?: Partial<BaserowField> }
  | { type: "updateField"; tableId: string; fieldId: string; patch: UpdateFieldPatch }
  | { type: "resizeField"; tableId: string; fieldId: string; width: number }
  | { type: "moveField"; tableId: string; fieldId: string; direction: -1 | 1 }
  | { type: "deleteField"; tableId: string; fieldId: string }
  | { type: "resetToSeed" };

function loadInitial(): BaserowState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.tables) && parsed.tables.length > 0) {
        const ids = new Set(parsed.tables.map((table) => table.id));
        return {
          version: 1,
          activeTableId:
            parsed.activeTableId && ids.has(parsed.activeTableId) ? parsed.activeTableId : parsed.tables[0].id,
          tables: parsed.tables,
        };
      }
    }
  } catch {
    // Corrupt storage falls through to seed data.
  }
  return { version: 1, activeTableId: SEED_TABLES[0].id, tables: SEED_TABLES };
}

function mapTable(
  state: BaserowState,
  tableId: string,
  updater: (table: BaserowTable) => BaserowTable,
): BaserowState {
  return { ...state, tables: state.tables.map((table) => (table.id === tableId ? updater(table) : table)) };
}

/** Provide sensible choice sets when a plain field converts into a select. */
function choicesForType(type: BaserowField["type"], inherited?: SelectChoice[]): SelectChoice[] | undefined {
  if (type !== "singleSelect" && type !== "multiSelect") return undefined;
  if (inherited && inherited.length > 0) return inherited.map((item) => ({ ...item }));
  return [
    { id: uid("c"), name: "选项一", color: "blue" },
    { id: uid("c"), name: "选项二", color: "green" },
    { id: uid("c"), name: "选项三", color: "orange" },
  ];
}

export function baserowReducer(state: BaserowState, action: BaserowAction): BaserowState {
  switch (action.type) {
    case "selectTable":
      return state.tables.some((table) => table.id === action.tableId)
        ? { ...state, activeTableId: action.tableId }
        : state;
    case "addTable": {
      const table = createStarterTable(action.name?.trim() || `数据表 ${state.tables.length + 1}`);
      const seeded = { ...table, rows: [createEmptyRow(table.fields)] };
      return { ...state, tables: [...state.tables, seeded], activeTableId: table.id };
    }
    case "renameTable":
      return mapTable(state, action.tableId, (table) => ({ ...table, name: action.name.trim() || table.name }));
    case "deleteTable": {
      if (state.tables.length <= 1) return state;
      const tables = state.tables.filter((table) => table.id !== action.tableId);
      return {
        ...state,
        tables,
        activeTableId: state.activeTableId === action.tableId ? tables[0].id : state.activeTableId,
      };
    }
    case "updateCell":
      return mapTable(state, action.tableId, (table) => {
        const target = table.fields.find((item) => item.id === action.fieldId);
        if (!target) return table;
        const rows = table.rows.map((row) =>
          row.id === action.rowId
            ? { ...row, cells: { ...row.cells, [target.id]: normalizeCellValue(target, action.raw) } }
            : row,
        );
        return { ...table, rows };
      });
    case "addRow":
      return mapTable(state, action.tableId, (table) => {
        const fresh = action.row ?? createEmptyRow(table.fields);
        const index = action.aboveRowId
          ? table.rows.findIndex((row) => row.id === action.aboveRowId)
          : -1;
        const rows = index < 0
          ? [...table.rows, fresh]
          : [...table.rows.slice(0, index), fresh, ...table.rows.slice(index)];
        return { ...table, rows };
      });
    case "duplicateRow":
      return mapTable(state, action.tableId, (table) => {
        const sourceIndex = table.rows.findIndex((row) => row.id === action.rowId);
        if (sourceIndex < 0) return table;
        const copy: BaserowRow = { id: uid("r"), cells: { ...table.rows[sourceIndex].cells } };
        return {
          ...table,
          rows: [...table.rows.slice(0, sourceIndex + 1), copy, ...table.rows.slice(sourceIndex + 1)],
        };
      });
    case "deleteRows": {
      const removal = new Set(action.rowIds);
      return mapTable(state, action.tableId, (table) => ({
        ...table,
        rows: table.rows.filter((row) => !removal.has(row.id)),
      }));
    }
    case "addField":
      return mapTable(state, action.tableId, (table) => {
        const declaredType = action.base?.type ?? "text";
        const fresh: BaserowField = {
          ...(action.base ?? {}),
          id: action.base?.id ?? uid("f"),
          name: action.base?.name?.trim() || "字段",
          type: declaredType,
          width: action.base?.width ?? 180,
        };
        const preparedRows = table.rows.map((row) => ({
          ...row,
          cells: { ...row.cells, [fresh.id]: emptyCellValue(fresh) },
        }));
        const index = action.afterFieldId
          ? table.fields.findIndex((item) => item.id === action.afterFieldId)
          : -1;
        const fields = index < 0
          ? [...table.fields, fresh]
          : [...table.fields.slice(0, index + 1), fresh, ...table.fields.slice(index + 1)];
        return { ...table, fields, rows: preparedRows };
      });
    case "updateField":
      return mapTable(state, action.tableId, (table) => {
        const previous = table.fields.find((item) => item.id === action.fieldId);
        if (!previous) return table;
        const next: BaserowField = { ...previous, ...action.patch, id: previous.id };
        let rows = table.rows;
        if (action.patch.type && action.patch.type !== previous.type) {
          next.choices = choicesForType(
            next.type,
            next.choices && next.choices.length > 0 ? next.choices : previous.choices,
          );
          next.ratingMax = next.ratingMax ?? 5;
          rows = table.rows.map((row) => ({
            ...row,
            cells: { ...row.cells, [next.id]: convertFieldValue(previous, next, row.cells[next.id] ?? null) },
          }));
        }
        if (next.type !== "singleSelect" && next.type !== "multiSelect") {
          delete next.choices;
        }
        return {
          ...table,
          fields: table.fields.map((item) => (item.id === action.fieldId ? next : item)),
          rows,
        };
      });
    case "resizeField": {
      const clamped = Math.min(Math.max(Math.round(action.width), 80), 640);
      return mapTable(state, action.tableId, (table) => ({
        ...table,
        fields: table.fields.map((item) => (item.id === action.fieldId ? { ...item, width: clamped } : item)),
      }));
    }
    case "moveField":
      return mapTable(state, action.tableId, (table) => {
        const index = table.fields.findIndex((item) => item.id === action.fieldId);
        const target = index + action.direction;
        if (index < 0 || target < 0 || target >= table.fields.length) return table;
        const fields = [...table.fields];
        [fields[index], fields[target]] = [fields[target], fields[index]];
        return { ...table, fields };
      });
    case "deleteField":
      return mapTable(state, action.tableId, (table) => ({
        ...table,
        fields: table.fields.filter((item) => item.id !== action.fieldId),
        rows: table.rows.map((row) => {
          if (!(action.fieldId in row.cells)) return row;
          const cells = { ...row.cells };
          delete cells[action.fieldId];
          return { ...row, cells };
        }),
      }));
    case "resetToSeed":
      return { version: 1, activeTableId: SEED_TABLES[0].id, tables: SEED_TABLES };
  }
}

interface BaserowContextValue {
  state: BaserowState;
  dispatch: Dispatch<BaserowAction>;
  activeTable: BaserowTable | null;
}

const BaserowContext = createContext<BaserowContextValue | null>(null);

export function BaserowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(baserowReducer, undefined, loadInitial);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        // Storage quota errors must never break rendering.
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [state]);

  const value = useMemo<BaserowContextValue>(() => {
    const activeTable =
      state.tables.find((table) => table.id === state.activeTableId) ?? state.tables[0] ?? null;
    return { state, dispatch, activeTable };
  }, [state]);

  return <BaserowContext.Provider value={value}>{children}</BaserowContext.Provider>;
}

export function useBaserow(): BaserowContextValue {
  const context = useContext(BaserowContext);
  if (!context) throw new Error("useBaserow must be used inside a BaserowProvider");
  return context;
}
