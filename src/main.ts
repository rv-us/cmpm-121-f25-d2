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

const undoButton = document.createElement("button");
undoButton.textContent = "Undo";
document.body.appendChild(undoButton);

const redoButton = document.createElement("button");
redoButton.textContent = "Redo";
document.body.appendChild(redoButton);

const thinToolButton = document.createElement("button");
thinToolButton.textContent = "Thin";
document.body.appendChild(thinToolButton);

const thickToolButton = document.createElement("button");
thickToolButton.textContent = "Thick";
document.body.appendChild(thickToolButton);

const ctx = canvas.getContext("2d")!;

type Point = { x: number; y: number };

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}

class MarkerStroke implements DisplayCommand {
  private readonly points: Point[] = [];
  private readonly thickness: number;

  constructor(start: Point, thickness: number) {
    this.points.push(start);
    this.thickness = thickness;
  }

  drag(next: Point): void {
    this.points.push(next);
  }

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length === 0) return;
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    ctx.beginPath();
    const [first, ...rest] = this.points;
    ctx.moveTo(first.x, first.y);
    for (const p of rest) {
      ctx.lineTo(p.x, p.y);
    }
    if (this.points.length === 1) {
      ctx.lineTo(first.x + 0.01, first.y + 0.01);
    }
    ctx.stroke();
  }
}

const strokes: DisplayCommand[] = [];
const redoStack: DisplayCommand[] = [];
let isDrawing = false;

const THIN = 2;
const THICK = 6;
let currentThickness = THIN;

function updateToolSelection() {
  thinToolButton.classList.toggle("selectedTool", currentThickness === THIN);
  thickToolButton.classList.toggle("selectedTool", currentThickness === THICK);
}

function getCanvasPosition(event: MouseEvent): Point {
  const rect = canvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function dispatchDrawingChanged() {
  canvas.dispatchEvent(new Event("drawing-changed"));
}

function updateButtonStates() {
  undoButton.disabled = strokes.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

thinToolButton.addEventListener("click", () => {
  currentThickness = THIN;
  updateToolSelection();
});

thickToolButton.addEventListener("click", () => {
  currentThickness = THICK;
  updateToolSelection();
});

canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  const startPoint = getCanvasPosition(event);
  const stroke = new MarkerStroke(startPoint, currentThickness);
  strokes.push(stroke);
  // Starting a new stroke invalidates redo history
  redoStack.length = 0;
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
  const currentStroke = strokes[strokes.length - 1] as MarkerStroke | undefined;
  if (!currentStroke) return;
  currentStroke.drag(point);
  dispatchDrawingChanged();
});

canvas.addEventListener("drawing-changed", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const command of strokes) {
    command.display(ctx);
  }
  updateButtonStates();
  updateToolSelection();
});

clearButton.addEventListener("click", () => {
  strokes.length = 0;
  redoStack.length = 0;
  dispatchDrawingChanged();
});

undoButton.addEventListener("click", () => {
  if (strokes.length === 0) return;
  const undone = strokes.pop()!;
  redoStack.push(undone);
  dispatchDrawingChanged();
});

redoButton.addEventListener("click", () => {
  if (redoStack.length === 0) return;
  const redone = redoStack.pop()!;
  strokes.push(redone);
  dispatchDrawingChanged();
});
