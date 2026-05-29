/** @param {{ ax: number, ay: number, bx: number, by: number }} spawn @param {number} orbitRadius */
function extendSpawnDistance(spawn, orbitRadius) {
  const dx = spawn.bx - spawn.ax;
  const dy = spawn.by - spawn.ay;
  const dist = Math.hypot(dx, dy) || 1;
  const s = orbitRadius / dist;
  spawn.bx = spawn.ax + dx * s;
  spawn.by = spawn.ay + dy * s;
}

/** @param {LevelData} level @param {number} x @param {number} y @param {number} r */
function placeCharacterSafe(level, x, y, r = PLAYER_RADIUS) {
  let pos = resolveCircleFromSolids(level, x, y, r);
  if (!circleOverlapsSolid(level, pos.x, pos.y, r)) return pos;

  for (let ring = 1; ring <= 8; ring++) {
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      const tx = x + Math.cos(ang) * TILE_SIZE * ring * 0.5;
      const ty = y + Math.sin(ang) * TILE_SIZE * ring * 0.5;
      pos = resolveCircleFromSolids(level, tx, ty, r);
      if (!circleOverlapsSolid(level, pos.x, pos.y, r)) return pos;
    }
  }
  return pos;
}

/**
 * スポーン配置ドラッグ（回転距離を維持）
 * @param {LevelData} level
 * @param {{ ax: number, ay: number, bx: number, by: number }} spawn
 * @param {number} x
 * @param {number} y
 * @param {'A'|'B'} char
 * @param {number} orbitRadius
 */
function moveSpawnChar(level, spawn, x, y, char, orbitRadius) {
  if (char === 'A') {
    const ang = Math.atan2(spawn.by - spawn.ay, spawn.bx - spawn.ax);
    const a = placeCharacterSafe(level, x, y);
    spawn.ax = a.x;
    spawn.ay = a.y;
    spawn.bx = spawn.ax + Math.cos(ang) * orbitRadius;
    spawn.by = spawn.ay + Math.sin(ang) * orbitRadius;
    const b = placeCharacterSafe(level, spawn.bx, spawn.by);
    spawn.bx = b.x;
    spawn.by = b.y;
  } else {
    const ang = Math.atan2(y - spawn.ay, x - spawn.ax);
    spawn.bx = spawn.ax + Math.cos(ang) * orbitRadius;
    spawn.by = spawn.ay + Math.sin(ang) * orbitRadius;
    const b = placeCharacterSafe(level, spawn.bx, spawn.by);
    spawn.bx = b.x;
    spawn.by = b.y;
  }
  extendSpawnDistance(spawn, orbitRadius);
}

/** @param {LevelData} level @param {{ ax: number, ay: number, bx: number, by: number }} spawn @param {number} orbitRadius */
function applySpawnOrbitRadius(level, spawn, orbitRadius) {
  extendSpawnDistance(spawn, orbitRadius);
  const a = placeCharacterSafe(level, spawn.ax, spawn.ay);
  spawn.ax = a.x;
  spawn.ay = a.y;
  const b = placeCharacterSafe(level, spawn.bx, spawn.by);
  spawn.bx = b.x;
  spawn.by = b.y;
  extendSpawnDistance(spawn, orbitRadius);
  const b2 = placeCharacterSafe(level, spawn.bx, spawn.by);
  spawn.bx = b2.x;
  spawn.by = b2.y;
}
