import { useEffect, useRef, useState } from "react";
import type React from "react";
import "./App.css";
import { Stage, Layer, Line, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import Konva from "konva";
import Garden from "./pages/Garden";

function App() {
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<Color>("black");
  const [lines, setLines] = useState<LineData[]>([]);
  const [redoStack, setRedoStack] = useState<LineData[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const isDrawing = useRef<boolean>(false);
  const ERASER_SIZE = 20;
  const stageRef = useRef<Konva.Stage | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;


  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    if (redoStack.length) setRedoStack([]);
    setLines([...lines, { tool, color, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const point = stage.getPointerPosition();
    if (point) setCursor({ x: point.x, y: point.y });

    if (!isDrawing.current) {
      return;
    }
    if (!point) return;
    const lastLine = lines[lines.length - 1];
    if (!lastLine) return;

    lastLine.points = lastLine.points.concat([point.x, point.y]);

    lines.splice(lines.length - 1, 1, lastLine);
    setLines(lines.concat());
  };

  const handleMouseUp = () => {
    isDrawing.current = false;
  };

  const handleUndo = () => {
    if (lines.length === 0) return;
    const removed = lines[lines.length - 1];
    setLines(lines.slice(0, -1));
    setRedoStack([...redoStack, removed]);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const restored = redoStack[redoStack.length - 1];
    setRedoStack(redoStack.slice(0, -1));
    setLines([...lines, restored]);
  };

    const savePumpkin = async () => {
    const img = getBase64Image();
    if (!img) return;

    const userId = getUserId();

    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/validate-pumpkin`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseKey, 
          },
          body: JSON.stringify({ 
            imageData: img,
            userId: userId 
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        setToast(result.error || "Error al guardar la calabaza");
        setTimeout(() => setToast(null), 3000);
        return;
      }

      setLines([]);
      setRedoStack([]);
      setToast(`Calabaza guardada 🎃 (Te quedan ${result.remaining})`);
      setTimeout(() => setToast(null), 3000);

    } catch (error) {
      console.error(error);
      setToast("Error de conexión");
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getUserId = () => {
    let userId = localStorage.getItem("pumpkin_user_id");
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem("pumpkin_user_id", userId);
    }
    return userId;
  };

  const getBase64Image = (): string | undefined => {
    const uri = stageRef.current?.toDataURL();
    return uri;
  };

  return (
    <SplitGardenCanvas
      tool={tool}
      setTool={setTool}
      color={color}
      setColor={setColor}
      lines={lines}
      setLines={setLines}
      cursor={cursor}
      setCursor={setCursor}
      ERASER_SIZE={ERASER_SIZE}
      handleMouseDown={handleMouseDown}
      handleMouseMove={handleMouseMove}
      handleMouseUp={handleMouseUp}
      handleUndo={handleUndo}
      handleRedo={handleRedo}
      savePumpkin={savePumpkin}
      toast={toast}
      stageRef={stageRef}
    />
  );
}

export default App;

type Tool = "pen" | "eraser";
type Color = "black" | "white" | "green" | "orange" | "red" | "yellow";
type LineData = { tool: Tool; color: Color; points: number[] };
type Point = { x: number; y: number };

type SplitProps = {
  tool: Tool;
  setTool: (t: Tool) => void;
  color: Color;
  setColor: (c: Color) => void;
  lines: LineData[];
  setLines: (l: LineData[]) => void;
  cursor: Point | null;
  setCursor: (p: Point | null) => void;
  ERASER_SIZE: number;
  handleMouseDown: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleMouseMove: (e: KonvaEventObject<MouseEvent | TouchEvent>) => void;
  handleMouseUp: () => void;
  handleUndo: () => void;
  handleRedo: () => void;
  savePumpkin: () => void;
  toast: string | null;
  stageRef: React.MutableRefObject<Konva.Stage | null>;
};

function SplitGardenCanvas(props: SplitProps) {
  const {
    tool,
    setTool,
    color,
    setColor,
    lines,
    cursor,
    ERASER_SIZE,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleUndo,
    handleRedo,
    savePumpkin,
    toast,
    stageRef,
  } = props;

  const leftRef = useRef<HTMLDivElement | null>(null);
  const rightRef = useRef<HTMLDivElement | null>(null);
  const stageWrapRef = useRef<HTMLDivElement | null>(null);
  const [leftSize, setLeftSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });
  const [wrapSize, setWrapSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  });

  useEffect(() => {
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target === leftRef.current) {
          const cr = entry.contentRect;
          setLeftSize({ w: cr.width, h: cr.height });
        }
        if (entry.target === stageWrapRef.current) {
          const cr = entry.contentRect;
          setWrapSize({ w: cr.width, h: cr.height });
        }
      }
    });
    if (leftRef.current) obs.observe(leftRef.current);
    if (stageWrapRef.current) obs.observe(stageWrapRef.current);
    return () => obs.disconnect();
  }, []);

  const stageWidth = Math.max(300, Math.floor(wrapSize.w));
  const stageHeight = Math.max(300, Math.floor(wrapSize.h));

  return (
    <div className="w-full min-h-screen flex">
      <div
        ref={leftRef}
        className="flex-1 relative border-r border-slate-200 min-h-screen"
      >
        <Garden embedded width={leftSize.w} height={leftSize.h} />
      </div>
      <div
        ref={rightRef}
        className="flex-1 min-h-screen p-3 flex flex-col gap-3 items-stretch"
      >
        <div className="flex items-center gap-2">
          <select
            value={tool}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setTool(e.target.value as Tool);
            }}
            className="border border-slate-300"
          >
            <option value="pen">Pen</option>
            <option value="eraser">Eraser</option>
          </select>
          {(
            ["black", "white", "green", "orange", "red", "yellow"] as Color[]
          ).map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={`color-${c}`}
              className="h-6 w-6 rounded-full border border-slate-300"
              style={{ backgroundColor: c }}
            />
          ))}
          <span className="text-sm text-slate-600">Color: {color}</span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={handleUndo}
              className="px-2 py-1 text-sm border border-slate-300 rounded"
              aria-label="undo"
            >
              Undo
            </button>
            <button
              onClick={handleRedo}
              className="px-2 py-1 text-sm border border-slate-300 rounded"
              aria-label="redo"
            >
              Redo
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div
            ref={stageWrapRef}
            className="w-full h-full border-2 border-slate-400 rounded-sm"
          >
            <Stage
              width={stageWidth}
              height={stageHeight}
              style={{ display: "block", width: "100%", height: "100%" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchMove={handleMouseMove}
              onTouchEnd={handleMouseUp}
              ref={stageRef}
            >
              <Layer>
                {lines.map((line, i) => (
                  <Line
                    key={i}
                    points={line.points}
                    stroke={line.tool === "eraser" ? "#000000" : line.color}
                    strokeWidth={line.tool === "eraser" ? ERASER_SIZE : 5}
                    tension={0.5}
                    lineCap="round"
                    lineJoin="round"
                    globalCompositeOperation={
                      line.tool === "eraser" ? "destination-out" : "source-over"
                    }
                  />
                ))}

                {tool === "eraser" && cursor && (
                  <Rect
                    x={cursor.x - ERASER_SIZE / 2}
                    y={cursor.y - ERASER_SIZE / 2}
                    width={ERASER_SIZE}
                    height={ERASER_SIZE}
                    stroke="#333"
                    dash={[4, 4]}
                    listening={false}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </div>

        <div className="flex items-center justify-end">
          <button
            onClick={savePumpkin}
            className="border-2 border-slate-600 rounded px-2 py-1 text-sm"
          >
            Save pumpkin 🎃
          </button>
        </div>

        {toast && (
          <div className="fixed bottom-4 right-4 bg-slate-800 text-white text-sm px-3 py-2 rounded shadow">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
