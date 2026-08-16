import { useEffect, useRef } from "react";

// @ts-expect-error Upstream JavaScript scene is intentionally integrated as an application-owned module.
import { Scene } from "./upstream/src/viewer/Scene.js";

type Props = {
  onSceneReady: (scene: Scene) => void;
  onSceneError: (error: Error) => void;
  onFilesChanged: (files: Array<[string, any]>) => void;
  onSelection: (selection: any) => void;
  onBoxSelection: (selection: any[]) => void;
};

export function PcfViewerCanvas({ onSceneReady, onSceneError, onFilesChanged, onSelection, onBoxSelection }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const selectionBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !selectionBoxRef.current) return;
    let scene: Scene;
    try {
      scene = new Scene(containerRef.current, { selectionBox: selectionBoxRef.current });
      scene.onFilesChanged = onFilesChanged;
      scene.onComponentSelected = onSelection;
      scene.onBoxSelectionComplete = onBoxSelection;
      onSceneReady(scene);
      const observer = new ResizeObserver(() => scene.onWindowResize());
      observer.observe(containerRef.current);
      return () => {
        observer.disconnect();
        scene.dispose();
      };
    } catch (error) {
      onSceneError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [onBoxSelection, onFilesChanged, onSceneError, onSceneReady, onSelection]);

  return <div ref={containerRef} className="pcf-viewer-canvas"><div ref={selectionBoxRef} className="pcf-viewer-selection-box hidden" /></div>;
}
