/** @type {CanvasPattern | null} */
let hazardStripePattern = null;

/**
 * 黒×黄の警告縞パターン（即死タイルの縁用）
 * @param {CanvasRenderingContext2D} ctx
 */
function getHazardStripePattern(ctx) {
  if (hazardStripePattern) return hazardStripePattern;
  const tile = 10;
  const pat = document.createElement('canvas');
  pat.width = tile;
  pat.height = tile;
  const p = pat.getContext('2d');
  if (!p) return '#facc15';
  p.fillStyle = '#facc15';
  p.fillRect(0, 0, tile, tile);
  p.strokeStyle = '#111827';
  p.lineWidth = 4;
  p.beginPath();
  p.moveTo(-tile, tile);
  p.lineTo(tile * 2, -tile);
  p.moveTo(-tile, tile * 2);
  p.lineTo(tile * 2, -tile * 2);
  p.stroke();
  hazardStripePattern = ctx.createPattern(pat, 'repeat');
  return hazardStripePattern;
}

/**
 * マス外周に黒黄の縞模様（危険色の縁取り）
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {number} [band]
 */
function drawHazardBorder(ctx, x, y, size, band = 5) {
  const pattern = getHazardStripePattern(ctx);
  if (!pattern) return;

  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.rect(x + band, y + band, size - band * 2, size - band * 2);
  ctx.clip('evenodd');
  ctx.fillStyle = pattern;
  ctx.fillRect(x - size, y - size, size * 3, size * 3);
  ctx.restore();

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.75, y + 0.75, size - 1.5, size - 1.5);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} id
 * @param {number} x
 * @param {number} y
 * @param {number} size
 */
function drawTileDecor(ctx, id, x, y, size = TILE_SIZE) {
  if (id === TILE_LINK_DEATH) drawLinkDeathTile(ctx, x, y, size);
  else if (id === TILE_BODY_DEATH) drawBodyDeathTile(ctx, x, y, size);
  else if (id === 3) drawGoalTile(ctx, x, y, size);
  else if (id === 5) drawCheckpointTile(ctx, x, y, size);
  else if (id === 1) drawBounceTile(ctx, x, y, size);
}

/** 線即死：水色の線＋縁に黒黄の縞 */
function drawLinkDeathTile(ctx, x, y, size) {
  const s = size;
  const cx = x + s * 0.5;
  const cy = y + s * 0.5;

  ctx.fillStyle = '#f0f9ff';
  ctx.fillRect(x, y, s, s);

  ctx.strokeStyle = '#38bdf8';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 3, cy);
  ctx.lineTo(x + s - 3, cy);
  ctx.stroke();

  ctx.strokeStyle = '#7dd3fc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 5, cy);
  ctx.lineTo(x + s - 5, cy);
  ctx.stroke();

  drawHazardBorder(ctx, x, y, s);
}

/** 体即死：A・Bマーク＋縁に黒黄の縞 */
function drawBodyDeathTile(ctx, x, y, size) {
  const s = size;
  const cx = x + s * 0.5;

  ctx.fillStyle = '#fff5f5';
  ctx.fillRect(x, y, s, s);

  const labels = [
    { letter: 'A', color: '#3b82f6', x: cx - s * 0.22 },
    { letter: 'B', color: '#ec4899', x: cx + s * 0.22 },
  ];

  for (const item of labels) {
    const bx = item.x;
    const by = y + s * 0.62;

    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(bx, by, s * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(s * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.letter, bx, by + 1);

  }

  drawHazardBorder(ctx, x, y, s);
}

/** ゴール：白と黒のチェッカー（旗の格子） */
function drawGoalTile(ctx, x, y, size) {
  const s = size;
  const cells = 4;
  const cell = s / cells;

  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      ctx.fillStyle = (row + col) % 2 === 0 ? '#ffffff' : '#111827';
      ctx.fillRect(x + col * cell, y + row * cell, cell, cell);
    }
  }

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

/** 中間地点タイル（マス全体＋枠＋CP） */
function drawCheckpointTile(ctx, x, y, size) {
  const s = size;
  const cx = x + s * 0.5;
  const cy = y + s * 0.5;
  const pulse = 0.92 + Math.sin(performance.now() * 0.006) * 0.08;

  ctx.fillStyle = 'rgba(254, 243, 199, 0.9)';
  ctx.fillRect(x, y, s, s);

  const inset = 4;
  const w = (s - inset * 2) * pulse;
  const h = (s - inset * 2) * pulse;
  ctx.strokeStyle = '#d97706';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  ctx.strokeRect(cx - w / 2, cy - h / 2, w, h);
  ctx.setLineDash([]);

  ctx.fillStyle = '#92400e';
  ctx.font = `bold ${Math.floor(s * 0.38)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CP', cx, cy + 1);

  ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

function drawBounceTile(ctx, x, y, size) {
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 6, y + size - 6);
  ctx.lineTo(x + size * 0.5, y + 8);
  ctx.lineTo(x + size - 6, y + size - 6);
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} id
 * @param {number} x
 * @param {number} y
 */
function drawTileCell(ctx, id, x, y) {
  const tile = getTile(id);
  if (id === 0) {
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    return;
  }
  if (id === TILE_LINK_DEATH || id === TILE_BODY_DEATH || id === 3 || id === 5) {
    drawTileDecor(ctx, id, x, y, TILE_SIZE);
    return;
  }
  ctx.fillStyle = tile.color;
  ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
  drawTileDecor(ctx, id, x, y, TILE_SIZE);
  if (tile.solid) {
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
  }
}
