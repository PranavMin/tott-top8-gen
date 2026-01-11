import { loadCharacterIcon } from "./icon.js";

// Generate graphic from the editable rows
// refactor: single function that draws given entries (preloads icons)
export async function generateGraphic(
  entries,
  { addBorder = false } = {}
) {
  // use addBorder instead of querying the DOM in this module
  const borderSize = addBorder ? 1 : 0;

  // ensure entries is an array
  if (!Array.isArray(entries) || !entries.length) {
    throw new Error("No entries to generate from.");
  }

  // preload icons for each entry (attach as entry.icon)
  await Promise.all(
    entries.map(async (e) => {
      e.icon = await loadCharacterIcon(e.character);
    })
  );

  // layout constants
  const leftPadding = 4;
  const rightPadding = 4;
  const iconLeftPadding = 24;
  const iconSize = 60;
  const rowH = 70;
  const textFont = "700 44px Roboto, serif"; // name & placement font (44px)
  const headerFont = "700 72px Roboto, serif"; // "Top 8" font (72px)
  const headerBottomPadding = 24;

  // measurement context (unscaled)
  const measureCtx = document.createElement("canvas").getContext("2d");
  measureCtx.font = textFont;

  // measure widest placement+name
  let maxRowTextWidth = 0;
  entries.forEach((e) => {
    const label = `${e.place}. ${e.name}`;
    const w = measureCtx.measureText(label).width;
    if (w > maxRowTextWidth) maxRowTextWidth = w;
  });

  // measure header
  measureCtx.font = headerFont;
  const headerText = "Top 8";
  const headerWidth = measureCtx.measureText(headerText).width;
  const headerHeight = 72; // approximate; matches font size

  // compute inner content width (without border) and final needed width including border
  const neededWidthForRows =
    leftPadding + maxRowTextWidth + iconLeftPadding + iconSize + rightPadding;
  const innerWidth = Math.ceil(
    Math.max(neededWidthForRows, leftPadding + headerWidth + rightPadding, 200)
  ); // min width 200
  const neededWidth = innerWidth + borderSize * 2;

  // compute inner content height and final height including border
  const innerHeight =
    headerHeight + headerBottomPadding + entries.length * rowH;
  const height = innerHeight + borderSize * 2;

  // device pixel ratio handling
  const dpr = window.devicePixelRatio || 1;
  const canvas = document.createElement("canvas");
  canvas.width = neededWidth * dpr;
  canvas.height = height * dpr;
  canvas.style.width = neededWidth + "px";
  canvas.style.height = height + "px";
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  // transparent background
  canvas.style.background = "transparent";
  ctx.clearRect(0, 0, neededWidth, height);

  // draw header (offset by borderSize)
  ctx.fillStyle = "#523d30";
  ctx.font = headerFont;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  const headerY = borderSize + headerHeight / 2;
  ctx.fillText(
    headerText,
    borderSize + (innerWidth - headerWidth) / 2,
    headerY
  );

  // draw rows (offset by borderSize)
  ctx.font = textFont;
  ctx.textBaseline = "middle";
  entries.forEach((e, i) => {
    const y = borderSize + headerHeight + headerBottomPadding + i * rowH;
    const label = `${e.place}. ${e.name}`;

    // text
    ctx.fillStyle = "#523d30";
    ctx.textAlign = "left";
    ctx.fillText(label, borderSize + leftPadding, y + rowH / 2);

    // measure to place icon immediately after text
    const textWidth = ctx.measureText(label).width;
    let iconX = Math.round(
      borderSize + leftPadding + textWidth + iconLeftPadding
    );
    // ensure icon doesn't overflow inner content area
    const innerRight = borderSize + innerWidth - rightPadding;
    if (iconX + iconSize > innerRight) {
      iconX = innerRight - iconSize;
    }
    const iconY = y + (rowH - iconSize) / 2;

    ctx.drawImage(e.icon, iconX, iconY, iconSize, iconSize);
  });

  // draw border if requested (stroke centered on the canvas edge)
  if (addBorder && borderSize > 0) {
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = borderSize;
    // draw rectangle so the stroke sits inside the canvas
    ctx.strokeRect(
      borderSize / 2,
      borderSize / 2,
      neededWidth - borderSize,
      height - borderSize
    );
  }

  return canvas;
}
