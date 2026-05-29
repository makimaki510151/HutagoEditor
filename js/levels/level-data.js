/** @typedef {{ cols: number, rows: number, tiles: number[], orbitRadius: number, orbitSpeed: number, spawn: { ax: number, ay: number, bx: number, by: number }, checkpoint?: { x: number, y: number } | null, name?: string }} LevelData */

/** @param {LevelData} level */
function syncCheckpointFromTiles(level) {
  for (let row = 0; row < level.rows; row++) {
    for (let col = 0; col < level.cols; col++) {
      if (level.tiles[row * level.cols + col] === 5) {
        level.checkpoint = {
          x: col * TILE_SIZE + TILE_SIZE / 2,
          y: row * TILE_SIZE + TILE_SIZE / 2,
        };
        return;
      }
    }
  }
  if (level.checkpoint) {
    const col = Math.max(0, Math.min(level.cols - 1, Math.floor(level.checkpoint.x / TILE_SIZE)));
    const row = Math.max(0, Math.min(level.rows - 1, Math.floor(level.checkpoint.y / TILE_SIZE)));
    level.tiles[row * level.cols + col] = 5;
    level.checkpoint = {
      x: col * TILE_SIZE + TILE_SIZE / 2,
      y: row * TILE_SIZE + TILE_SIZE / 2,
    };
  }
}

/** @param {LevelData} raw */
function normalizeLevel(raw) {
  const cols = Math.max(4, raw.cols | 0);
  const rows = Math.max(4, raw.rows | 0);
  const expected = cols * rows;
  let tiles = raw.tiles ? [...raw.tiles] : [];
  if (tiles.length < expected) {
    tiles = tiles.concat(new Array(expected - tiles.length).fill(0));
  } else if (tiles.length > expected) {
    tiles = tiles.slice(0, expected);
  }
  const level = {
    name: raw.name || 'カスタム',
    cols,
    rows,
    tiles,
    orbitRadius: Math.max(40, Math.min(400, raw.orbitRadius ?? 120)),
    orbitSpeed: Math.max(0.5, Math.min(8, raw.orbitSpeed ?? 2.2)),
    spawn: raw.spawn ?? { ax: 80, ay: 200, bx: 200, by: 200 },
    checkpoint: raw.checkpoint ?? null,
  };
  syncCheckpointFromTiles(level);
  return level;
}

/** @param {LevelData} level */
function levelToJSON(level) {
  return JSON.stringify(normalizeLevel(level), null, 2);
}

/** @param {string} text */
function parseLevelJSON(text) {
  return normalizeLevel(JSON.parse(text));
}

/** @param {number} cols @param {number} rows */
function createEmptyLevel(cols, rows) {
  const c = Math.max(4, cols | 0);
  const r = Math.max(4, rows | 0);
  const spawn = {
    ax: 80,
    ay: r * TILE_SIZE * 0.5,
    bx: 200,
    by: r * TILE_SIZE * 0.5,
  };
  const level = normalizeLevel({
    name: '新規ステージ',
    cols: c,
    rows: r,
    orbitRadius: 120,
    orbitSpeed: 2.2,
    tiles: new Array(c * r).fill(0),
    spawn,
    checkpoint: null,
  });
  applySpawnOrbitRadius(level, level.spawn, level.orbitRadius);
  return level;
}
