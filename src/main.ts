import "./style.css";

const appTitle = "Drawing App";

const title = document.createElement("h1");
title.textContent = appTitle;
document.body.appendChild(title);

const canvas = document.createElement("canvas");
canvas.width = 256;
canvas.height = 256;
canvas.id = "drawingCanvas";
document.body.appendChild(canvas);

const clearButton = document.createElement("button");
clearButton.textContent = "Clear";
document.body.appendChild(clearButton);

const ctx = canvas.getContext("2d")!;

type Point = { x: number; y: number };
type Stroke = Point[];

const strokes: Stroke[] = [];
let isDrawing = false;

function getCanvasPosition(event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function dispatchDrawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  const startPoint = getCanvasPosition(event);
  strokes.push([startPoint]);
  dispatchDrawingChanged();
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

canvas.addEventListener("mousemove", (event) => {
  if (!isDrawing) return;
  const point = getCanvasPosition(event);
  const currentStroke = strokes[strokes.length - 1];
  if (!currentStroke) return;
  currentStroke.push(point);
  dispatchDrawingChanged();
});

canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "black";

  for (const stroke of strokes) {
    if (stroke.length === 0) continue;
    ctx.beginPath();
    const [first, ...rest] = stroke;
    ctx.moveTo(first.x, first.y);
    for (const p of rest) {
      ctx.lineTo(p.x, p.y);
    }
    // If the stroke is a single point, draw a tiny dot
    if (stroke.length === 1) {
      ctx.lineTo(first.x + 0.01, first.y + 0.01);
    }
    ctx.stroke();
  }
});

clearButton.addEventListener("click", () => {
  strokes.length = 0;
  dispatchDrawingChanged();
});
