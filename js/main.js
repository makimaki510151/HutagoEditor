(function init() {
  const tabPlay = document.getElementById('tab-play');
  const tabEdit = document.getElementById('tab-edit');
  const playPanel = document.getElementById('play-panel');
  const editPanel = document.getElementById('edit-panel');
  const gameCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game-canvas'));
  const editCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('edit-canvas'));
  const levelSelect = /** @type {HTMLSelectElement} */ (document.getElementById('level-select'));
  const statusEl = document.getElementById('status');
  const levelJson = /** @type {HTMLTextAreaElement} */ (document.getElementById('level-json'));
  const levelNameInput = /** @type {HTMLInputElement} */ (document.getElementById('level-name'));
  const orbitRadiusInput = /** @type {HTMLInputElement} */ (document.getElementById('orbit-radius'));
  const orbitSpeedInput = /** @type {HTMLInputElement} */ (document.getElementById('orbit-speed'));
  const gridColsInput = /** @type {HTMLInputElement} */ (document.getElementById('grid-cols'));
  const gridRowsInput = /** @type {HTMLInputElement} */ (document.getElementById('grid-rows'));

  /** @param {string} msg @param {string} kind */
  function setStatus(msg, kind = '') {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.className = 'status' + (kind ? ` ${kind}` : '');
  }

  /** @param {LevelData} level */
  function syncEditorFields(level) {
    if (levelNameInput) levelNameInput.value = level.name || '';
    if (orbitRadiusInput) orbitRadiusInput.value = String(level.orbitRadius);
    if (orbitSpeedInput) orbitSpeedInput.value = String(level.orbitSpeed);
    if (gridColsInput) gridColsInput.value = String(level.cols);
    if (gridRowsInput) gridRowsInput.value = String(level.rows);
  }

  function readApplyOptions() {
    return {
      cols: Number(gridColsInput?.value),
      rows: Number(gridRowsInput?.value),
      orbitRadius: Number(orbitRadiusInput?.value),
      orbitSpeed: Number(orbitSpeedInput?.value),
    };
  }

  const game = new HutagoGame(gameCanvas, setStatus);
  const editor = new LevelEditor(editCanvas, () => {});

  BUILTIN_LEVELS.forEach((lv, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = lv.name || `ステージ ${i + 1}`;
    levelSelect.appendChild(opt);
  });

  function loadPlayLevel(level) {
    game.loadLevel(level);
    if (!game.running) game.start();
    else game.draw();
  }

  function loadBuiltin(index) {
    loadPlayLevel(normalizeLevel(structuredClone(BUILTIN_LEVELS[Number(index)])));
  }

  levelSelect.addEventListener('change', () => loadBuiltin(levelSelect.value));

  document.getElementById('btn-restart')?.addEventListener('click', () => {
    game.reset(!!game.respawn);
  });

  document.getElementById('level-import')?.addEventListener('change', async (e) => {
    const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      loadPlayLevel(parseLevelJSON(text));
      setStatus(`読込: ${file.name}`, '');
    } catch {
      setStatus('JSONの読込に失敗しました', 'lose');
    }
    /** @type {HTMLInputElement} */ (e.target).value = '';
  });

  function switchTab(mode) {
    const isPlay = mode === 'play';
    tabPlay.classList.toggle('active', isPlay);
    tabEdit.classList.toggle('active', !isPlay);
    playPanel.classList.toggle('active', isPlay);
    editPanel.classList.toggle('active', !isPlay);
    game.setInputEnabled(isPlay);
    if (isPlay) {
      loadPlayLevel(editor.level);
    } else {
      syncEditorFields(editor.level);
      editor.clampCamera();
      editor.draw();
    }
  }

  tabPlay.addEventListener('click', () => switchTab('play'));
  tabEdit.addEventListener('click', () => switchTab('edit'));

  const palette = document.getElementById('tile-palette');
  Object.values(TILES).filter((t) => t.editor).forEach((tile) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.dataset.tileId = String(tile.id);
    btn.innerHTML = `<span class="swatch" style="background:${tile.color}"></span>${tile.name}`;
    btn.addEventListener('click', () => {
      palette.querySelectorAll('button').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      editor.selectTile(tile.id);
      editor.draw();
    });
    if (tile.id === 1) btn.classList.add('active');
    palette.appendChild(btn);
  });

  levelNameInput?.addEventListener('input', () => {
    editor.setLevelName(levelNameInput.value);
  });

  document.getElementById('btn-apply')?.addEventListener('click', () => {
    editor.applySettings(readApplyOptions());
    syncEditorFields(editor.level);
  });

  document.getElementById('btn-fill-empty')?.addEventListener('click', () => {
    if (confirm('すべてのタイルを空にしますか？')) editor.fillEmpty();
  });

  document.getElementById('btn-export')?.addEventListener('click', () => {
    levelJson.value = editor.exportJSON();
  });

  document.getElementById('btn-download')?.addEventListener('click', () => {
    const json = editor.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${editor.level.name || 'stage'}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    levelJson.value = json;
  });

  document.getElementById('edit-import')?.addEventListener('change', async (e) => {
    const file = /** @type {HTMLInputElement} */ (e.target).files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      editor.loadLevel(parseLevelJSON(text));
      syncEditorFields(editor.level);
      levelJson.value = levelToJSON(editor.level);
    } catch {
      alert('JSONの読込に失敗しました');
    }
    /** @type {HTMLInputElement} */ (e.target).value = '';
  });

  editor.loadLevel(normalizeLevel(structuredClone(BUILTIN_LEVELS[0])));
  syncEditorFields(editor.level);
  loadBuiltin(0);
  switchTab('play');
})();
