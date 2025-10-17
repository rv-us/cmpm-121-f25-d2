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
