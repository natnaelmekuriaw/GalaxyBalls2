export const ARENA_PADDING = 8;
export const BOARD_FRAME_SIZE = 22;
export const PREVIEW_FRAME_SIZE = 18;
export const PREVIEW_BRIDGE_WIDTH = 10;
export const MASCOT_WIDTH = 112;
export const MASCOT_HEIGHT = 163; // Includes space for the pilot's bounce.

type GridSize = { columns: number; rows: number; previewColumns: number };

/** Fit the board and its side column into the space left by the HUD and controls. */
export function getGameArenaLayout(width: number, height: number, grid: GridSize) {
  const availableWidth = Math.max(0, width - ARENA_PADDING * 2);
  const availableHeight = Math.max(0, height - ARENA_PADDING * 2);
  const sideWidth = (size: number) => Math.max(
    88,
    grid.previewColumns * Math.floor(size * 0.72) + PREVIEW_FRAME_SIZE + PREVIEW_BRIDGE_WIDTH,
  );
  let cellSize = 56;
  while (cellSize > 6 && (
    grid.columns * cellSize + BOARD_FRAME_SIZE + sideWidth(cellSize) > availableWidth
    || grid.rows * cellSize + BOARD_FRAME_SIZE > availableHeight
  )) cellSize--;

  const previewCellSize = Math.floor(cellSize * 0.72);
  const boardWidth = grid.columns * cellSize + BOARD_FRAME_SIZE;
  const boardHeight = grid.rows * cellSize + BOARD_FRAME_SIZE;
  const rightColumnWidth = sideWidth(cellSize);
  const previewHeight = grid.previewColumns * previewCellSize + PREVIEW_FRAME_SIZE;
  // Side padding, the preview-to-pilot gap, and the pilot name keep their size.
  const mascotSpace = Math.max(0, boardHeight - 16 - previewHeight - 12 - 20);
  const mascotScale = Math.min(1, rightColumnWidth / MASCOT_WIDTH, mascotSpace / MASCOT_HEIGHT);
  return { cellSize, previewCellSize, boardWidth, boardHeight, rightColumnWidth, mascotScale };
}
