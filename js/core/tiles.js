/** @typedef {{ id: number, name: string, color: string, solid: boolean, lethalLink: boolean, lethalBody: boolean, goal: boolean, editor: boolean, spawnTool?: boolean }} TileDef */

const TILE_SIZE = 32;
const PLAYER_RADIUS = 12;
/** エディタで縦に見えるマス数（外枠・キャンバス高さと一致） */
const EDITOR_VIEW_ROWS = 20;
/** エディタで横に見えるマス数 */
const EDITOR_VIEW_COLS = 30;
const EDIT_CANVAS_WIDTH = EDITOR_VIEW_COLS * TILE_SIZE;
const EDIT_CANVAS_HEIGHT = EDITOR_VIEW_ROWS * TILE_SIZE;

/** 連結線が触れると死（旧・即死壁） */
const TILE_LINK_DEATH = 2;
/** キャラA/Bが触れると死 */
const TILE_BODY_DEATH = 6;

/** @type {Record<number, TileDef>} */
const TILES = {
  0: { id: 0, name: '空', color: '#e8eef5', solid: false, lethalLink: false, lethalBody: false, goal: false, editor: true },
  1: { id: 1, name: '跳ね返り壁', color: '#94a3b8', solid: true, lethalLink: false, lethalBody: false, goal: false, editor: true },
  2: {
    id: 2,
    name: '線即死（線が触れると死）',
    color: '#e0f2fe',
    solid: true,
    lethalLink: true,
    lethalBody: false,
    goal: false,
    editor: true,
  },
  3: { id: 3, name: 'ゴール', color: '#4ade80', solid: false, lethalLink: false, lethalBody: false, goal: true, editor: true },
  4: { id: 4, name: 'スポーン配置', color: '#60a5fa', solid: false, lethalLink: false, lethalBody: false, goal: false, editor: true, spawnTool: true },
  5: { id: 5, name: '中間P', color: '#fbbf24', solid: false, lethalLink: false, lethalBody: false, goal: false, editor: true },
  6: {
    id: 6,
    name: '体即死（A/Bが触れると死）',
    color: '#fef2f2',
    solid: true,
    lethalLink: false,
    lethalBody: true,
    goal: false,
    editor: true,
  },
};

/** @returns {TileDef} */
function getTile(id) {
  return TILES[id] ?? TILES[0];
}

/** @param {LevelData} level @param {number} col @param {number} row */
function getTileAt(level, col, row) {
  if (col < 0 || row < 0 || col >= level.cols || row >= level.rows) return 1;
  return level.tiles[row * level.cols + col] ?? 0;
}

/** @param {LevelData} level @param {number} x @param {number} y */
function worldToTile(level, x, y) {
  return {
    col: Math.floor(x / TILE_SIZE),
    row: Math.floor(y / TILE_SIZE),
  };
}

/** @param {LevelData} level @param {number} px @param {number} py */
function tileSolidAtWorld(level, px, py) {
  const { col, row } = worldToTile(level, px, py);
  return getTile(getTileAt(level, col, row)).solid;
}

/** @param {LevelData} level @param {number} col @param {number} row */
function isSolidCell(level, col, row) {
  return getTile(getTileAt(level, col, row)).solid;
}

/** @param {number} id */
function isLinkDeathTile(id) {
  return getTile(id).lethalLink;
}

/** @param {number} id */
function isBodyDeathTile(id) {
  return getTile(id).lethalBody;
}
