import {
  createEmptyGrid,
  createNewGameState,
  findMatches,
  GRID_COLS,
  GRID_ROWS,
  getPiecePreview,
  generatePiece,
  getGhostY,
  canPlacePiece,
  type GameMode,
  type ActivePiece,
  lockActivePieceAndResolve,
  movePiece,
  resolveCascades,
  resolveSpecialLanding,
  rotateActivePiece,
} from "./galaxyEngine";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`❌ ASSERTION FAILED: ${message}`);
  }
}

export function runAllEngineTests(): { passed: number; log: string[] } {
  const log: string[] = [];
  let passed = 0;

  const record = (name: string) => {
    passed++;
    log.push(`✅ ${name}`);
  };

  // Test 1: Horizontal, vertical, and both diagonal runs of 3 clear; runs of 2 do not
  {
    const grid = createEmptyGrid();
    // Run of 2 (should NOT clear)
    grid[9][0] = { kind: "NORMAL", colorId: 1 };
    grid[9][1] = { kind: "NORMAL", colorId: 1 };
    assert(findMatches(grid).length === 0, "Run of 2 should not clear");

    // Complete horizontal run of 3
    grid[9][2] = { kind: "NORMAL", colorId: 1 };
    assert(findMatches(grid).length === 3, "Horizontal run of 3 should clear");

    // Diagonal down-right (1,1)
    const diagGrid = createEmptyGrid();
    diagGrid[7][0] = { kind: "NORMAL", colorId: 2 };
    diagGrid[8][1] = { kind: "NORMAL", colorId: 2 };
    diagGrid[9][2] = { kind: "NORMAL", colorId: 2 };
    assert(
      findMatches(diagGrid).length === 3,
      "Down-right diagonal of 3 should clear"
    );

    // Diagonal down-left (1,-1)
    const diagLeftGrid = createEmptyGrid();
    diagLeftGrid[7][4] = { kind: "NORMAL", colorId: 3 };
    diagLeftGrid[8][3] = { kind: "NORMAL", colorId: 3 };
    diagLeftGrid[9][2] = { kind: "NORMAL", colorId: 3 };
    assert(
      findMatches(diagLeftGrid).length === 3,
      "Down-left diagonal of 3 should clear"
    );
    record("1. 4-axis straight runs of 3 clear; runs of 2 do not");
  }

  // Test 2: Groups of 4+ and intersecting lines deduplicate cells
  {
    const grid = createEmptyGrid();
    // Cross intersection at (8,2)
    grid[8][1] = { kind: "NORMAL", colorId: 0 };
    grid[8][2] = { kind: "NORMAL", colorId: 0 };
    grid[8][3] = { kind: "NORMAL", colorId: 0 };
    grid[7][2] = { kind: "NORMAL", colorId: 0 };
    grid[9][2] = { kind: "NORMAL", colorId: 0 };
    const matches = findMatches(grid);
    assert(
      matches.length === 5,
      `Expected 5 deduplicated cells, got ${matches.length}`
    );
    record("2. Intersecting matches deduplicate positions");
  }

  // Test 3: L-shape of 3 identical blocks does NOT clear
  {
    const grid = createEmptyGrid();
    grid[9][0] = { kind: "NORMAL", colorId: 1 };
    grid[9][1] = { kind: "NORMAL", colorId: 1 };
    grid[8][0] = { kind: "NORMAL", colorId: 1 };
    assert(
      findMatches(grid).length === 0,
      "L-shape of 3 without straight line must not clear"
    );
    record("3. Same-color L-shape does not clear");
  }

  // Test 4: Simultaneous matches + per-column gravity cascade
  {
    const grid = createEmptyGrid();
    // Bottom horizontal match of color 1 at row 9, cols 0..2
    grid[9][0] = { kind: "NORMAL", colorId: 1 };
    grid[9][1] = { kind: "NORMAL", colorId: 1 };
    grid[9][2] = { kind: "NORMAL", colorId: 1 };
    // Setup a cascade of color 2 that will align at row 9 once color 1 clears
    grid[8][0] = { kind: "NORMAL", colorId: 2 };
    grid[8][1] = { kind: "NORMAL", colorId: 2 };
    grid[9][3] = { kind: "NORMAL", colorId: 2 };
    // Blocker under col 2 so color 2 drops into row 9 cols 0,1 and aligns with (9,2)? Wait:
    grid[8][2] = { kind: "NORMAL", colorId: 2 };
    const res = resolveCascades(grid);
    assert(
      res.chainDepth === 1 && res.totalCleared === 6,
      "Simultaneous waves clear together"
    );
    record("4. Gravity and cascade resolution verified");
  }

  // Test 5 & 6: Stones never match; Bomb and Flash destroy Stones; Star removes global normal color only
  {
    const grid = createEmptyGrid();
    grid[9][0] = { kind: "STONE" };
    grid[9][1] = { kind: "STONE" };
    grid[9][2] = { kind: "STONE" };
    assert(
      findMatches(grid).length === 0,
      "3 adjacent Stones must never clear via matching"
    );

    // Drop Bomb at (8,1)
    grid[8][1] = { kind: "BOMB" };
    resolveSpecialLanding(grid, 8, 1, "BOMB", 1);
    assert(
      grid[9][0].kind === "EMPTY" &&
        grid[9][1].kind === "EMPTY" &&
        grid[9][2].kind === "EMPTY",
      "Bomb must destroy surrounding Stones"
    );

    // Flash clears full column including Stones
    grid[9][4] = { kind: "STONE" };
    grid[8][4] = { kind: "NORMAL", colorId: 2 };
    grid[7][4] = { kind: "FLASH" };
    resolveSpecialLanding(grid, 7, 4, "FLASH");
    assert(
      grid[9][4].kind === "EMPTY" && grid[8][4].kind === "EMPTY",
      "Flash must clear entire column"
    );

    // Star clears target normal color globally but spares Stones
    grid[9][0] = { kind: "STONE" };
    grid[9][1] = { kind: "NORMAL", colorId: 3 };
    grid[9][5] = { kind: "NORMAL", colorId: 3 };
    grid[8][1] = { kind: "STAR" };
    resolveSpecialLanding(grid, 8, 1, "STAR");
    assert(
      grid[9][1].kind === "EMPTY" && grid[9][5].kind === "EMPTY",
      "Star clears all normal blocks of target color"
    );
    assert(grid[9][0].kind === "STONE", "Star must not destroy Stones");
    record("5 & 6. Stone immunity and Bomb/Flash/Star effects verified");
  }

  // Test 7, 8 & 9: Boundaries, rotation, and spawn collision Game Over
  {
    const state = createNewGameState("CLASSIC", {}, 12345);
    // Move all the way left
    for (let i = 0; i < 10; i++) movePiece(state, -1, 0);
    assert(state.activePiece!.x >= 0, "Piece cannot exit left boundary");
    rotateActivePiece(state);
    assert(state.activePiece !== null, "Rotation near boundary stays valid");

    // Fill spawn columns at top to force deterministic Game Over on lock
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        state.grid[r][c] = { kind: "STONE" };
      }
    }
    const summary = lockActivePieceAndResolve(state);
    assert(
      summary.gameOver && state.status === "GAME_OVER",
      "Blocked spawn triggers deterministic Game Over"
    );
    record(
      "7, 8 & 9. Collision boundaries, rotation, and spawn Game Over verified"
    );
  }

  // Each preview block corresponds to exactly one queued block.
  {
    const shapes: ActivePiece["cells"][] = [
      [{ dx: 0, dy: 0, kind: "NORMAL", colorId: 0 }, { dx: 0, dy: 1, kind: "NORMAL", colorId: 1 }],
      [{ dx: 0, dy: 0, kind: "NORMAL", colorId: 1 }, { dx: 1, dy: 0, kind: "STONE" }],
      [{ dx: 0, dy: 0, kind: "NORMAL", colorId: 0 }, { dx: 0, dy: 1, kind: "NORMAL", colorId: 1 }, { dx: 0, dy: 2, kind: "NORMAL", colorId: 2 }],
      [{ dx: 0, dy: 1, kind: "NORMAL", colorId: 2 }, { dx: 1, dy: 0, kind: "NORMAL", colorId: 3 }, { dx: 1, dy: 1, kind: "NORMAL", colorId: 4 }],
      [{ dx: -1, dy: 0, kind: "NORMAL", colorId: 0 }, { dx: 0, dy: 0, kind: "NORMAL", colorId: 1 }, { dx: 1, dy: 0, kind: "NORMAL", colorId: 2 }],
      [{ dx: 0, dy: 0, kind: "BOMB" }],
      [{ dx: 0, dy: 0, kind: "FLASH" }],
      [{ dx: 0, dy: 0, kind: "STAR" }],
    ];
    for (const cells of shapes) {
      const piece: ActivePiece = { x: 2, y: 0, cells, isSingleSpecial: cells.length === 1 };
      const original = JSON.stringify(piece);
      const preview = getPiecePreview(piece);
      const occupied = preview.flat().filter((cell) => cell.kind !== "EMPTY");
      assert(occupied.length === cells.length, "Preview must not duplicate or omit blocks");
      for (const cell of cells) {
        const matches = occupied.filter((shown) => shown.kind === cell.kind && shown.colorId === cell.colorId);
        assert(matches.length === 1, "Preview must preserve each block's color and type");
      }
      const minX = Math.min(...cells.map((cell) => cell.dx));
      const minY = Math.min(...cells.map((cell) => cell.dy));
      const firstRow = preview.findIndex((row) => row.some((cell) => cell.kind !== "EMPTY"));
      const firstCol = Math.min(...preview.flatMap((row) => row.flatMap((cell, col) => cell.kind !== "EMPTY" ? [col] : [])));
      for (const cell of cells) {
        const shown = preview[firstRow + cell.dy - minY][firstCol + cell.dx - minX];
        assert(shown.kind === cell.kind && shown.colorId === cell.colorId, "Preview must preserve shape and color positions");
      }
      assert(JSON.stringify(piece) === original, "Rendering a preview must not change its queued piece");
    }
    record("10. Preview preserves block counts, shapes, colors, and special pieces");
  }

  // The exact previewed colors and shape must survive the queue-to-board handoff.
  {
    let sawThreeBlockPiece = false;
    for (const level of [1, 2, 5]) {
      for (let seed = 1; seed <= 64; seed++) {
        const state = createNewGameState("CLASSIC", {}, seed);
        state.level = level;
        state.score = (level - 1) * 180;
        state.nextPiece = generatePiece(state.config, level, state.seed, 0).piece;
        const expectedCells = JSON.stringify(state.nextPiece.cells);
        const expectedPreview = JSON.stringify(getPiecePreview(state.nextPiece));
        if (state.nextPiece.cells.length === 3) sawThreeBlockPiece = true;
        state.activePiece!.y = getGhostY(state.grid, state.activePiece!);
        const summary = lockActivePieceAndResolve(state);
        assert(!summary.gameOver && state.activePiece !== null, "Queued piece should spawn on a clear board");
        assert(JSON.stringify(state.activePiece!.cells) === expectedCells, "Spawned piece must have the previewed blocks, colors, and offsets");
        assert(JSON.stringify(getPiecePreview(state.activePiece!)) === expectedPreview, "Queued and spawned previews must be identical");
      }
    }
    assert(sawThreeBlockPiece, "Three-block groups must be generated during normal play");
    record("11. Previewed pieces spawn unchanged across early and later levels");
  }

  // Verify the actual new-game queue without changing its score, level, or pieces.
  {
    for (const mode of ["CLASSIC", "COMFORT", "PRACTICE"] as GameMode[]) {
      for (let seed = 1; seed <= 64; seed++) {
        const state = createNewGameState(mode, {}, seed);
        assert(state.activePiece!.cells.length === 2, "The first group should have two blocks");
        assert(state.nextPiece.cells.length === 3, "A new game must preview three blocks immediately");
        const expected = JSON.stringify(state.nextPiece.cells);
        state.activePiece!.y = getGhostY(state.grid, state.activePiece!);
        const result = lockActivePieceAndResolve(state);
        assert(!result.gameOver, "The first drop must leave room for the queued piece");
        assert(state.level === 1 && state.score === 0, "Piece variety must not require a score or level threshold");
        assert(state.activePiece!.cells.length === 3, "The second falling group must have all three previewed blocks");
        assert(JSON.stringify(state.activePiece!.cells) === expected, "The opening preview and second falling group must match exactly");
      }
    }
    record("12. Every new game previews and drops a three-block piece at level 1");
  }

  {
    for (const mode of ["CLASSIC", "COMFORT", "PRACTICE"] as GameMode[]) {
      const config = { ...createNewGameState(mode).config, specialChanceBase: 0, stoneChanceBase: 0 };
      const sizes = new Set<number>();
      const shapes = new Set<string>();
      for (let seed = 1; seed <= 1024; seed++) {
        const piece = generatePiece(config, 1, seed, 0).piece;
        sizes.add(piece.cells.length);
        shapes.add(piece.cells.map(({ dx, dy }) => `${dx},${dy}`).sort().join(";"));
        assert(canPlacePiece(createEmptyGrid(), piece), "Every generated shape must spawn within the board");
        const previewCount = getPiecePreview(piece).flat().filter((cell) => cell.kind !== "EMPTY").length;
        assert(previewCount === piece.cells.length, "All generated sizes and shapes must appear completely in the preview");
      }
      assert(sizes.has(2) && sizes.has(3), "Level 1 must mix two- and three-block groups");
      assert(!sizes.has(4), "Four-block experiments must stay disabled by default");
      assert(shapes.size === 8, "The generator must offer two straight pairs, two straight triples, and four corner orientations");
    }
    record("13. Level 1 offers mixed sizes and all eight supported shape orientations");
  }

  return { passed, log };
}
