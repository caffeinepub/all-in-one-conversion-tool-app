import type { ChessPiece } from "./chessTypes";

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

const PIECE_ORDER = ["queen", "rook", "bishop", "knight", "pawn", "king"];

function sortPieces(pieces: ChessPiece[]): ChessPiece[] {
  return [...pieces].sort(
    (a, b) => PIECE_ORDER.indexOf(a.kind) - PIECE_ORDER.indexOf(b.kind),
  );
}

interface CapturedPiecesProps {
  capturedByWhite: ChessPiece[];
  capturedByBlack: ChessPiece[];
}

export function CapturedPieces({
  capturedByWhite,
  capturedByBlack,
}: CapturedPiecesProps) {
  const sortedByWhite = sortPieces(capturedByWhite);
  const sortedByBlack = sortPieces(capturedByBlack);

  return (
    <div className="flex gap-6 justify-center items-center py-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-chess-label font-medium mr-1">
          White:
        </span>
        <div className="flex flex-wrap gap-0.5">
          {sortedByWhite.map((p, i) => (
            <span
              key={`${p.id}-${i}`}
              className="text-sm leading-none"
              style={{
                color: "#3a2510",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.5))",
              }}
            >
              {PIECE_SYMBOLS[p.color][p.kind]}
            </span>
          ))}
          {sortedByWhite.length === 0 && (
            <span className="text-xs text-chess-label/50 italic">—</span>
          )}
        </div>
      </div>
      <div className="w-px h-4 bg-chess-border opacity-30" />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-chess-label font-medium mr-1">
          Black:
        </span>
        <div className="flex flex-wrap gap-0.5">
          {sortedByBlack.map((p, i) => (
            <span
              key={`${p.id}-${i}`}
              className="text-sm leading-none"
              style={{
                color: "#f0d9b5",
                filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.8))",
              }}
            >
              {PIECE_SYMBOLS[p.color][p.kind]}
            </span>
          ))}
          {sortedByBlack.length === 0 && (
            <span className="text-xs text-chess-label/50 italic">—</span>
          )}
        </div>
      </div>
    </div>
  );
}
