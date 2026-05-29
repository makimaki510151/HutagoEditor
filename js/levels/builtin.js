/** @param {number} cols @param {number} rows @param {(c: number, r: number) => number} fn */
function buildGrid(cols, rows, fn) {
  const tiles = new Array(cols * rows);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      tiles[r * cols + c] = fn(c, r);
    }
  }
  return tiles;
}

/** @param {number} cols @param {number} rows */
function borderWalls(cols, rows) {
  return buildGrid(cols, rows, (c, r) => {
    if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) return 1;
    return 0;
  });
}

/** @type {LevelData[]} */
const BUILTIN_LEVELS = [
  {
    name: 'チュートリアル',
    cols: 60,
    rows: 20,
    orbitRadius: 100,
    orbitSpeed: 2.2,
    spawn: { ax: 120, ay: 280, bx: 220, by: 280 },
    checkpoint: null,
    tiles: (() => {
      const cols = 60;
      const rows = 20;
      const g = borderWalls(cols, rows);
      const set = (c, r, v) => { g[r * cols + c] = v; };
      for (let c = 15; c < 25; c++) set(c, 12, 1);
      set(35, 10, 3);
      return g;
    })(),
  },
  {
    name: '跳ね返り迷路',
    cols: 80,
    rows: 24,
    orbitRadius: 120,
    orbitSpeed: 2.5,
    spawn: { ax: 96, ay: 360, bx: 216, by: 360 },
    checkpoint: null,
    tiles: (() => {
      const cols = 80;
      const rows = 24;
      const g = borderWalls(cols, rows);
      const set = (c, r, v) => { g[r * cols + c] = v; };
      for (let c = 10; c < 18; c++) set(c, 14, 1);
      for (let r = 8; r < 16; r++) set(22, r, 1);
      for (let c = 28; c < 36; c++) set(c, 10, 1);
      for (let r = 6; r < 14; r++) set(40, r, 1);
      set(30, 11, 5);
      for (let c = 50; c < 58; c++) set(c, 12, 2);
      set(55, 14, 6);
      set(68, 11, 3);
      return g;
    })(),
  },
  {
    name: '即死との距離',
    cols: 90,
    rows: 26,
    orbitRadius: 110,
    orbitSpeed: 2.8,
    spawn: { ax: 140, ay: 400, bx: 250, by: 400 },
    checkpoint: null,
    tiles: (() => {
      const cols = 90;
      const rows = 26;
      const g = borderWalls(cols, rows);
      const set = (c, r, v) => { g[r * cols + c] = v; };
      for (let c = 8; c < 20; c++) set(c, 16, 1);
      for (let c = 25; c < 45; c++) set(c, 12, 2);
      for (let c = 32; c < 38; c++) set(c, 14, 6);
      for (let r = 10; r < 18; r++) set(48, r, 1);
      set(30, 11, 5);
      for (let c = 55; c < 70; c++) set(c, 14, 1);
      set(78, 13, 3);
      return g;
    })(),
  },
];
