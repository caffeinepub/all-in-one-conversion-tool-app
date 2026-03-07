import { AnimatePresence, motion } from "motion/react";
import { useMemo } from "react";
import { squareEquals } from "./chessLogic";
import type {
  ChessGameState,
  ChessPiece,
  PieceColor,
  Square,
} from "./chessTypes";

const PIECE_SYMBOLS: Record<string, Record<string, string>> = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙",
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟",
  },
};

interface ChessBoardProps {
  gameState: ChessGameState;
  selectedSquare: Square | null;
  legalMoves: Square[];
  playerColor: PieceColor;
  onSquareClick: (sq: Square) => void;
  isInteractive: boolean;
  lastMove?: { from: Square; to: Square } | null;
}

export function ChessBoard({
  gameState,
  selectedSquare,
  legalMoves,
  playerColor,
  onSquareClick,
  isInteractive,
  lastMove,
}: ChessBoardProps) {
  const { board } = gameState;

  // Flip board if player is black
  const ranks = useMemo(
    () =>
      playerColor === "white"
        ? [7, 6, 5, 4, 3, 2, 1, 0]
        : [0, 1, 2, 3, 4, 5, 6, 7],
    [playerColor],
  );
  const files = useMemo(
    () =>
      playerColor === "white"
        ? [0, 1, 2, 3, 4, 5, 6, 7]
        : [7, 6, 5, 4, 3, 2, 1, 0],
    [playerColor],
  );

  const fileLabels = "abcdefgh";

  function isLightSquare(file: number, rank: number): boolean {
    return (file + rank) % 2 !== 0;
  }

  function isSelected(sq: Square): boolean {
    return selectedSquare !== null && squareEquals(sq, selectedSquare);
  }

  function isLegalMove(sq: Square): boolean {
    return legalMoves.some((m) => squareEquals(m, sq));
  }

  function isLastMoveSquare(sq: Square): boolean {
    if (!lastMove) return false;
    return squareEquals(sq, lastMove.from) || squareEquals(sq, lastMove.to);
  }

  function inCheck(sq: Square): boolean {
    const piece = board[sq.rank][sq.file];
    return (
      piece?.kind === "king" &&
      (gameState.status === "check" || gameState.status === "checkmate") &&
      piece.color === gameState.currentTurn
    );
  }

  function getSquareClasses(sq: Square, light: boolean): string {
    const base = light
      ? "bg-chess-light hover:bg-chess-light-hover"
      : "bg-chess-dark hover:bg-chess-dark-hover";

    let cls = `${base} relative flex items-center justify-center cursor-pointer transition-colors duration-100 select-none`;

    if (isSelected(sq)) cls += " !bg-chess-selected";
    else if (isLastMoveSquare(sq)) cls += " !bg-chess-lastmove";

    if (inCheck(sq)) cls += " !bg-chess-check";

    return cls;
  }

  return (
    <div
      className="chess-board-wrapper relative"
      data-ocid="chess.canvas_target"
    >
      <div
        className="board-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(8, 1fr)",
          gridTemplateRows: "repeat(8, 1fr)",
          width: "min(92vw, 540px)",
          height: "min(92vw, 540px)",
          boxShadow:
            "0 0 0 3px #7a5c3a, 0 0 0 6px #4a3010, 0 24px 80px rgba(0,0,0,0.7)",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {ranks.map((rank) =>
          files.map((file) => {
            const sq: Square = { file, rank };
            const piece = board[rank][file];
            const light = isLightSquare(file, rank);
            const legal = isLegalMove(sq);
            const hasPiece = !!piece;

            return (
              <button
                key={`${file}-${rank}`}
                type="button"
                className={getSquareClasses(sq, light)}
                onClick={() => isInteractive && onSquareClick(sq)}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  isInteractive &&
                  onSquareClick(sq)
                }
                tabIndex={isInteractive ? 0 : -1}
                aria-label={`${["a", "b", "c", "d", "e", "f", "g", "h"][file]}${rank + 1}`}
                style={{
                  cursor: isInteractive ? "pointer" : "default",
                  padding: 0,
                  border: "none",
                }}
                data-ocid="chess.canvas_target"
              >
                {/* Rank label on left edge */}
                {file === (playerColor === "white" ? 0 : 7) && (
                  <span
                    className="absolute top-0.5 left-1 text-[10px] font-semibold leading-none pointer-events-none"
                    style={{
                      color: light
                        ? "rgba(101,72,46,0.8)"
                        : "rgba(240,217,181,0.7)",
                    }}
                  >
                    {rank + 1}
                  </span>
                )}

                {/* File label on bottom edge */}
                {rank === (playerColor === "white" ? 0 : 7) && (
                  <span
                    className="absolute bottom-0.5 right-1 text-[10px] font-semibold leading-none pointer-events-none"
                    style={{
                      color: light
                        ? "rgba(101,72,46,0.8)"
                        : "rgba(240,217,181,0.7)",
                    }}
                  >
                    {fileLabels[file]}
                  </span>
                )}

                {/* Legal move indicator */}
                {legal && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center z-10">
                    {hasPiece ? (
                      // Capture: ring around the square
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: "2px",
                          border: "4px solid rgba(80,200,80,0.7)",
                        }}
                      />
                    ) : (
                      // Empty: dot
                      <div
                        style={{
                          width: "32%",
                          height: "32%",
                          borderRadius: "50%",
                          backgroundColor: "rgba(80,200,80,0.55)",
                        }}
                      />
                    )}
                  </div>
                )}

                {/* Piece */}
                <AnimatePresence>
                  {piece && (
                    <motion.span
                      key={piece.id}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 25,
                      }}
                      className="chess-piece pointer-events-none select-none z-20 relative"
                      style={{
                        fontSize: "min(7.5vw, 44px)",
                        lineHeight: 1,
                        filter:
                          piece.color === "white"
                            ? "drop-shadow(1px 2px 2px rgba(0,0,0,0.7))"
                            : "drop-shadow(1px 2px 2px rgba(0,0,0,0.8))",
                      }}
                    >
                      {PIECE_SYMBOLS[piece.color][piece.kind]}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          }),
        )}
      </div>
    </div>
  );
}
