import { useRef, useState } from "react";
import "./App.css";
import { Stage, Layer, Line, Text, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";

function App() {
  type Tool = "pen" | "eraser";
  type Color = "black" | "white" | "green" | "orange" | "red" | "yellow";
  type LineData = { tool: Tool; color: Color; points: number[] };
  type Point = { x: number; y: number };

  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<Color>("black");
  const [lines, setLines] = useState<LineData[]>([]);
  const [redoStack, setRedoStack] = useState<LineData[]>([]);
  const [cursor, setCursor] = useState<Point | null>(null);
  const isDrawing = useRef<boolean>(false);
  const ERASER_SIZE = 20;
  const stageRef = useRef(null);

  const handleMouseDown = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    isDrawing.current = true;
    const pos = e.target.getStage()?.getPointerPosition();
    if (!pos) return;
    // Nuevo trazo invalida el redo
    if (redoStack.length) setRedoStack([]);
    setLines([...lines, { tool, color, points: [pos.x, pos.y] }]);
  };

  const handleMouseMove = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    // Actualiza cursor siempre que haya posición
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

  const savePumpkin = () => {
    const uri = stageRef.current?.toDataURL();
    if (!uri) return;

    const img = getBase64Image();
    console.log(img);
  };

  const getBase64Image = () => {
    const link = document.createElement("a");

    return link.href;
  };

  return (
    <div className="flex flex-col gap-8 items-center justify-center w-full min-h-screen p-2">
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
      <div className="mt-2 flex items-center gap-2">
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
      <Stage
        width={500}
        height={500}
        style={{ border: "2px solid #94a3b8", borderRadius: 2 }}
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
      <button
        onClick={savePumpkin}
        className="border-2 border-slate-600 rounded px-2 py-1 text-sm"
      >
        Save pumpkin 🎃
      </button>
    </div>
  );
}

export default App;
