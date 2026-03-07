import type {
  Board,
  CastlingRights,
  ChessGameState,
  ChessMove,
  ChessPiece,
  PieceColor,
  PieceKind,
  Square,
} from "./chessTypes";

let pieceIdCounter = 0;
function makePiece(kind: PieceKind, color: PieceColor): ChessPiece {
  return { kind, color, id: `${color[0]}${kind[0]}${++pieceIdCounter}` };
}

export function createInitialBoard(): Board {
  const board: Board = Array.from({ length: 8 }, () => Array(8).fill(null));

  const backRank: PieceKind[] = [
    "rook",
    "knight",
    "bishop",
    "queen",
    "king",
    "bishop",
    "knight",
    "rook",
  ];

  // Black back rank (rank 7 = index 7)
  for (let f = 0; f < 8; f++) {
    board[7][f] = makePiece(backRank[f], "black");
    board[6][f] = makePiece("pawn", "black");
  }

  // White back rank (rank 0 = index 0)
  for (let f = 0; f < 8; f++) {
    board[0][f] = makePiece(backRank[f], "white");
    board[1][f] = makePiece("pawn", "white");
  }

  return board;
}

export function createInitialGameState(): ChessGameState {
  return {
    board: createInitialBoard(),
    currentTurn: "white",
    status: "playing",
    castlingRights: {
      whiteKingside: true,
      whiteQueenside: true,
      blackKingside: true,
      blackQueenside: true,
    },
    enPassantTarget: null,
    moveHistory: [],
    capturedByWhite: [],
    capturedByBlack: [],
    halfMoveClock: 0,
    fullMoveNumber: 1,
  };
}

export function squareEquals(a: Square, b: Square): boolean {
  return a.file === b.file && a.rank === b.rank;
}

function inBounds(sq: Square): boolean {
  return sq.file >= 0 && sq.file < 8 && sq.rank >= 0 && sq.rank < 8;
}

function getSquare(board: Board, sq: Square): ChessPiece | null {
  return board[sq.rank][sq.file];
}

function isEnemy(piece: ChessPiece, color: PieceColor): boolean {
  return piece.color !== color;
}

