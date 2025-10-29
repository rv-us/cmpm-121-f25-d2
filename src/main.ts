import "./style.css";

const appTitle = "✨ Sketchpad ✨";

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
thinToolButton.textContent = "Fine";
document.body.appendChild(thinToolButton);

const thickToolButton = document.createElement("button");
thickToolButton.textContent = "Bold";
document.body.appendChild(thickToolButton);

const stickers = ["🎨", "✨", "💫", "🎉"];
const stickerButtons = new Map<string, HTMLButtonElement>();

const customStickerButton = document.createElement("button");
customStickerButton.textContent = "+ Add Emoji";
document.body.appendChild(customStickerButton);

const exportButton = document.createElement("button");
exportButton.textContent = "Export";
document.body.appendChild(exportButton);

const ctx = canvas.getContext("2d")!;

type Point = { x: number; y: number };

interface DisplayCommand {
  display(ctx: CanvasRenderingContext2D): void;
}

class MarkerStroke implements DisplayCommand {
  private readonly points: Point[] = [];
  private readonly thickness: number;
  private readonly color: string;

  constructor(start: Point, thickness: number, color: string) {
    this.points.push(start);
    this.thickness = thickness;
    this.color = color;
  }

  drag(next: Point): void {
    this.points.push(next);
  }

  display(ctx: CanvasRenderingContext2D): void {
    if (this.points.length === 0) return;
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.strokeStyle = this.color;

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
  private color: string;

  constructor(center: Point, thickness: number, color: string) {
    this.center = center;
    this.thickness = thickness;
    this.color = color;
  }

  setPosition(center: Point) {
    this.center = center;
  }

  setThickness(thickness: number) {
    this.thickness = thickness;
  }

  setColor(color: string) {
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.strokeStyle = this.color;
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

const THIN = 3;
const THICK = 10;
let currentThickness = THIN;

function generateRandomColor(): string {
  const hue = Math.floor(Math.random() * 360);
  return `hsl(${hue}, 70%, 50%)`;
}

let currentMarkerColor = "#000000";

type ToolMode = "marker" | "sticker";
let currentToolMode: ToolMode = "marker";
let currentSticker = "✨";
const STICKER_FONT_PX = 32;

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
  for (const [emoji, button] of stickerButtons) {
    button.classList.toggle(
      "selectedTool",
      !isMarker && currentSticker === emoji,
    );
  }
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

function createStickerButton(emoji: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.textContent = emoji;
  button.addEventListener("click", () => {
    currentToolMode = "sticker";
    currentSticker = emoji;
    updateToolSelection();
    dispatchToolMoved();
  });
  document.body.appendChild(button);
  stickerButtons.set(emoji, button);
  return button;
}

// Initialize sticker buttons
for (const sticker of stickers) {
  createStickerButton(sticker);
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
  currentMarkerColor = generateRandomColor();
  if (preview instanceof MarkerPreview) {
    preview.setThickness(currentThickness);
    preview.setColor(currentMarkerColor);
  }
  updateToolSelection();
  dispatchToolMoved();
});

thickToolButton.addEventListener("click", () => {
  currentToolMode = "marker";
  currentThickness = THICK;
  currentMarkerColor = generateRandomColor();
  if (preview instanceof MarkerPreview) {
    preview.setThickness(currentThickness);
    preview.setColor(currentMarkerColor);
  }
  updateToolSelection();
  dispatchToolMoved();
});

customStickerButton.addEventListener("click", () => {
  const text = prompt("Enter emoji or text for your sticker:", "🎭");
  if (text === null || text === "") return;
  if (stickers.includes(text)) return;
  stickers.push(text);
  createStickerButton(text);
  currentToolMode = "sticker";
  currentSticker = text;
  updateToolSelection();
  dispatchToolMoved();
});

exportButton.addEventListener("click", () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;

  exportCtx.scale(4, 4);

  for (const command of strokes) {
    command.display(exportCtx);
  }

  const anchor = document.createElement("a");
  anchor.href = exportCanvas.toDataURL("image/png");
  anchor.download = "sketchpad.png";
  anchor.click();
});

canvas.addEventListener("mousedown", (event) => {
  isDrawing = true;
  const startPoint = getCanvasPosition(event);
  // Starting a new element invalidates redo history
  redoStack.length = 0;
  preview = null; // hide preview while drawing
  if (currentToolMode === "marker") {
    const stroke = new MarkerStroke(startPoint, currentThickness, currentMarkerColor);
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
        preview = new MarkerPreview(point, currentThickness, currentMarkerColor);
      } else {
        preview.setPosition(point);
        preview.setThickness(currentThickness);
        preview.setColor(currentMarkerColor);
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
