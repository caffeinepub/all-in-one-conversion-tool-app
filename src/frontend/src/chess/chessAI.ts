import { applyMoveToState, getLegalMoves, isInCheck } from "./chessLogic";
import type {
  AIDifficulty,
  ChessGameState,
  PieceKind,
  Square,
} from "./chessTypes";

const PIECE_VALUES: Record<PieceKind, number> = {
  pawn: 100,
  knight: 320,
  bishop: 330,
  rook: 500,
  queen: 900,
  king: 20000,
};

// Positional bonus tables (from white's perspective, indexed [rank][file])
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 5, 5, 0, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MIDDLE_TABLE = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

function getPositionalBonus(
  kind: PieceKind,
  rank: number,
  file: number,
  isWhite: boolean,
): number {
  const r = isWhite ? rank : 7 - rank;
  const f = file;

  switch (kind) {
    case "pawn":
      return PAWN_TABLE[r]?.[f] ?? 0;
    case "knight":
      return KNIGHT_TABLE[r]?.[f] ?? 0;
    case "bishop":
      return BISHOP_TABLE[r]?.[f] ?? 0;
    case "rook":
      return ROOK_TABLE[r]?.[f] ?? 0;
    case "queen":
      return QUEEN_TABLE[r]?.[f] ?? 0;
    case "king":
      return KING_MIDDLE_TABLE[r]?.[f] ?? 0;
    default:
      return 0;
  }
}

function evaluateBoard(state: ChessGameState): number {
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = state.board[r][f];
      if (!piece) continue;
      const value =
        PIECE_VALUES[piece.kind] +
        getPositionalBonus(piece.kind, r, f, piece.color === "white");
      if (piece.color === "white") score += value;
      else score -= value;
    }
  }

  return score;
}

interface MoveCandidate {
  from: Square;
  to: Square;
}

function getAllMoves(state: ChessGameState): MoveCandidate[] {
  const moves: MoveCandidate[] = [];
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const p = state.board[r][f];
      if (p && p.color === state.currentTurn) {
        const sq: Square = { file: f, rank: r };
        const targets = getLegalMoves(state, sq);
        for (const to of targets) {
          moves.push({ from: sq, to });
        }
      }
    }
  }
  return moves;
}

function orderMoves(
  state: ChessGameState,
  moves: MoveCandidate[],
): MoveCandidate[] {
  return moves.sort((a, b) => {
    const aCapture = state.board[a.to.rank][a.to.file];
    const bCapture = state.board[b.to.rank][b.to.file];
    const aScore = aCapture ? PIECE_VALUES[aCapture.kind] : 0;
    const bScore = bCapture ? PIECE_VALUES[bCapture.kind] : 0;
    return bScore - aScore;
  });
}

function minimax(
  state: ChessGameState,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
): number {
  if (
    depth === 0 ||
    state.status === "checkmate" ||
    state.status === "stalemate" ||
    state.status === "draw"
  ) {
    if (state.status === "checkmate") {
      return maximizing ? -100000 : 100000;
    }
    if (state.status === "stalemate" || state.status === "draw") return 0;
    return evaluateBoard(state);
  }

  const moves = orderMoves(state, getAllMoves(state));
  if (moves.length === 0) return evaluateBoard(state);

  if (maximizing) {
    let best = Number.NEGATIVE_INFINITY;
    let localAlpha = alpha;
    for (const m of moves) {
      const nextState = applyMoveToState(state, m.from, m.to);
      const score = minimax(nextState, depth - 1, localAlpha, beta, false);
      best = Math.max(best, score);
      localAlpha = Math.max(localAlpha, best);
      if (beta <= localAlpha) break;
    }
    return best;
  }
  let best = Number.POSITIVE_INFINITY;
  let localBeta = beta;
  for (const m of moves) {
    const nextState = applyMoveToState(state, m.from, m.to);
    const score = minimax(nextState, depth - 1, alpha, localBeta, true);
    best = Math.min(best, score);
    localBeta = Math.min(localBeta, best);
    if (localBeta <= alpha) break;
  }
  return best;
}

export function getAIMove(
  state: ChessGameState,
  difficulty: AIDifficulty,
): MoveCandidate | null {
  const depthMap: Record<AIDifficulty, number> = {
    easy: 1,
    medium: 3,
    hard: 4,
  };

  const depth = depthMap[difficulty];
  const moves = getAllMoves(state);
  if (moves.length === 0) return null;

  // Add randomness for easy mode
  if (difficulty === "easy" && Math.random() < 0.4) {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  const isMaximizing = state.currentTurn === "white";
  let bestScore = isMaximizing
    ? Number.NEGATIVE_INFINITY
    : Number.POSITIVE_INFINITY;
  let bestMove: MoveCandidate | null = null;

  const orderedMoves = orderMoves(state, moves);

  for (const m of orderedMoves) {
    const nextState = applyMoveToState(state, m.from, m.to);
    const score = minimax(
      nextState,
      depth - 1,
      Number.NEGATIVE_INFINITY,
      Number.POSITIVE_INFINITY,
      !isMaximizing,
    );
    if (isMaximizing ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = m;
    }
  }

  return bestMove;
}