// Get pseudo-legal moves (ignoring king safety)
export function getPseudoLegalMoves(
  board: Board,
  sq: Square,
  castlingRights: CastlingRights,
  enPassantTarget: Square | null,
): Square[] {
  const piece = getSquare(board, sq);
  if (!piece) return [];

  const moves: Square[] = [];
  const { kind, color } = piece;

  const addIfEmpty = (target: Square) => {
    if (inBounds(target) && !getSquare(board, target)) {
      moves.push(target);
    }
  };

  const addIfCapturable = (target: Square) => {
    if (!inBounds(target)) return;
    const t = getSquare(board, target);
    if (t && isEnemy(t, color)) {
      moves.push(target);
    }
  };

  const addSlidingMoves = (directions: [number, number][]) => {
    for (const [df, dr] of directions) {
      let cur: Square = { file: sq.file + df, rank: sq.rank + dr };
      while (inBounds(cur)) {
        const t = getSquare(board, cur);
        if (!t) {
          moves.push({ ...cur });
          cur = { file: cur.file + df, rank: cur.rank + dr };
        } else {
          if (isEnemy(t, color)) moves.push({ ...cur });
          break;
        }
      }
    }
  };

  if (kind === "pawn") {
    const dir = color === "white" ? 1 : -1;
    const startRank = color === "white" ? 1 : 6;

    // Forward
    const fwd: Square = { file: sq.file, rank: sq.rank + dir };
    if (inBounds(fwd) && !getSquare(board, fwd)) {
      moves.push(fwd);
      // Double push from start
      if (sq.rank === startRank) {
        const fwd2: Square = { file: sq.file, rank: sq.rank + dir * 2 };
        if (!getSquare(board, fwd2)) {
          moves.push(fwd2);
        }
      }
    }

    // Captures
    for (const df of [-1, 1]) {
      const capSq: Square = { file: sq.file + df, rank: sq.rank + dir };
      if (!inBounds(capSq)) continue;
      const t = getSquare(board, capSq);
      if (t && isEnemy(t, color)) {
        moves.push(capSq);
      }
      // En passant
      if (enPassantTarget && squareEquals(capSq, enPassantTarget)) {
        moves.push(capSq);
      }
    }
  } else if (kind === "rook") {
    addSlidingMoves([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]);
  } else if (kind === "bishop") {
    addSlidingMoves([
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]);
  } else if (kind === "queen") {
    addSlidingMoves([
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]);
  } else if (kind === "knight") {
    const offsets: [number, number][] = [
      [2, 1],
      [2, -1],
      [-2, 1],
      [-2, -1],
      [1, 2],
      [1, -2],
      [-1, 2],
      [-1, -2],
    ];
    for (const [df, dr] of offsets) {
      const t: Square = { file: sq.file + df, rank: sq.rank + dr };
      if (inBounds(t)) {
        const tp = getSquare(board, t);
        if (!tp || isEnemy(tp, color)) moves.push(t);
      }
    }
  } else if (kind === "king") {
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        if (df === 0 && dr === 0) continue;
        const t: Square = { file: sq.file + df, rank: sq.rank + dr };
        addIfEmpty(t);
        addIfCapturable(t);
      }
    }

    // Castling
    const rank = color === "white" ? 0 : 7;
    if (sq.rank === rank && sq.file === 4) {
      // Kingside
      if (
        (color === "white"
          ? castlingRights.whiteKingside
          : castlingRights.blackKingside) &&
        !getSquare(board, { file: 5, rank }) &&
        !getSquare(board, { file: 6, rank })
      ) {
        moves.push({ file: 6, rank });
      }
      // Queenside
      if (
        (color === "white"
          ? castlingRights.whiteQueenside
          : castlingRights.blackQueenside) &&
        !getSquare(board, { file: 3, rank }) &&
        !getSquare(board, { file: 2, rank }) &&
        !getSquare(board, { file: 1, rank })
      ) {
        moves.push({ file: 2, rank });
      }
    }
  }

  return moves;
}

// Check if a color's king is attacked
export function isInCheck(board: Board, color: PieceColor): boolean {
  // Find king
  let kingSq: Square | null = null;
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.kind === "king" && p.color === color) {
        kingSq = { file: f, rank: r };
      }
    }
  }
  if (!kingSq) return false;

  // Check if any enemy piece can attack king's square
  const enemy = color === "white" ? "black" : "white";
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.color === enemy) {
        const attackMoves = getPseudoLegalMoves(
          board,
          { file: f, rank: r },
          {
            whiteKingside: false,
            whiteQueenside: false,
            blackKingside: false,
            blackQueenside: false,
          },
          null,
        );
        if (attackMoves.some((m) => squareEquals(m, kingSq!))) {
          return true;
        }
      }
    }
  }
  return false;
}

// Apply a move and return new board (immutable)
export function applyMove(board: Board, move: ChessMove): Board {
  const newBoard: Board = board.map((row) => [...row]);
  const piece = newBoard[move.from.rank][move.from.file];
  if (!piece) return newBoard;

  // Clear source
  newBoard[move.from.rank][move.from.file] = null;

  // En passant capture
  if (move.isEnPassant) {
    const captureRank =
      move.piece.color === "white" ? move.to.rank - 1 : move.to.rank + 1;
    newBoard[captureRank][move.to.file] = null;
  }

  // Castling rook move
  if (move.isCastle) {
    const rank = move.from.rank;
    if (move.isCastle === "kingside") {
      const rook = newBoard[rank][7];
      newBoard[rank][7] = null;
      newBoard[rank][5] = rook;
    } else {
      const rook = newBoard[rank][0];
      newBoard[rank][0] = null;
      newBoard[rank][3] = rook;
    }
  }

  // Place piece (promotion)
  if (move.isPromotion && move.promoteTo) {
    newBoard[move.to.rank][move.to.file] = {
      ...piece,
      kind: move.promoteTo,
    };
  } else {
    newBoard[move.to.rank][move.to.file] = piece;
  }

  return newBoard;
}

