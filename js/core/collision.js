/** @param {LevelData} level @param {number} px @param {number} py @param {number} r */
function circleOverlapsSolid(level, px, py, r) {
  const pad = r + 2;
  const c0 = Math.floor((px - pad) / TILE_SIZE);
  const c1 = Math.floor((px + pad) / TILE_SIZE);
  const r0 = Math.floor((py - pad) / TILE_SIZE);
  const r1 = Math.floor((py + pad) / TILE_SIZE);

  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!isSolidCell(level, col, row)) continue;
      const tx = col * TILE_SIZE;
      const ty = row * TILE_SIZE;
      const cx = Math.max(tx, Math.min(px, tx + TILE_SIZE));
      const cy = Math.max(ty, Math.min(py, ty + TILE_SIZE));
      const dx = px - cx;
      const dy = py - cy;
      if (dx * dx + dy * dy < r * r) return true;
    }
  }
  return false;
}

/**
 * めり込み状態から円を押し出す（反復）
 * @returns {{ x: number, y: number }}
 */
function resolveCircleFromSolids(level, px, py, r) {
  let x = px;
  let y = py;
  for (let iter = 0; iter < 12; iter++) {
    let moved = false;
    const pad = r + 2;
    const c0 = Math.floor((x - pad) / TILE_SIZE);
    const c1 = Math.floor((x + pad) / TILE_SIZE);
    const r0 = Math.floor((y - pad) / TILE_SIZE);
    const r1 = Math.floor((y + pad) / TILE_SIZE);

    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (!isSolidCell(level, col, row)) continue;
        const tx = col * TILE_SIZE;
        const ty = row * TILE_SIZE;
        const cx = Math.max(tx, Math.min(x, tx + TILE_SIZE));
        const cy = Math.max(ty, Math.min(y, ty + TILE_SIZE));
        const dx = x - cx;
        const dy = y - cy;
        const distSq = dx * dx + dy * dy;
        if (distSq >= r * r - 0.01) continue;

        if (distSq < 1e-8) {
          x += r + 1;
          y += 0.5;
        } else {
          const dist = Math.sqrt(distSq);
          const push = r - dist + 0.5;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        }
        moved = true;
      }
    }
    if (!moved) break;
  }
  return { x, y };
}

/**
 * 線分移動の連続衝突判定
 * @returns {{ hit: boolean, x: number, y: number, nx: number, ny: number, t: number }}
 */
function sweepCircleSolid(level, x0, y0, x1, y1, r) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    if (circleOverlapsSolid(level, x0, y0, r)) {
      const n = estimateCollisionNormal(level, x0, y0, r);
      return { hit: true, x: x0, y: y0, nx: n.nx, ny: n.ny, t: 0 };
    }
    return { hit: false, x: x1, y: y1, nx: 0, ny: 0, t: 1 };
  }

  const steps = Math.max(8, Math.ceil(len / (TILE_SIZE * 0.35)));
  let lastFree = { x: x0, y: y0, t: 0 };

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    if (!circleOverlapsSolid(level, x, y, r)) {
      lastFree = { x, y, t };
      continue;
    }
    const n = estimateCollisionNormal(level, x, y, r);
    const resolved = resolveCircleFromSolids(level, x, y, r);
    return {
      hit: true,
      x: resolved.x,
      y: resolved.y,
      nx: n.nx,
      ny: n.ny,
      t,
    };
  }

  return { hit: false, x: x1, y: y1, nx: 0, ny: 0, t: 1 };
}

/** @param {LevelData} level @param {number} px @param {number} py @param {number} r */
function estimateCollisionNormal(level, px, py, r) {
  let nx = 0;
  let ny = 0;
  const pad = r + 1;
  const c0 = Math.floor((px - pad) / TILE_SIZE);
  const c1 = Math.floor((px + pad) / TILE_SIZE);
  const r0 = Math.floor((py - pad) / TILE_SIZE);
  const r1 = Math.floor((py + pad) / TILE_SIZE);

  for (let row = r0; row <= r1; row++) {
    for (let col = c0; col <= c1; col++) {
      if (!isSolidCell(level, col, row)) continue;
      const tx = col * TILE_SIZE;
      const ty = row * TILE_SIZE;
      const cx = Math.max(tx, Math.min(px, tx + TILE_SIZE));
      const cy = Math.max(ty, Math.min(py, ty + TILE_SIZE));
      const dx = px - cx;
      const dy = py - cy;
      const dist = Math.hypot(dx, dy);
      if (dist < r + 0.5) {
        if (dist > 1e-4) {
          nx += dx / dist;
          ny += dy / dist;
        } else {
          nx += px < cx + TILE_SIZE * 0.5 ? -1 : 1;
          ny += py < cy + TILE_SIZE * 0.5 ? -1 : 1;
        }
      }
    }
  }
  const len = Math.hypot(nx, ny);
  if (len < 0.01) return { nx: 0, ny: -1 };
  return { nx: nx / len, ny: ny / len };
}
