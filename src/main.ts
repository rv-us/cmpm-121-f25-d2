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

// Sticker tool buttons
const stickerSmileButton = document.createElement("button");
stickerSmileButton.textContent = "😀";
document.body.appendChild(stickerSmileButton);

const stickerStarButton = document.createElement("button");
stickerStarButton.textContent = "⭐";
document.body.appendChild(stickerStarButton);

const stickerHeartButton = document.createElement("button");
stickerHeartButton.textContent = "❤️";
document.body.appendChild(stickerHeartButton);

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

// --- Tool Preview Types ---
interface ToolPreview {
  draw(ctx: CanvasRenderingContext2D): void;
}

class MarkerPreview implements ToolPreview {
  private center: Point;
  private thickness: number;

  constructor(center: Point, thickness: number) {
    this.center = center;
    this.thickness = thickness;
  }

  setPosition(center: Point) {
    this.center = center;
  }

  setThickness(thickness: number) {
    this.thickness = thickness;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

let preview: ToolPreview | null = null;

// Sticker preview
class StickerPreview implements ToolPreview {
  private center: Point;
  private emoji: string;
  private fontPx: number;

  constructor(center: Point, emoji: string, fontPx: number) {
    this.center = center;
    this.emoji = emoji;
    this.fontPx = fontPx;
  }

  setPosition(center: Point) {
    this.center = center;
  }

  setEmoji(emoji: string) {
    this.emoji = emoji;
  }

  setFontPx(fontPx: number) {
    this.fontPx = fontPx;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.font = `${this.fontPx}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.center.x, this.center.y);
    ctx.restore();
  }
}

// Sticker drawing command
class StickerCommand implements DisplayCommand {
  private center: Point;
  private readonly emoji: string;
  private readonly fontPx: number;

  constructor(center: Point, emoji: string, fontPx: number) {
    this.center = center;
    this.emoji = emoji;
    this.fontPx = fontPx;
  }

  setPosition(center: Point) {
    this.center = center;
  }

  display(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = `${this.fontPx}px system-ui`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(this.emoji, this.center.x, this.center.y);
    ctx.restore();
  }
}

const THIN = 2;
const THICK = 6;
let currentThickness = THIN;

type ToolMode = "marker" | "sticker";
let currentToolMode: ToolMode = "marker";
let currentSticker = "⭐";
const STICKER_FONT_PX = 28;

function updateToolSelection() {
  const isMarker = currentToolMode === "marker";
  thinToolButton.classList.toggle(
    "selectedTool",
    isMarker && currentThickness === THIN,
  );
  thickToolButton.classList.toggle(
    "selectedTool",
    isMarker && currentThickness === THICK,
  );
  stickerSmileButton.classList.toggle(
    "selectedTool",
    !isMarker && currentSticker === "😀",
  );
  stickerStarButton.classList.toggle(
    "selectedTool",
    !isMarker && currentSticker === "⭐",
  );
  stickerHeartButton.classList.toggle(
    "selectedTool",
    !isMarker && currentSticker === "❤️",
  );
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

function dispatchToolMoved() {
  canvas.dispatchEvent(new Event("tool-moved"));
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const command of strokes) {
    command.display(ctx);
  }
  if (!isDrawing && preview) {
    preview.draw(ctx);
  }
  updateButtonStates();
  updateToolSelection();
}

thinToolButton.addEventListener("click", () => {
  currentToolMode = "marker";
  currentThickness = THIN;
  if (preview instanceof MarkerPreview) preview.setThickness(currentThickness);
  updateToolSelection();
  dispatchToolMoved();
});

thickToolButton.addEventListener("click", () => {
  currentToolMode = "marker";
  currentThickness = THICK;
  if (preview instanceof MarkerPreview) preview.setThickness(currentThickness);
  updateToolSelection();
  dispatchToolMoved();
});

// Sticker tool button handlers
stickerSmileButton.addEventListener("click", () => {
  currentToolMode = "sticker";
  currentSticker = "😀";
  updateToolSelection();
  dispatchToolMoved();
});

stickerStarButton.addEventListener("click", () => {
  currentToolMode = "sticker";
  currentSticker = "⭐";
  updateToolSelection();
  dispatchToolMoved();
});

stickerHeartButton.addEventListener("click", () => {
  currentToolMode = "sticker";
  currentSticker = "❤️";
  updateToolSelection();
  dispatchToolMoved();
});

canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  const startPoint = getCanvasPosition(event);
  // Starting a new element invalidates redo history
  redoStack.length = 0;
  preview = null; // hide preview while drawing
  if (currentToolMode === "marker") {
    const stroke = new MarkerStroke(startPoint, currentThickness);
    strokes.push(stroke);
  } else {
    const sticker = new StickerCommand(
      startPoint,
      currentSticker,
      STICKER_FONT_PX,
    );
    strokes.push(sticker);
  }
  dispatchDrawingChanged();
  dispatchToolMoved();
});

canvas.addEventListener("mouseup", () => {
  isDrawing = false;
  dispatchToolMoved();
});

canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
  preview = null;
  dispatchToolMoved();
});

canvas.addEventListener("mousemove", (event) => {
  const point = getCanvasPosition(event);
  if (isDrawing) {
    const lastCommand = strokes[strokes.length - 1];
    if (currentToolMode === "marker") {
      if (lastCommand instanceof MarkerStroke) {
        lastCommand.drag(point);
      }
    } else {
      if (lastCommand instanceof StickerCommand) {
        lastCommand.setPosition(point);
      }
    }
    dispatchDrawingChanged();
  } else {
    if (currentToolMode === "marker") {
      if (!(preview instanceof MarkerPreview)) {
        preview = new MarkerPreview(point, currentThickness);
      } else {
        preview.setPosition(point);
        preview.setThickness(currentThickness);
      }
    } else {
      if (!(preview instanceof StickerPreview)) {
        preview = new StickerPreview(point, currentSticker, STICKER_FONT_PX);
      } else {
        preview.setPosition(point);
        (preview as StickerPreview).setEmoji(currentSticker);
        (preview as StickerPreview).setFontPx(STICKER_FONT_PX);
      }
    }
  }
  dispatchToolMoved();
});

canvas.addEventListener("drawing-changed", render);
canvas.addEventListener("tool-moved", render);

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
