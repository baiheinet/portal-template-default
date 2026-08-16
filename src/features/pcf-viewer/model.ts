export type ViewerComponent = Record<string, any> & {
  type?: string;
  attributes?: Record<string, any>;
  endPoints?: Array<{ position: { x: number; y: number; z: number } }>;
};

export type ComponentSelection = ViewerComponent & {
  sourceFile: string;
  index: number;
};

export type ViewerFile = {
  filename: string;
  visible: boolean;
  components: ViewerComponent[];
};

export function getViewerFileExtension(filename: string): "pcf" | "idf" | null {
  const extension = filename.trim().toLowerCase().split(".").pop();
  return extension === "pcf" || extension === "idf" ? extension : null;
}

export function flattenVisibleComponents(files: ViewerFile[]): ComponentSelection[] {
  return files.flatMap((file) =>
    file.visible
      ? file.components.map((component, index) => ({ ...component, sourceFile: file.filename, index }))
      : [],
  );
}

export function summarizeSelection(items: ComponentSelection[]) {
  const byType: Record<string, number> = {};
  let totalLengthMm = 0;
  for (const item of items) {
    const type = item.type ?? "UNKNOWN";
    byType[type] = (byType[type] ?? 0) + 1;
    const declaredLength = Number(item.attributes?.length);
    if (Number.isFinite(declaredLength)) {
      totalLengthMm += declaredLength;
      continue;
    }
    const points = item.endPoints ?? [];
    if (points.length >= 2) {
      const [a, b] = points;
      totalLengthMm += Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y, a.position.z - b.position.z);
    }
  }
  return { count: items.length, totalLengthMm, byType };
}
