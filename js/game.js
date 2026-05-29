/** @typedef {'A'|'B'} PivotId */

class HutagoGame {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {(msg: string, kind?: string) => void} onStatus
   */
  constructor(canvas, onStatus) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStatus = onStatus;
    /** @type {LevelData | null} */
    this.level = null;
    this.running = false;
    this.state = 'playing';
    this.camera = { x: 0, y: 0 };
    this.inputEnabled = true;

    this.ax = 0;
    this.ay = 0;
    this.bx = 0;
    this.by = 0;
    /** @type {PivotId} */
    this.pivot = 'A';
    this.angle = 0;
    this.omega = 2.2;
    this.orbitRadius = 120;
    this.orbitSpeed = 2.2;
    this.respawn = null;
    this.checkpointSaved = false;
    this.checkpointFx = 0;
    this.checkpointFxPos = { x: 0, y: 0 };
    this._gamepadPrev = { left: false, right: false, x: false };

    this._last = 0;
    this._boundLoop = (t) => this.loop(t);
    this._onKeyDown = (e) => this.handleKey(e);
    this._onPointerDown = (e) => this.handlePointer(e);
  }

  /** @param {LevelData} level */
  loadLevel(level) {
    this.level = normalizeLevel(level);
    this.orbitRadius = this.level.orbitRadius;
    this.orbitSpeed = this.level.orbitSpeed;
    this.respawn = null;
    this.checkpointSaved = false;
    this.checkpointFx = 0;
    this.reset(false);
    this.onStatus('Q=左回り切替 / E=右回り切替', '');
  }

  reset(useCheckpoint) {
    if (!this.level) return;
    if (!useCheckpoint || !this.respawn) {
      this.checkpointSaved = false;
      this.respawn = null;
    }
    const src = useCheckpoint && this.respawn ? this.respawn : this.level.spawn;
    this.ax = src.ax;
    this.ay = src.ay;
    this.bx = src.bx;
    this.by = src.by;
    this.pivot = 'A';
    this.angle = Math.atan2(this.by - this.ay, this.bx - this.ax);
    this.omega = this.orbitSpeed;
    this.state = 'playing';
    this.alignOrbitDistance();
    if (this.level) {
      const a = placeCharacterSafe(this.level, this.ax, this.ay);
      this.ax = a.x;
      this.ay = a.y;
      const b = placeCharacterSafe(this.level, this.bx, this.by);
      this.bx = b.x;
      this.by = b.y;
      this.alignOrbitDistance();
      const b2 = placeCharacterSafe(this.level, this.bx, this.by);
      this.bx = b2.x;
      this.by = b2.y;
      this.syncAngleFromPositions();
    }
    this.onStatus('プレイ中', '');
  }

  alignOrbitDistance() {
    const px = this.pivot === 'A' ? this.ax : this.bx;
    const py = this.pivot === 'A' ? this.ay : this.by;
    let ox = this.pivot === 'A' ? this.bx : this.ax;
    let oy = this.pivot === 'A' ? this.by : this.ay;
    const dx = ox - px;
    const dy = oy - py;
    const dist = Math.hypot(dx, dy) || 1;
    const s = this.orbitRadius / dist;
    ox = px + dx * s;
    oy = py + dy * s;
    if (this.pivot === 'A') {
      this.bx = ox;
      this.by = oy;
    } else {
      this.ax = ox;
      this.ay = oy;
    }
    this.angle = Math.atan2(oy - py, ox - px);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this._last = performance.now();
    window.addEventListener('keydown', this._onKeyDown);
    this.canvas.addEventListener('pointerdown', this._onPointerDown);
    requestAnimationFrame(this._boundLoop);
  }

  stop() {
    this.running = false;
    window.removeEventListener('keydown', this._onKeyDown);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
  }

  setInputEnabled(on) {
    this.inputEnabled = on;
  }

  /** @param {KeyboardEvent} e */
  handleKey(e) {
    if (!this.level || !this.inputEnabled) return;
    const k = e.code;
    if (k === 'KeyQ' || k === 'KeyE' || k === 'KeyR') e.preventDefault();
    if (e.repeat) return;
    if (k === 'KeyQ' && this.state === 'playing') {
      this.swapPivot(-1);
      return;
    }
    if (k === 'KeyE' && this.state === 'playing') {
      this.swapPivot(1);
      return;
    }
    if (k === 'KeyR') {
      this.reset(!!this.respawn);
    }
  }

  /** @param {PointerEvent} e */
  handlePointer(e) {
    if (!this.level || !this.inputEnabled || this.state !== 'playing') return;
    if (!e.isPrimary) return;
    const world = this.pointerToWorld(e);
    const dir = this.pickControlDirection(world.x, world.y);
    if (dir !== 0) this.swapPivot(dir);
  }

  /** @param {PointerEvent} e */
  pointerToWorld(e) {
    const rect = this.canvas.getBoundingClientRect();
    const sx = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    const sy = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    return { x: sx + this.camera.x, y: sy + this.camera.y };
  }

  /**
   * @param {number} cx @param {number} cy @param {number} angle
   * @param {number} offset @param {number} visualR @param {number} hitR
   */
  getControlsAt(cx, cy, angle, offset, visualR, hitR) {
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);
    return {
      center: { x: cx, y: cy },
      Q: { x: cx + sin * offset, y: cy - cos * offset },
      E: { x: cx - sin * offset, y: cy + cos * offset },
      angle,
      visualRadius: visualR,
      hitRadius: hitR,
    };
  }

  /** 軸・周回側のQ/Eレイアウト（接続線に垂直） */
  getPivotControlLayout() {
    const px = this.pivot === 'A' ? this.ax : this.bx;
    const py = this.pivot === 'A' ? this.ay : this.by;
    const ox = this.pivot === 'A' ? this.bx : this.ax;
    const oy = this.pivot === 'A' ? this.by : this.ay;
    const angle = this.angle;
    return {
      pivot: this.getControlsAt(px, py, angle, 50, 18, 32),
      orbiter: this.getControlsAt(ox, oy, angle, 36, 11, 22),
    };
  }

  /**
   * @param {{ Q: {x:number,y:number}, E: {x:number,y:number}, hitRadius: number }} group
   * @param {number} wx @param {number} wy
   * @returns {number|null}
   */
  pickFromControlGroup(group, wx, wy) {
    const dQ = Math.hypot(wx - group.Q.x, wy - group.Q.y);
    const dE = Math.hypot(wx - group.E.x, wy - group.E.y);
    const r = group.hitRadius;
    if (dQ <= r && dQ <= dE) return -1;
    if (dE <= r) return 1;
    return null;
  }

  /** @param {number} wx @param {number} wy @returns {-1|0|1} */
  pickControlDirection(wx, wy) {
    const layout = this.getPivotControlLayout();
    const hits = [
      this.pickFromControlGroup(layout.pivot, wx, wy),
      this.pickFromControlGroup(layout.orbiter, wx, wy),
    ].filter((h) => h !== null);
    if (hits.length > 0) return /** @type {-1|1} */ (hits[0]);

    const p = layout.pivot.center;
    const dx = wx - p.x;
    const dy = wy - p.y;
    const qSide = Math.sin(layout.pivot.angle) * dx - Math.cos(layout.pivot.angle) * dy;
    if (Math.abs(qSide) < 18) return 0;
    return qSide > 0 ? -1 : 1;
  }

  /** @param {number} direction -1=左回り(Q) / +1=右回り(E) */
  swapPivot(direction) {
    this.pivot = this.pivot === 'A' ? 'B' : 'A';
    this.omega = -direction * this.orbitSpeed;
    const px = this.pivot === 'A' ? this.ax : this.bx;
    const py = this.pivot === 'A' ? this.ay : this.by;
    const ox = this.pivot === 'A' ? this.bx : this.ax;
    const oy = this.pivot === 'A' ? this.by : this.ay;
    this.angle = Math.atan2(oy - py, ox - px);
  }

  /** @returns {{ x: number, y: number }} */
  getOrbiterPos() {
    const px = this.pivot === 'A' ? this.ax : this.bx;
    const py = this.pivot === 'A' ? this.ay : this.by;
    return {
      x: px + Math.cos(this.angle) * this.orbitRadius,
      y: py + Math.sin(this.angle) * this.orbitRadius,
    };
  }

  /** @param {number} x @param {number} y */
  setOrbiterPos(x, y) {
    if (this.pivot === 'A') {
      this.bx = x;
      this.by = y;
    } else {
      this.ax = x;
      this.ay = y;
    }
  }

  syncAngleFromPositions() {
    const px = this.pivot === 'A' ? this.ax : this.bx;
    const py = this.pivot === 'A' ? this.ay : this.by;
    const ox = this.pivot === 'A' ? this.bx : this.ax;
    const oy = this.pivot === 'A' ? this.by : this.ay;
    this.angle = Math.atan2(oy - py, ox - px);
  }

  /** @param {number} dt */
  /** ゲームパッド: 十字←→ = Q/E、X = R */
  pollGamepad() {
    if (!this.inputEnabled || !this.level || !navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const gp = pads[0] || Array.from(pads).find((p) => p);
    if (!gp) return;

    const btn = (i) => !!(gp.buttons[i]?.pressed || (gp.buttons[i]?.value ?? 0) > 0.55);
    const left = btn(14) || gp.axes[0] < -0.55;
    const right = btn(15) || gp.axes[0] > 0.55;
    const xBtn = btn(2);

    const prev = this._gamepadPrev;
    if (left && !prev.left && this.state === 'playing') this.swapPivot(-1);
    if (right && !prev.right && this.state === 'playing') this.swapPivot(1);
    if (xBtn && !prev.x) this.reset(!!this.respawn);

    this._gamepadPrev = { left, right, x: xBtn };
  }

  /** @param {number} x @param {number} y */
  activateCheckpoint(x, y) {
    if (this.checkpointSaved || this.state !== 'playing') return;
    this.checkpointSaved = true;
    this.respawn = { ax: this.ax, ay: this.ay, bx: this.bx, by: this.by };
    this.checkpointFxPos = { x, y };
    this.checkpointFx = 1.4;
    this.onStatus('中間地点を記録しました！ Rでここから再開', 'checkpoint');
  }

  update(dt) {
    if (!this.level) return;
    this.pollGamepad();
    if (this.checkpointFx > 0) {
      this.checkpointFx = Math.max(0, this.checkpointFx - dt);
    }
    if (this.state !== 'playing') return;

    const r = PLAYER_RADIUS;
    const px = this.pivot === 'A' ? this.ax : this.bx;
    const py = this.pivot === 'A' ? this.ay : this.by;
    const old = this.getOrbiterPos();
    const newAngle = this.angle + this.omega * dt;
    const proposed = {
      x: px + Math.cos(newAngle) * this.orbitRadius,
      y: py + Math.sin(newAngle) * this.orbitRadius,
    };

    let bounced = false;

    if (circleOverlapsSolid(this.level, old.x, old.y, r)) {
      const fixed = resolveCircleFromSolids(this.level, old.x, old.y, r);
      this.setOrbiterPos(fixed.x, fixed.y);
      this.syncAngleFromPositions();
    }

    const sweep = sweepCircleSolid(this.level, old.x, old.y, proposed.x, proposed.y, r);

    if (sweep.hit) {
      this.setOrbiterPos(sweep.x, sweep.y);
      this.syncAngleFromPositions();
      if (!bounced) {
        const tx = -Math.sin(this.angle);
        const ty = Math.cos(this.angle);
        const vx = this.omega * this.orbitRadius * tx;
        const vy = this.omega * this.orbitRadius * ty;
        const dot = vx * sweep.nx + vy * sweep.ny;
        if (dot < 0) {
          const sign = Math.sign(this.omega) || 1;
          this.omega = -sign * this.orbitSpeed;
        }
        bounced = true;
      }
    } else {
      this.angle = newAngle;
      this.setOrbiterPos(proposed.x, proposed.y);
    }

    const o = this.getOrbiterPos();
    if (circleOverlapsSolid(this.level, o.x, o.y, r)) {
      const fixed = resolveCircleFromSolids(this.level, o.x, o.y, r);
      this.setOrbiterPos(fixed.x, fixed.y);
      this.syncAngleFromPositions();
    }

    this.checkTriggers();
    this.updateCamera();
  }

  /** @param {number} x1 @param {number} y1 @param {number} x2 @param {number} y2 */
  segmentHitsLinkDeath(x1, y1, x2, y2) {
    if (!this.level) return false;
    const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / 6);
    for (let i = 0; i <= steps; i++) {
      const t = i / Math.max(1, steps);
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const { col, row } = worldToTile(this.level, x, y);
      if (isLinkDeathTile(getTileAt(this.level, col, row))) return true;
    }
    return false;
  }

  /** @param {number} px @param {number} py @param {number} r */
  circleHitsBodyDeath(px, py, r) {
    if (!this.level) return false;
    const pad = r + 2;
    const c0 = Math.floor((px - pad) / TILE_SIZE);
    const c1 = Math.floor((px + pad) / TILE_SIZE);
    const r0 = Math.floor((py - pad) / TILE_SIZE);
    const r1 = Math.floor((py + pad) / TILE_SIZE);
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        if (isBodyDeathTile(getTileAt(this.level, col, row))) return true;
      }
    }
    return false;
  }

  checkTriggers() {
    if (!this.level) return;

    if (this.segmentHitsLinkDeath(this.ax, this.ay, this.bx, this.by)) {
      this.state = 'dead';
      this.onStatus('連結線が線即死壁に触れました！ Rでリスタート', 'lose');
      return;
    }

    if (this.circleHitsBodyDeath(this.ax, this.ay, PLAYER_RADIUS)) {
      this.state = 'dead';
      this.onStatus('Aが体即死壁に触れました！ Rでリスタート', 'lose');
      return;
    }
    if (this.circleHitsBodyDeath(this.bx, this.by, PLAYER_RADIUS)) {
      this.state = 'dead';
      this.onStatus('Bが体即死壁に触れました！ Rでリスタート', 'lose');
      return;
    }

    const points = [{ x: this.ax, y: this.ay }, { x: this.bx, y: this.by }];
    for (const p of points) {
      const { col, row } = worldToTile(this.level, p.x, p.y);
      const id = getTileAt(this.level, col, row);
      const tile = getTile(id);
      if (tile.goal) {
        this.state = 'win';
        this.onStatus('ゴール！おめでとう！', 'win');
        return;
      }
      if (id === 5 && !this.checkpointSaved) {
        const cx = col * TILE_SIZE + TILE_SIZE / 2;
        const cy = row * TILE_SIZE + TILE_SIZE / 2;
        this.activateCheckpoint(cx, cy);
      }
    }

    if (this.level.checkpoint && !this.checkpointSaved) {
      const cp = this.level.checkpoint;
      if (Math.min(
        Math.hypot(this.ax - cp.x, this.ay - cp.y),
        Math.hypot(this.bx - cp.x, this.by - cp.y),
      ) < TILE_SIZE) {
        this.activateCheckpoint(cp.x, cp.y);
      }
    }
  }

  updateCamera() {
    const mx = (this.ax + this.bx) * 0.5;
    const my = (this.ay + this.by) * 0.5;
    this.camera.x = mx - this.canvas.width * 0.5;
    this.camera.y = my - this.canvas.height * 0.5;
  }

  /** @param {number} t */
  loop(t) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this._last) / 1000);
    this._last = t;
    this.update(dt);
    this.draw();
    requestAnimationFrame(this._boundLoop);
  }

  draw() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    if (!this.level) return;

    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-this.camera.x, -this.camera.y);
    this.drawLevel();
    this.drawConnection();
    this.drawCharacter(this.ax, this.ay, '#3b82f6', 'A', this.pivot === 'A');
    this.drawCharacter(this.bx, this.by, '#ec4899', 'B', this.pivot === 'B');
    if (this.state === 'playing') this.drawPivotControls();
    this.drawCheckpointFx(ctx);
    ctx.restore();
    this.drawHud();
    this.drawCheckpointBanner();
  }

  /** @param {CanvasRenderingContext2D} ctx */
  drawCheckpointFx(ctx) {
    if (this.checkpointFx <= 0) return;
    const { x, y } = this.checkpointFxPos;
    const t = this.checkpointFx / 1.4;
    const fade = Math.min(1, t * 2);

    for (let i = 0; i < 4; i++) {
      const p = 1 - t + i * 0.12;
      const r = 16 + p * 70;
      ctx.strokeStyle = `rgba(34, 197, 94, ${fade * (0.55 - i * 0.1)})`;
      ctx.lineWidth = 4 - i * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(34, 197, 94, ${fade * 0.35})`;
    ctx.beginPath();
    ctx.arc(x, y, 28 + (1 - t) * 12, 0, Math.PI * 2);
    ctx.fill();

    const check = 14;
    ctx.strokeStyle = `rgba(255, 255, 255, ${fade * 0.95})`;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x - check * 0.55, y + check * 0.05);
    ctx.lineTo(x - check * 0.05, y + check * 0.55);
    ctx.lineTo(x + check * 0.65, y - check * 0.45);
    ctx.stroke();
  }

  drawCheckpointBanner() {
    if (this.checkpointFx <= 0) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const t = this.checkpointFx / 1.4;
    const alpha = Math.min(1, t * 1.8) * (t > 0.15 ? 1 : t / 0.15);
    const slide = (1 - t) * 24;

    ctx.save();
    ctx.fillStyle = `rgba(34, 197, 94, ${alpha * 0.92})`;
    const bw = 320;
    const bh = 44;
    const bx = (w - bw) / 2;
    const by = 52 - slide;
    ctx.beginPath();
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(bx, by, bw, bh, 10);
    } else {
      ctx.rect(bx, by, bw, bh);
    }
    ctx.fill();
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('中間地点 記録！', w / 2, by + bh / 2);
    ctx.restore();
  }

  drawLevel() {
    if (!this.level) return;
    const { cols, rows, tiles } = this.level;
    const startCol = Math.max(0, Math.floor(this.camera.x / TILE_SIZE) - 1);
    const endCol = Math.min(cols, Math.ceil((this.camera.x + this.canvas.width) / TILE_SIZE) + 1);
    const startRow = Math.max(0, Math.floor(this.camera.y / TILE_SIZE) - 1);
    const endRow = Math.min(rows, Math.ceil((this.camera.y + this.canvas.height) / TILE_SIZE) + 1);

    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        const id = tiles[row * cols + col];
        if (id === 5 && this.checkpointSaved) continue;
        drawTileCell(this.ctx, id, col * TILE_SIZE, row * TILE_SIZE);
      }
    }
  }

  drawConnection() {
    const ctx = this.ctx;
    const linkDanger = this.segmentHitsLinkDeath(this.ax, this.ay, this.bx, this.by);
    ctx.strokeStyle = linkDanger ? 'rgba(220, 38, 38, 0.95)' : 'rgba(14, 165, 233, 0.75)';
    ctx.lineWidth = linkDanger ? 4 : 3;
    ctx.beginPath();
    ctx.moveTo(this.ax, this.ay);
    ctx.lineTo(this.bx, this.by);
    ctx.stroke();
  }

  drawCharacter(x, y, color, label, isPivot) {
    const ctx = this.ctx;
    const bodyDanger = this.circleHitsBodyDeath(x, y, PLAYER_RADIUS);
    ctx.fillStyle = bodyDanger ? '#dc2626' : color;
    ctx.beginPath();
    ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    if (isPivot) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, PLAYER_RADIUS + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, y + 4);
  }

  drawHud() {
    const ctx = this.ctx;
    const orb = this.pivot === 'A' ? 'B' : 'A';
    const pivotLabel = `${this.pivot === 'A' ? 'A' : 'B'}が軸 → ${orb}が周回`;
    const label = this.checkpointSaved ? `${pivotLabel} ｜中間地点✓` : pivotLabel;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(8, 8, this.checkpointSaved ? 260 : 200, 28);
    ctx.fillStyle = this.checkpointSaved ? '#15803d' : '#334155';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(label, 16, 27);
  }

  drawPivotControls() {
    const ctx = this.ctx;
    const layout = this.getPivotControlLayout();

    ctx.save();
    for (const group of [layout.pivot, layout.orbiter]) {
      ctx.globalAlpha = group === layout.orbiter ? 0.22 : 0.35;
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(group.center.x, group.center.y);
      ctx.lineTo(group.Q.x, group.Q.y);
      ctx.moveTo(group.center.x, group.center.y);
      ctx.lineTo(group.E.x, group.E.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    this.drawControlButton(ctx, layout.pivot.Q, -1, layout.pivot.visualRadius);
    this.drawControlButton(ctx, layout.pivot.E, 1, layout.pivot.visualRadius);
    this.drawControlButton(ctx, layout.orbiter.Q, -1, layout.orbiter.visualRadius);
    this.drawControlButton(ctx, layout.orbiter.E, 1, layout.orbiter.visualRadius);

    ctx.restore();
  }

  /**
   * @param {CanvasRenderingContext2D} ctx
   * @param {{ x: number, y: number }} pos
   * @param {number} dir
   * @param {number} visualR
   */
  drawControlButton(ctx, pos, dir, visualR) {
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.globalAlpha = 0.38;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(0, 0, visualR, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.62;
    ctx.fillStyle = '#475569';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(dir < 0 ? 'Q' : 'E', 0, 1);

    ctx.restore();
  }
}