// Get legal moves for a piece (filters out moves that leave king in check)
export function getLegalMoves(state: ChessGameState, sq: Square): Square[] {
  const piece = state.board[sq.rank][sq.file];
  if (!piece || piece.color !== state.currentTurn) return [];

  const pseudo = getPseudoLegalMoves(
    state.board,
    sq,
    state.castlingRights,
    state.enPassantTarget,
  );

  return pseudo.filter((to) => {
    const move = buildMove(state, sq, to);
    const newBoard = applyMove(state.board, move);
    // After move, check if own king is in check
    if (isInCheck(newBoard, piece.color)) return false;

    // Castle: king cannot pass through check
    if (move.isCastle) {
      const rank = sq.rank;
      const passThroughFile = move.isCastle === "kingside" ? 5 : 3;
      const passBoard = applyMove(state.board, {
        ...move,
        to: { file: passThroughFile, rank },
        isCastle: undefined,
      });
      if (isInCheck(passBoard, piece.color)) return false;
      // Also king cannot start in check
      if (isInCheck(state.board, piece.color)) return false;
    }

    return true;
  });
}

export function buildMove(
  state: ChessGameState,
  from: Square,
  to: Square,
  promoteTo: PieceKind = "queen",
): ChessMove {
  const piece = state.board[from.rank][from.file]!;
  const captured = state.board[to.rank][to.file] ?? undefined;

  let isEnPassant = false;
  let isCastle: "kingside" | "queenside" | undefined;
  let isPromotion = false;

  if (
    piece.kind === "pawn" &&
    state.enPassantTarget &&
    squareEquals(to, state.enPassantTarget)
  ) {
    isEnPassant = true;
  }

  if (piece.kind === "king" && Math.abs(to.file - from.file) === 2) {
    isCastle = to.file > from.file ? "kingside" : "queenside";
  }

  if (piece.kind === "pawn" && (to.rank === 0 || to.rank === 7)) {
    isPromotion = true;
  }

  return {
    from,
    to,
    piece,
    captured: isEnPassant
      ? {
          kind: "pawn",
          color: piece.color === "white" ? "black" : "white",
          id: "ep",
        }
      : captured,
    isEnPassant,
    isCastle,
    isPromotion,
    promoteTo: isPromotion ? promoteTo : undefined,
  };
}

