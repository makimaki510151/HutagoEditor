class LevelEditor {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(level: LevelData) => void} onLevelChange
   */
  constructor(canvas, onLevelChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onLevelChange = onLevelChange;
    /** @type {LevelData} */
    this.level = createEmptyLevel(40, 30);
    this.selectedTile = 1;
    this.spawnMode = false;
    this.camera = { x: 0, y: 0 };
    this.isDrawing = false;
    this.eraseMode = false;
    this.eraseToolActive = false;
    /** @type {'A'|'B'|null} */
    this.dragSpawn = null;
    /** @type {Map<number, { x: number, y: number }>} */
    this._pointers = new Map();
    /** @type {{ x: number, y: number } | null} */
    this._panPrev = null;

    this._onPointerDown = (e) => this.pointerDown(e);
    this._onPointerMove = (e) => this.pointerMove(e);
    this._onPointerUp = (e) => this.pointerUp(e);
    this._onPointerCancel = (e) => this.pointerUp(e);
    this._onWheel = (e) => this.onWheel(e);
    this._onContext = (e) => e.preventDefault();

    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    this.canvas.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerCancel);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', this._onContext);

    this.canvas.width = EDIT_CANVAS_WIDTH;
    this.canvas.height = EDIT_CANVAS_HEIGHT;
  }

  getScrollBounds() {
    const worldW = this.level.cols * TILE_SIZE;
    const worldH = this.level.rows * TILE_SIZE;
    return {
      maxX: Math.max(0, worldW - this.canvas.width),
      maxY: Math.max(0, worldH - this.canvas.height),
    };
  }

  clampCamera() {
    const { maxX, maxY } = this.getScrollBounds();
    this.camera.x = Math.max(0, Math.min(maxX, this.camera.x));
    this.camera.y = Math.max(0, Math.min(maxY, this.camera.y));
  }

  /** @param {LevelData} level */
  loadLevel(level) {
    this.level = normalizeLevel(level);
    this.camera = { x: 0, y: 0 };
    this.clampCamera();
    this.draw();
    this.onLevelChange(this.level);
  }

  /** @param {number} id */
  selectTile(id) {
    const tile = getTile(id);
    if (tile.spawnTool) {
      this.spawnMode = true;
      this.selectedTile = id;
      return;
    }
    this.spawnMode = false;
    this.selectedTile = id;
  }

  setSpawnMode(on) {
    this.spawnMode = on;
    if (on) this.selectedTile = 4;
  }

  /** @param {boolean} on */
  setEraseTool(on) {
    this.eraseToolActive = on;
  }

  /** @returns {{ x: number, y: number } | null} */
  pointerCentroid() {
    const pts = [...this._pointers.values()];
    if (pts.length < 2) return null;
    return {
      x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
      y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
    };
  }

  /** @param {PointerEvent} e */
  worldPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    return { x: sx + this.camera.x, y: sy + this.camera.y };
  }

  /** @param {number} wx @param {number} wy */
  pickSpawnTarget(wx, wy) {
    const sp = this.level.spawn;
    const da = Math.hypot(wx - sp.ax, wy - sp.ay);
    const db = Math.hypot(wx - sp.bx, wy - sp.by);
    return da <= db ? 'A' : 'B';
  }

  /** @param {PointerEvent} e */
  pointerDown(e) {
    this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this._pointers.size >= 2) {
      for (const pid of this._pointers.keys()) {
        try {
          this.canvas.releasePointerCapture(pid);
        } catch {
          /* not captured */
        }
      }
      this.isDrawing = false;
      this.dragSpawn = null;
      this._panPrev = this.pointerCentroid();
      return;
    }

    this.canvas.setPointerCapture(e.pointerId);
    this.isDrawing = true;
    this.eraseMode = this.eraseToolActive || e.button === 2;

    if (this.spawnMode && e.button === 0) {
      const { x, y } = this.worldPos(e);
      this.dragSpawn = this.pickSpawnTarget(x, y);
      this.moveSpawn(e);
      return;
    }

    this.applyAt(e);
  }

  /** @param {PointerEvent} e */
  pointerMove(e) {
    if (this._pointers.has(e.pointerId)) {
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (this._pointers.size >= 2) {
      const c = this.pointerCentroid();
      if (c && this._panPrev) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        this.camera.x -= (c.x - this._panPrev.x) * scaleX;
        this.camera.y -= (c.y - this._panPrev.y) * scaleY;
        this.clampCamera();
        this.draw();
      }
      this._panPrev = this.pointerCentroid();
      return;
    }

    if (!this.isDrawing) return;
    if (this.dragSpawn) {
      this.moveSpawn(e);
      return;
    }
    this.applyAt(e);
  }

  /** @param {PointerEvent} e */
  pointerUp(e) {
    this._pointers.delete(e.pointerId);
    if (this._pointers.size < 2) this._panPrev = null;
    if (this._pointers.size > 0) return;
    this.isDrawing = false;
    this.dragSpawn = null;
  }

  /** @param {PointerEvent} e */
  moveSpawn(e) {
    if (!this.dragSpawn) return;
    const { x, y } = this.worldPos(e);
    moveSpawnChar(this.level, this.level.spawn, x, y, this.dragSpawn, this.level.orbitRadius);
    this.draw();
    this.onLevelChange(this.level);
  }

  /** @param {WheelEvent} e */
  onWheel(e) {
    e.preventDefault();
    if (e.shiftKey) {
      this.camera.x += e.deltaY;
    } else {
      this.camera.y += e.deltaY;
      this.camera.x += e.deltaX;
    }
    this.clampCamera();
    this.draw();
  }

  /** @param {PointerEvent} e */
  applyAt(e) {
    const { x: wx, y: wy } = this.worldPos(e);
    const col = Math.floor(wx / TILE_SIZE);
    const row = Math.floor(wy / TILE_SIZE);

    if (col < 0 || row < 0 || col >= this.level.cols || row >= this.level.rows) return;

    const idx = row * this.level.cols + col;
    const id = this.eraseMode ? 0 : this.selectedTile;

    if (id === 4) return;

    if (id === 5) {
      this.level.tiles[idx] = 5;
    } else if (id !== 0) {
      this.level.tiles[idx] = id;
    } else {
      this.level.tiles[idx] = 0;
    }

    this.draw();
    this.onLevelChange(this.level);
  }

  fillEmpty() {
    this.level.tiles.fill(0);
    this.draw();
    this.onLevelChange(this.level);
  }

  /** @param {number} cols @param {number} rows */
  resizeGrid(cols, rows) {
    const c = Math.max(4, Math.min(200, cols | 0));
    const r = Math.max(4, Math.min(120, rows | 0));
    const next = createEmptyLevel(c, r);
    const minC = Math.min(c, this.level.cols);
    const minR = Math.min(r, this.level.rows);
    for (let row = 0; row < minR; row++) {
      for (let col = 0; col < minC; col++) {
        next.tiles[row * c + col] = this.level.tiles[row * this.level.cols + col];
      }
    }
    next.spawn = { ...this.level.spawn };
    next.orbitRadius = this.level.orbitRadius;
    next.orbitSpeed = this.level.orbitSpeed;
    next.name = this.level.name;
    this.level = next;
    this.clampCamera();
    this.draw();
    this.onLevelChange(this.level);
  }

  /**
   * 適用: グリッド・パラメータ反映＋キャラ間距離を回転距離に合わせる
   * @param {{ cols: number, rows: number, orbitRadius: number, orbitSpeed: number }} opts
   */
  applySettings(opts) {
    const prevCols = this.level.cols;
    const prevRows = this.level.rows;
    if (opts.cols !== prevCols || opts.rows !== prevRows) {
      this.resizeGrid(opts.cols, opts.rows);
    }
    this.level.orbitRadius = Math.max(40, Math.min(400, opts.orbitRadius));
    this.level.orbitSpeed = Math.max(0.5, Math.min(8, opts.orbitSpeed));
    applySpawnOrbitRadius(this.level, this.level.spawn, this.level.orbitRadius);
    this.clampCamera();
    this.draw();
    this.onLevelChange(this.level);
  }

  setLevelName(name) {
    this.level.name = name.trim() || '無題';
    this.onLevelChange(this.level);
  }

  exportJSON() {
    return levelToJSON(this.level);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.fillStyle = '#e0f2fe';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);

    const { cols, rows, tiles } = this.level;
    const worldW = cols * TILE_SIZE;
    const worldH = rows * TILE_SIZE;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, worldW, worldH);

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const id = tiles[row * cols + col];
        drawTileCell(ctx, id, col * TILE_SIZE, row * TILE_SIZE);
      }
    }

    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 2;
    ctx.strokeRect(0.5, 0.5, worldW - 1, worldH - 1);

    const sp = this.level.spawn;
    ctx.fillStyle = 'rgba(59, 130, 246, 0.9)';
    ctx.beginPath();
    ctx.arc(sp.ax, sp.ay, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(236, 72, 153, 0.9)';
    ctx.beginPath();
    ctx.arc(sp.bx, sp.by, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0284c7';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(sp.ax, sp.ay);
    ctx.lineTo(sp.bx, sp.by);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A', sp.ax, sp.ay + 4);
    ctx.fillText('B', sp.bx, sp.by + 4);

    ctx.restore();

    const modeLabel = this.spawnMode ? 'スポーン配置' : getTile(this.selectedTile).name;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(8, h - 44, Math.min(380, w - 16), 36);
    ctx.fillStyle = '#475569';
    ctx.font = '12px sans-serif';
    ctx.fillText(
      `${this.level.name} | ${modeLabel} | 距離:${this.level.orbitRadius}px | 速度:${this.level.orbitSpeed}`,
      14,
      h - 20,
    );
  }
}
