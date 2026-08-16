import { useCallback, useMemo, useRef, useState, type DragEvent } from "react";
import { Box, Check, Eye, Grid3X3, Loader2, MousePointer2, Upload, View } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { ComponentTree } from "@/features/pcf-viewer/component-tree";
import { FileList } from "@/features/pcf-viewer/file-list";
import { getViewerFileExtension, flattenVisibleComponents, type ComponentSelection, type ViewerFile } from "@/features/pcf-viewer/model";
import { PcfViewerCanvas } from "@/features/pcf-viewer/pcf-viewer-canvas";
import { PropertiesPanel } from "@/features/pcf-viewer/properties-panel";
// @ts-expect-error Upstream JavaScript parser is intentionally integrated as an application-owned module.
import { PcfParser } from "@/features/pcf-viewer/upstream/src/parser/PcfParser.js";
// @ts-expect-error Upstream JavaScript parser is intentionally integrated as an application-owned module.
import { IdfParser } from "@/features/pcf-viewer/upstream/src/parser/IdfParser.js";
// @ts-expect-error Upstream JavaScript scene is intentionally integrated as an application-owned module.
import type { Scene } from "@/features/pcf-viewer/upstream/src/viewer/Scene.js";

import "./pcf-viewer.css";

export default function PcfViewerPage() {
  const sceneRef = useRef<Scene | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<ViewerFile[]>([]);
  const [selection, setSelection] = useState<ComponentSelection | null>(null);
  const [multiSelection, setMultiSelection] = useState<ComponentSelection[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [globalOffset, setGlobalOffset] = useState<any>(null);
  const components = useMemo(() => flattenVisibleComponents(files), [files]);
  const selectedKey = selection ? `${selection.sourceFile}:${selection.index}` : null;

  const handleFilesChanged = useCallback((entries: Array<[string, any]>) => {
    setFiles(entries.map(([filename, value]) => ({ filename, visible: value.visible, components: value.data.components })));
  }, []);
  const handleSelection = useCallback((value: any) => {
    if (!value?.component) { setSelection(null); return; }
    setMultiSelection([]);
    setSelection({ ...value.component, sourceFile: value.filename, index: value.componentIndex });
  }, []);
  const handleBoxSelection = useCallback((value: any[]) => { setMultiSelection(value); setSelection(value.length === 1 ? value[0] : null); }, []);
  const handleSceneReady = useCallback((scene: Scene) => { sceneRef.current = scene; }, []);
  const handleSceneError = useCallback((value: Error) => setError(`WebGL 初始化失败：${value.message}`), []);

  const loadFiles = useCallback(async (incoming: File[]) => {
    setBusy(true); setError(null);
    try {
      for (const file of incoming) {
        const extension = getViewerFileExtension(file.name);
        if (!extension) { setError(`已跳过 ${file.name}：只支持 PCF 或 IDF 文件。`); continue; }
        const Parser = extension === "pcf" ? PcfParser : IdfParser;
        const parser = new Parser();
        const data = parser.parse(await file.text(), globalOffset);
        if (!globalOffset && data.offset) setGlobalOffset(data.offset);
        sceneRef.current?.loadPipingData(data, file.name, false);
      }
    } catch (value) { setError(value instanceof Error ? value.message : String(value)); }
    finally { setBusy(false); }
  }, [globalOffset]);

  const loadSample = async () => { const response = await fetch("/samples/sample.pcf"); const content = await response.text(); await loadFiles([new File([content], "sample.pcf", { type: "text/plain" })]); };
  const handleDrop = (event: DragEvent) => { event.preventDefault(); setDragging(false); void loadFiles(Array.from(event.dataTransfer.files)); };

  return <main className="pcf-viewer-page">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground"><Box className="size-5" /></div><div><h1 className="text-lg font-semibold">PCF/IDF Viewer</h1><p className="text-xs text-muted-foreground">Three.js integration outside the Portal SDK</p></div></div><div className="flex items-center gap-2"><Badge variant="outline">{files.length} files</Badge><Badge variant="outline">{components.length} components</Badge></div></header>
    {error && <Alert variant="destructive" className="mx-4 mt-3"><AlertTitle>Viewer error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
    <div className="grid min-h-[calc(100vh-5rem)] gap-3 p-3 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
      <aside className="space-y-3"><Card><CardHeader><CardTitle className="text-sm">Load files</CardTitle></CardHeader><CardContent className="space-y-3"><input ref={inputRef} type="file" accept=".pcf,.idf" multiple className="hidden" onChange={(event) => void loadFiles(Array.from(event.target.files ?? []))} /><button className={`pcf-dropzone ${dragging ? "pcf-dropzone-active" : ""}`} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={handleDrop}><Upload className="mx-auto mb-2" /><span>选择或拖拽 PCF / IDF</span></button><Button variant="outline" className="w-full" onClick={() => void loadSample()}>Load sample.pcf</Button>{busy && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="size-3 animate-spin" />Parsing files…</p>}</CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Files</CardTitle></CardHeader><CardContent><FileList files={files} onToggleVisibility={(filename) => sceneRef.current?.toggleFileVisibility(filename)} onRemove={(filename) => sceneRef.current?.removeFile(filename)} /></CardContent></Card><Card><CardHeader><CardTitle className="text-sm">Components</CardTitle></CardHeader><CardContent className="max-h-[35vh] overflow-auto"><ComponentTree components={components} selectedKey={selectedKey} onSelect={(item) => { sceneRef.current?.selectComponent(item.sourceFile, item.index); setSelection(item); }} /></CardContent></Card></aside>
      <section className="flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-xl border bg-slate-950"><div className="flex flex-wrap items-center gap-1 border-b border-white/10 p-2"><Button size="sm" variant="secondary" onClick={() => sceneRef.current?.setCameraView("iso")}><View /> Iso</Button><Button size="sm" variant="ghost" onClick={() => sceneRef.current?.setCameraView("top")}>Top</Button><Button size="sm" variant="ghost" onClick={() => sceneRef.current?.setCameraView("front")}>Front</Button><Button size="sm" variant="ghost" onClick={() => sceneRef.current?.setCameraView("side")}>Side</Button><Button size="sm" variant="ghost" onClick={() => sceneRef.current?.fitCameraToSelection()}><MousePointer2 /> Fit</Button><Button size="sm" variant="ghost" onClick={() => sceneRef.current?.toggleGrid()}><Grid3X3 /> Grid</Button><Button size="sm" variant="ghost" onClick={() => sceneRef.current?.toggleBoxSelectMode()}><Check /> Box select</Button></div><div className="min-h-0 flex-1"><PcfViewerCanvas onSceneReady={handleSceneReady} onSceneError={handleSceneError} onFilesChanged={handleFilesChanged} onSelection={handleSelection} onBoxSelection={handleBoxSelection} /></div></section>
      <aside><Card className="h-full"><CardHeader><CardTitle className="text-sm">Properties</CardTitle></CardHeader><CardContent><PropertiesPanel selection={selection} multiSelection={multiSelection} /></CardContent></Card></aside>
    </div>
  </main>;
}
