/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} half
 * @param {number} lineWidth
 */
function drawRedX(ctx, cx, cy, half, lineWidth = 3) {
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - half, cy - half);
  ctx.lineTo(cx + half, cy + half);
  ctx.moveTo(cx + half, cy - half);
  ctx.lineTo(cx - half, cy + half);
  ctx.stroke();
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

/** 線即死：水色の線＋赤バツ */
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

  drawRedX(ctx, cx, cy, s * 0.22, 3.5);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

/** 体即死：A・Bの上に赤バツ */
function drawBodyDeathTile(ctx, x, y, size) {
  const s = size;
  const cx = x + s * 0.5;

  ctx.fillStyle = '#fff5f5';
  ctx.fillRect(x, y, s, s);

  const labels = [
    { letter: 'A', x: cx - s * 0.22 },
    { letter: 'B', x: cx + s * 0.22 },
  ];

  for (const item of labels) {
    const bx = item.x;
    const by = y + s * 0.62;

    ctx.fillStyle = '#94a3b8';
    ctx.beginPath();
    ctx.arc(bx, by, s * 0.14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.floor(s * 0.22)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.letter, bx, by + 1);

    drawRedX(ctx, bx, by - s * 0.28, s * 0.13, 2.5);
  }

  ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, s - 1, s - 1);
}

function drawGoalTile(ctx, x, y, size) {
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(size * 0.45)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', x + size * 0.5, y + size * 0.55);
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
  if (id === TILE_LINK_DEATH || id === TILE_BODY_DEATH || id === 5) {
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
