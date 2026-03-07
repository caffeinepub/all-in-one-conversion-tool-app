// Chess types for client-side game logic

export type PieceColor = "white" | "black";

export type PieceKind =
  | "king"
  | "queen"
  | "rook"
  | "bishop"
  | "knight"
  | "pawn";

export interface ChessPiece {
  kind: PieceKind;
  color: PieceColor;
  id: string; // unique id for React keys
}

export interface Square {
  file: number; // 0-7, a=0 h=7
  rank: number; // 0-7, rank1=0 rank8=7
}

export type Board = (ChessPiece | null)[][];

export interface ChessMove {
  from: Square;
  to: Square;
  piece: ChessPiece;
  captured?: ChessPiece;
  isEnPassant?: boolean;
  isCastle?: "kingside" | "queenside";
  isPromotion?: boolean;
  promoteTo?: PieceKind;
  notation?: string;
}

export interface CastlingRights {
  whiteKingside: boolean;
  whiteQueenside: boolean;
  blackKingside: boolean;
  blackQueenside: boolean;
}

export type GameStatus =
  | "idle"
  | "playing"
  | "check"
  | "checkmate"
  | "stalemate"
  | "draw";

export interface ChessGameState {
  board: Board;
  currentTurn: PieceColor;
  status: GameStatus;
  castlingRights: CastlingRights;
  enPassantTarget: Square | null; // square where en passant capture lands
  moveHistory: ChessMove[];
  capturedByWhite: ChessPiece[]; // pieces white captured
  capturedByBlack: ChessPiece[]; // pieces black captured
  halfMoveClock: number;
  fullMoveNumber: number;
}

export type GameMode = "vsAI" | "multiplayer";
export type AIDifficulty = "easy" | "medium" | "hard";

export type AppScreen = "home" | "creating" | "waiting" | "game" | "gameOver";

export interface RoomInfo {
  roomCode: string;
  playerColor: PieceColor;
}