export function applyMoveToState(
  state: ChessGameState,
  from: Square,
  to: Square,
  promoteTo: PieceKind = "queen",
): ChessGameState {
  const move = buildMove(state, from, to, promoteTo);
  const newBoard = applyMove(state.board, move);

  // Update castling rights
  const cr = { ...state.castlingRights };
  if (move.piece.kind === "king") {
    if (move.piece.color === "white") {
      cr.whiteKingside = false;
      cr.whiteQueenside = false;
    } else {
      cr.blackKingside = false;
      cr.blackQueenside = false;
    }
  }
  if (move.piece.kind === "rook") {
    if (move.from.file === 0 && move.from.rank === 0) cr.whiteQueenside = false;
    if (move.from.file === 7 && move.from.rank === 0) cr.whiteKingside = false;
    if (move.from.file === 0 && move.from.rank === 7) cr.blackQueenside = false;
    if (move.from.file === 7 && move.from.rank === 7) cr.blackKingside = false;
  }
  // If a rook is captured, update rights
  if (move.captured) {
    if (move.to.file === 0 && move.to.rank === 0) cr.whiteQueenside = false;
    if (move.to.file === 7 && move.to.rank === 0) cr.whiteKingside = false;
    if (move.to.file === 0 && move.to.rank === 7) cr.blackQueenside = false;
    if (move.to.file === 7 && move.to.rank === 7) cr.blackKingside = false;
  }

  // En passant target
  let newEnPassant: Square | null = null;
  if (
    move.piece.kind === "pawn" &&
    Math.abs(move.to.rank - move.from.rank) === 2
  ) {
    newEnPassant = {
      file: move.from.file,
      rank: (move.from.rank + move.to.rank) / 2,
    };
  }

  const nextTurn: PieceColor =
    state.currentTurn === "white" ? "black" : "white";

  // Captured pieces
  const capturedByWhite = [...state.capturedByWhite];
  const capturedByBlack = [...state.capturedByBlack];
  if (move.captured) {
    if (state.currentTurn === "white") capturedByWhite.push(move.captured);
    else capturedByBlack.push(move.captured);
  }

  const halfMoveClock =
    move.piece.kind === "pawn" || move.captured ? 0 : state.halfMoveClock + 1;
  const fullMoveNumber =
    state.currentTurn === "black"
      ? state.fullMoveNumber + 1
      : state.fullMoveNumber;

  const newState: ChessGameState = {
    board: newBoard,
    currentTurn: nextTurn,
    status: "playing",
    castlingRights: cr,
    enPassantTarget: newEnPassant,
    moveHistory: [...state.moveHistory, move],
    capturedByWhite,
    capturedByBlack,
    halfMoveClock,
    fullMoveNumber,
  };

  // Check game status
  newState.status = computeGameStatus(newState);

  return newState;
}

export function computeGameStatus(
  state: ChessGameState,
): ChessGameState["status"] {
  const { currentTurn, board } = state;
  const inCheck = isInCheck(board, currentTurn);

  // Check if there are any legal moves
  let hasLegal = false;
  outer: for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = board[r][f];
      if (p && p.color === currentTurn) {
        const sq: Square = { file: f, rank: r };
        const legal = getLegalMoves(state, sq);
        if (legal.length > 0) {
          hasLegal = true;
          break outer;
        }
      }
    }
  }

  if (!hasLegal) {
    return inCheck ? "checkmate" : "stalemate";
  }
  if (inCheck) return "check";

  // 50-move rule
  if (state.halfMoveClock >= 100) return "draw";

  return "playing";
}

// Get algebraic notation for a move
export function getMoveNotation(_board: Board, move: ChessMove): string {
  if (move.isCastle === "kingside") return "O-O";
  if (move.isCastle === "queenside") return "O-O-O";

  const files = "abcdefgh";
  const fromFile = files[move.from.file];
  const toFile = files[move.to.file];
  const toRank = move.to.rank + 1;

  const pieceSymbols: Record<string, string> = {
    king: "K",
    queen: "Q",
    rook: "R",
    bishop: "B",
    knight: "N",
    pawn: "",
  };

  const sym = pieceSymbols[move.piece.kind];
  const capture = move.captured ? "x" : "";
  const fromNotation =
    move.piece.kind === "pawn" && move.captured ? fromFile : "";
  const promo = move.isPromotion
    ? `=${pieceSymbols[move.promoteTo ?? "queen"] || "Q"}`
    : "";

  return `${sym}${fromNotation}${capture}${toFile}${toRank}${promo}`;
}

// Convert board from backend format
export function boardFromBackend(
  backendBoard: Array<Array<{ pieceType: string; isWhite: boolean } | null>>,
): Board {
  pieceIdCounter = 1000; // offset to avoid collision
  const kindMap: Record<string, PieceKind> = {
    king: "king",
    queen: "queen",
    rook: "rook",
    bishop: "bishop",
    knight: "knight",
    pawn: "pawn",
  };

  return backendBoard.map((row) =>
    row.map((cell) => {
      if (!cell) return null;
      const kind = kindMap[cell.pieceType] ?? "pawn";
      return makePiece(kind, cell.isWhite ? "white" : "black");
    }),
  );
}
