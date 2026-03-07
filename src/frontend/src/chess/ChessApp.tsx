import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { GameMode as BackendGameMode } from "../backend.d.ts";
import { useActor } from "../hooks/useActor";
import { CapturedPieces } from "./CapturedPieces";
import { ChessBoard } from "./ChessBoard";
import { MoveHistory } from "./MoveHistory";
import { getAIMove } from "./chessAI";
import {
  applyMoveToState,
  boardFromBackend,
  createInitialGameState,
  getLegalMoves,
  squareEquals,
} from "./chessLogic";
import type {
  AIDifficulty,
  AppScreen,
  ChessGameState,
  GameMode,
  PieceColor,
  PieceKind,
  RoomInfo,
  Square,
} from "./chessTypes";

// ─── Status bar ────────────────────────────────────────────────────────────────
function StatusBar({
  gameState,
  isWaiting,
  roomCode,
  currentPlayer,
}: {
  gameState: ChessGameState;
  isWaiting: boolean;
  roomCode: string | null;
  currentPlayer: PieceColor | null;
}) {
  const { status, currentTurn } = gameState;

  if (isWaiting) {
    return (
      <div
        className="flex items-center justify-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium"
        style={{
          background: "rgba(180,120,40,0.18)",
          border: "1px solid rgba(180,120,40,0.3)",
        }}
        data-ocid="chess.loading_state"
      >
        <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        <span style={{ color: "#f5c842" }}>Waiting for opponent…</span>
        {roomCode && (
          <span
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{ background: "rgba(180,120,40,0.2)", color: "#f0d9b5" }}
          >
            Room: {roomCode}
          </span>
        )}
      </div>
    );
  }

  if (status === "checkmate") {
    const winner = currentTurn === "white" ? "Black" : "White";
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold"
        style={{
          background: "rgba(200,50,50,0.18)",
          border: "1px solid rgba(200,50,50,0.4)",
        }}
        data-ocid="chess.success_state"
      >
        <span style={{ color: "#ff6b6b" }}>♛ Checkmate — {winner} wins!</span>
      </div>
    );
  }

  if (status === "stalemate") {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          background: "rgba(100,100,100,0.18)",
          border: "1px solid rgba(100,100,100,0.4)",
        }}
        data-ocid="chess.success_state"
      >
        <span style={{ color: "#aaa" }}>Stalemate — Draw</span>
      </div>
    );
  }

  if (status === "draw") {
    return (
      <div
        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
        style={{
          background: "rgba(100,100,100,0.18)",
          border: "1px solid rgba(100,100,100,0.4)",
        }}
        data-ocid="chess.success_state"
      >
        <span style={{ color: "#aaa" }}>Draw by 50-move rule</span>
      </div>
    );
  }

  const isMyTurn = currentPlayer === null || currentTurn === currentPlayer;
  const turnLabel = currentTurn === "white" ? "White" : "Black";
  const isCheck = status === "check";

  return (
    <div
      className="flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold"
      style={{
        background: isCheck
          ? "rgba(200,100,40,0.18)"
          : isMyTurn
            ? "rgba(40,160,80,0.15)"
            : "rgba(60,60,80,0.3)",
        border: isCheck
          ? "1px solid rgba(200,100,40,0.4)"
          : isMyTurn
            ? "1px solid rgba(40,160,80,0.3)"
            : "1px solid rgba(80,80,100,0.3)",
      }}
      data-ocid="chess.panel"
    >
      <span
        style={{
          fontSize: "1.2em",
        }}
      >
        {currentTurn === "white" ? "♙" : "♟"}
      </span>
      <span
        style={{
          color: isCheck ? "#f5a442" : isMyTurn ? "#5de87c" : "#a0a0b0",
        }}
      >
        {isCheck && "Check! "}
        {turnLabel}&apos;s turn
        {!isMyTurn && currentPlayer && " (opponent)"}
      </span>
    </div>
  );
}

// ─── Promotion dialog ──────────────────────────────────────────────────────────
const PROMOTION_PIECES: PieceKind[] = ["queen", "rook", "bishop", "knight"];
const PIECE_SYMBOLS: Record<string, Record<string, string>> = {
  white: { queen: "♕", rook: "♖", bishop: "♗", knight: "♘" },
  black: { queen: "♛", rook: "♜", bishop: "♝", knight: "♞" },
};

function PromotionDialog({
  color,
  onSelect,
}: {
  color: PieceColor;
  onSelect: (kind: PieceKind) => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.7)" }}
      data-ocid="chess.modal"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{
          background: "#1a110a",
          border: "2px solid rgba(181,136,99,0.4)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.8)",
        }}
      >
        <h3 className="text-chess-light-piece font-display text-lg font-semibold">
          Promote pawn to…
        </h3>
        <div className="flex gap-3">
          {PROMOTION_PIECES.map((kind) => (
            <button
              key={kind}
              onClick={() => onSelect(kind)}
              className="w-14 h-14 rounded-xl flex items-center justify-center text-4xl transition-transform hover:scale-110 active:scale-95"
              style={{
                background: "rgba(181,136,99,0.15)",
                border: "1px solid rgba(181,136,99,0.4)",
              }}
              type="button"
              data-ocid="chess.confirm_button"
            >
              {PIECE_SYMBOLS[color][kind]}
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Mode selection ────────────────────────────────────────────────────────────
function ModeSelect({
  onSelectVsAI,
  onSelectMultiplayer,
}: {
  onSelectVsAI: (diff: AIDifficulty) => void;
  onSelectMultiplayer: () => void;
}) {
  const [difficulty, setDifficulty] = useState<AIDifficulty>("medium");

  return (
    <div className="flex flex-col items-center gap-8 py-8 px-4 max-w-md mx-auto">
      {/* Title */}
      <div className="text-center">
        <div className="text-6xl mb-3">♛</div>
        <h1
          className="font-display text-4xl font-bold tracking-tight"
          style={{ color: "#f0d9b5" }}
        >
          Chess
        </h1>
        <p className="text-sm mt-2" style={{ color: "rgba(240,217,181,0.5)" }}>
          Classic chess — play with a friend or challenge the AI
        </p>
      </div>

      {/* Cards */}
      <div className="w-full grid grid-cols-1 gap-4">
        {/* Multiplayer card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-2xl p-5 cursor-pointer"
          style={{
            background: "rgba(181,136,99,0.08)",
            border: "1px solid rgba(181,136,99,0.25)",
          }}
          onClick={onSelectMultiplayer}
          data-ocid="chess.primary_button"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "rgba(181,136,99,0.15)" }}
            >
              🎮
            </div>
            <div>
              <h2
                className="font-display text-lg font-semibold"
                style={{ color: "#f0d9b5" }}
              >
                Two Players
              </h2>
              <p className="text-xs" style={{ color: "rgba(240,217,181,0.5)" }}>
                Play on same device or same WiFi network
              </p>
            </div>
          </div>
        </motion.div>

        {/* vs AI card */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="rounded-2xl p-5"
          style={{
            background: "rgba(101,72,46,0.12)",
            border: "1px solid rgba(101,72,46,0.3)",
          }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
              style={{ background: "rgba(101,72,46,0.2)" }}
            >
              🤖
            </div>
            <div>
              <h2
                className="font-display text-lg font-semibold"
                style={{ color: "#f0d9b5" }}
              >
                vs Computer
              </h2>
              <p className="text-xs" style={{ color: "rgba(240,217,181,0.5)" }}>
                Play against AI with adjustable difficulty
              </p>
            </div>
          </div>

          {/* Difficulty */}
          <div className="flex gap-2 mb-4">
            {(["easy", "medium", "hard"] as AIDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                style={
                  difficulty === d
                    ? {
                        background: "rgba(181,136,99,0.4)",
                        color: "#f0d9b5",
                        border: "1px solid rgba(181,136,99,0.5)",
                      }
                    : {
                        background: "rgba(181,136,99,0.06)",
                        color: "rgba(240,217,181,0.5)",
                        border: "1px solid rgba(101,72,46,0.2)",
                      }
                }
                type="button"
                data-ocid="chess.toggle"
              >
                {d}
              </button>
            ))}
          </div>

          <Button
            className="w-full"
            onClick={() => onSelectVsAI(difficulty)}
            style={{
              background: "rgba(181,136,99,0.25)",
              color: "#f0d9b5",
              border: "1px solid rgba(181,136,99,0.4)",
            }}
            data-ocid="chess.secondary_button"
          >
            Start Game
          </Button>
        </motion.div>
      </div>
    </div>
  );
}

// ─── Multiplayer lobby ──────────────────────────────────────────────────────────
function MultiplayerLobby({
  onCreateRoom,
  onJoinRoom,
  onBack,
  creating,
  roomInfo,
}: {
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  onBack: () => void;
  creating: boolean;
  roomInfo: RoomInfo | null;
}) {
  const [joinCode, setJoinCode] = useState("");

  return (
    <div className="flex flex-col items-center gap-6 py-8 px-4 max-w-sm mx-auto">
      <button
        type="button"
        onClick={onBack}
        className="self-start text-sm flex items-center gap-1"
        style={{ color: "rgba(240,217,181,0.5)" }}
        data-ocid="chess.button"
      >
        ← Back
      </button>

      <div className="text-center">
        <div className="text-4xl mb-2">🎮</div>
        <h2
          className="font-display text-2xl font-bold"
          style={{ color: "#f0d9b5" }}
        >
          Two Players
        </h2>
        <p className="text-sm mt-1" style={{ color: "rgba(240,217,181,0.5)" }}>
          Create a room or join an existing one
        </p>
      </div>

      {/* Create Room */}
      <div
        className="w-full rounded-2xl p-5"
        style={{
          background: "rgba(181,136,99,0.08)",
          border: "1px solid rgba(181,136,99,0.2)",
        }}
      >
        <h3 className="font-semibold text-sm mb-3" style={{ color: "#f0d9b5" }}>
          Create a new room
        </h3>
        {roomInfo ? (
          <div className="text-center">
            <p
              className="text-xs mb-2"
              style={{ color: "rgba(240,217,181,0.6)" }}
            >
              Share this code with your opponent:
            </p>
            <div
              className="font-mono text-3xl font-bold tracking-widest py-3 px-4 rounded-xl"
              style={{
                background: "rgba(181,136,99,0.15)",
                color: "#f5c842",
                border: "1px solid rgba(181,136,99,0.3)",
              }}
              data-ocid="chess.panel"
            >
              {roomInfo.roomCode}
            </div>
            <p
              className="text-xs mt-2"
              style={{ color: "rgba(240,217,181,0.4)" }}
            >
              You play as{" "}
              <strong style={{ color: "#f0d9b5" }}>
                {roomInfo.playerColor === "white" ? "White ♙" : "Black ♟"}
              </strong>
            </p>
            <div className="flex items-center justify-center gap-2 mt-3">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span
                className="text-xs"
                style={{ color: "rgba(240,217,181,0.5)" }}
              >
                Waiting for opponent…
              </span>
            </div>
          </div>
        ) : (
          <Button
            className="w-full"
            onClick={onCreateRoom}
            disabled={creating}
            style={{
              background: "rgba(181,136,99,0.2)",
              color: "#f0d9b5",
              border: "1px solid rgba(181,136,99,0.4)",
            }}
            data-ocid="chess.primary_button"
          >
            {creating ? "Creating…" : "Create Room"}
          </Button>
        )}
      </div>

      <div
        className="w-full flex items-center gap-3"
        style={{ color: "rgba(240,217,181,0.3)" }}
      >
        <div
          className="flex-1 h-px"
          style={{ background: "rgba(181,136,99,0.2)" }}
        />
        <span className="text-xs">or</span>
        <div
          className="flex-1 h-px"
          style={{ background: "rgba(181,136,99,0.2)" }}
        />
      </div>

      {/* Join Room */}
      <div
        className="w-full rounded-2xl p-5"
        style={{
          background: "rgba(101,72,46,0.1)",
          border: "1px solid rgba(101,72,46,0.25)",
        }}
      >
        <h3 className="font-semibold text-sm mb-3" style={{ color: "#f0d9b5" }}>
          Join a room
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="Enter room code"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="font-mono uppercase tracking-widest text-center"
            style={{
              background: "rgba(181,136,99,0.08)",
              border: "1px solid rgba(181,136,99,0.2)",
              color: "#f0d9b5",
            }}
            data-ocid="chess.input"
          />
          <Button
            onClick={() => joinCode.length >= 4 && onJoinRoom(joinCode)}
            disabled={joinCode.length < 4}
            style={{
              background: "rgba(181,136,99,0.2)",
              color: "#f0d9b5",
              border: "1px solid rgba(181,136,99,0.4)",
            }}
            data-ocid="chess.submit_button"
          >
            Join
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Chess game view ─────────────────────────────────────────────────────────
function ChessGameView({
  gameState,
  playerColor,
  roomCode,
  isWaiting,
  onMove,
  onNewGame,
  onBack,
  isAI,
  aiThinking,
}: {
  gameState: ChessGameState;
  playerColor: PieceColor;
  roomCode: string | null;
  isWaiting: boolean;
  onMove: (from: Square, to: Square, promoteTo?: PieceKind) => void;
  onNewGame: () => void;
  onBack: () => void;
  isAI: boolean;
  aiThinking: boolean;
}) {
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const isGameOver =
    gameState.status === "checkmate" ||
    gameState.status === "stalemate" ||
    gameState.status === "draw";

  const isInteractive =
    !isWaiting &&
    !isGameOver &&
    !aiThinking &&
    gameState.currentTurn === playerColor;

  const lastMove =
    gameState.moveHistory.length > 0
      ? {
          from: gameState.moveHistory[gameState.moveHistory.length - 1].from,
          to: gameState.moveHistory[gameState.moveHistory.length - 1].to,
        }
      : null;

  function handleSquareClick(sq: Square) {
    const piece = gameState.board[sq.rank][sq.file];

    if (selected) {
      // Try to move
      if (legalMoves.some((m) => squareEquals(m, sq))) {
        // Check promotion
        const selPiece = gameState.board[selected.rank][selected.file];
        if (selPiece?.kind === "pawn" && (sq.rank === 0 || sq.rank === 7)) {
          setPromotionPending({ from: selected, to: sq });
          setSelected(null);
          setLegalMoves([]);
          return;
        }
        onMove(selected, sq);
        setSelected(null);
        setLegalMoves([]);
        return;
      }

      // Re-select own piece
      if (piece && piece.color === playerColor) {
        setSelected(sq);
        setLegalMoves(getLegalMoves(gameState, sq));
        return;
      }

      setSelected(null);
      setLegalMoves([]);
      return;
    }

    // Select piece
    if (piece && piece.color === playerColor) {
      setSelected(sq);
      setLegalMoves(getLegalMoves(gameState, sq));
    }
  }

  function handlePromotion(kind: PieceKind) {
    if (promotionPending) {
      onMove(promotionPending.from, promotionPending.to, kind);
      setPromotionPending(null);
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reset on turn change only
  useEffect(() => {
    setSelected(null);
    setLegalMoves([]);
  }, [gameState.currentTurn]);

  return (
    <div className="flex flex-col items-center gap-3 py-4 px-2 w-full max-w-2xl mx-auto">
      {/* Top bar */}
      <div className="w-full flex items-center justify-between px-2">
        <button
          type="button"
          onClick={onBack}
          className="text-sm flex items-center gap-1 transition-opacity hover:opacity-80"
          style={{ color: "rgba(240,217,181,0.4)" }}
          data-ocid="chess.button"
        >
          ← Menu
        </button>
        {roomCode && (
          <span
            className="font-mono text-xs px-2 py-0.5 rounded"
            style={{
              background: "rgba(181,136,99,0.1)",
              color: "rgba(240,217,181,0.4)",
              border: "1px solid rgba(181,136,99,0.15)",
            }}
          >
            Room: {roomCode}
          </span>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onNewGame}
          className="text-xs"
          style={{ color: "rgba(240,217,181,0.5)" }}
          data-ocid="chess.secondary_button"
        >
          New Game
        </Button>
      </div>

      {/* Status */}
      <div className="w-full px-2">
        <StatusBar
          gameState={gameState}
          isWaiting={isWaiting}
          roomCode={roomCode}
          currentPlayer={isAI ? playerColor : null}
        />
      </div>

      {/* AI thinking indicator */}
      {aiThinking && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
          style={{
            background: "rgba(181,136,99,0.1)",
            color: "rgba(240,217,181,0.5)",
          }}
          data-ocid="chess.loading_state"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
          AI is thinking…
        </div>
      )}

      {/* Board */}
      <ChessBoard
        gameState={gameState}
        selectedSquare={selected}
        legalMoves={legalMoves}
        playerColor={playerColor}
        onSquareClick={handleSquareClick}
        isInteractive={isInteractive}
        lastMove={lastMove}
      />

      {/* Captured pieces */}
      <div
        className="w-full rounded-xl px-3 py-1"
        style={{
          background: "rgba(20,12,6,0.5)",
          border: "1px solid rgba(101,72,46,0.2)",
        }}
      >
        <CapturedPieces
          capturedByWhite={gameState.capturedByWhite}
          capturedByBlack={gameState.capturedByBlack}
        />
      </div>

      {/* Move history */}
      <div className="w-full">
        <MoveHistory moves={gameState.moveHistory} />
      </div>

      {/* Game over overlay */}
      <AnimatePresence>
        {isGameOver && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="w-full flex justify-center"
          >
            <Button
              onClick={onNewGame}
              className="font-display text-base px-8 py-3 h-auto"
              style={{
                background: "rgba(181,136,99,0.25)",
                color: "#f0d9b5",
                border: "1px solid rgba(181,136,99,0.5)",
              }}
              data-ocid="chess.primary_button"
            >
              Play Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Promotion dialog */}
      <AnimatePresence>
        {promotionPending && (
          <PromotionDialog color={playerColor} onSelect={handlePromotion} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main ChessApp ─────────────────────────────────────────────────────────────
export default function ChessApp() {
  const { actor } = useActor();

  const [screen, setScreen] = useState<AppScreen>("home");
  const [gameMode, setGameMode] = useState<GameMode>("vsAI");
  const [aiDifficulty, setAIDifficulty] = useState<AIDifficulty>("medium");
  const [playerColor, setPlayerColor] = useState<PieceColor>("white");
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [gameState, setGameState] = useState<ChessGameState>(
    createInitialGameState(),
  );
  const [aiThinking, setAIThinking] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const aiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Polling for multiplayer ─────────────────────────────────────────────────
  const startPolling = useCallback(
    (code: string) => {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        if (!actor) return;
        try {
          const state = await actor.getGameState(code);
          if (!state) return;

          if ((state.gameStatus as string) === "waiting") {
            setIsWaiting(true);
          } else {
            setIsWaiting(false);
            // Sync board from backend
            const newBoard = boardFromBackend(state.board);
            setGameState((prev) => ({
              ...prev,
              board: newBoard,
              currentTurn: state.turnWhite ? "white" : "black",
              status:
                (state.gameStatus as string) === "checkmate"
                  ? "checkmate"
                  : (state.gameStatus as string) === "stalemate"
                    ? "stalemate"
                    : (state.gameStatus as string) === "draw"
                      ? "draw"
                      : "playing",
            }));
            if (screen === "waiting") setScreen("game");
          }
        } catch {
          // ignore polling errors
        }
      }, 1500);
    },
    [actor, screen],
  );

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    };
  }, []);

  // ── AI move trigger ────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      gameMode !== "vsAI" ||
      screen !== "game" ||
      gameState.currentTurn === playerColor ||
      gameState.status === "checkmate" ||
      gameState.status === "stalemate" ||
      gameState.status === "draw" ||
      aiThinking
    )
      return;

    setAIThinking(true);
    aiTimerRef.current = setTimeout(() => {
      const move = getAIMove(gameState, aiDifficulty);
      if (move) {
        setGameState((prev) => applyMoveToState(prev, move.from, move.to));
      }
      setAIThinking(false);
    }, 300);
  }, [gameState, gameMode, screen, playerColor, aiDifficulty, aiThinking]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleStartVsAI(diff: AIDifficulty) {
    setAIDifficulty(diff);
    setGameMode("vsAI");
    setPlayerColor("white");
    setGameState(createInitialGameState());
    setAIThinking(false);

    if (actor) {
      try {
        const code = await actor.createRoom("vsAI" as BackendGameMode);
        setRoomCode(code);
      } catch {
        // offline mode — no backend
      }
    }

    setScreen("game");
  }

  function handleSelectMultiplayer() {
    setGameMode("multiplayer");
    setScreen("creating" as AppScreen);
  }

  async function handleCreateRoom() {
    setCreatingRoom(true);
    try {
      if (actor) {
        const code = await actor.createRoom("multiplayer" as BackendGameMode);
        setRoomCode(code);
        const info: RoomInfo = { roomCode: code, playerColor: "white" };
        setRoomInfo(info);
        setPlayerColor("white");
        setIsWaiting(true);
        startPolling(code);
      } else {
        // Offline: generate a random 6-char code
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        setRoomCode(code);
        const info: RoomInfo = { roomCode: code, playerColor: "white" };
        setRoomInfo(info);
        setPlayerColor("white");
        setIsWaiting(false); // local play — just start
        setGameState(createInitialGameState());
        setScreen("game");
      }
    } catch {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(code);
      const info: RoomInfo = { roomCode: code, playerColor: "white" };
      setRoomInfo(info);
      setPlayerColor("white");
      setIsWaiting(false);
      setGameState(createInitialGameState());
      setScreen("game");
    } finally {
      setCreatingRoom(false);
    }
  }

  async function handleJoinRoom(code: string) {
    try {
      if (actor) {
        const joined = await actor.joinRoom(code);
        if (joined) {
          setRoomCode(code);
          setPlayerColor("black");
          setGameState(createInitialGameState());
          setIsWaiting(false);
          setScreen("game");
          startPolling(code);
        }
      } else {
        // Offline join — just start game as black
        setRoomCode(code);
        setPlayerColor("black");
        setGameState(createInitialGameState());
        setIsWaiting(false);
        setScreen("game");
      }
    } catch {
      setRoomCode(code);
      setPlayerColor("black");
      setGameState(createInitialGameState());
      setIsWaiting(false);
      setScreen("game");
    }
  }

  function handleMove(from: Square, to: Square, promoteTo?: PieceKind) {
    setGameState((prev) =>
      applyMoveToState(prev, from, to, promoteTo ?? "queen"),
    );

    if (gameMode === "multiplayer" && roomCode && actor) {
      actor
        .makeMove(
          roomCode,
          { file: BigInt(from.file), rank: BigInt(from.rank) },
          { file: BigInt(to.file), rank: BigInt(to.rank) },
        )
        .catch(() => {});
    }
  }

  function handleNewGame() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setGameState(createInitialGameState());
    setAIThinking(false);
    setIsWaiting(false);
    setRoomCode(null);
    setRoomInfo(null);
    setScreen("home");
  }

  function handleBack() {
    if (pollRef.current) clearInterval(pollRef.current);
    if (aiTimerRef.current) clearTimeout(aiTimerRef.current);
    setAIThinking(false);
    setIsWaiting(false);
    setRoomInfo(null);
    setScreen("home");
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen w-full flex flex-col"
      style={{
        background:
          "radial-gradient(ellipse at 50% 0%, #1e1208 0%, #100a04 60%, #0a0603 100%)",
      }}
    >
      <AnimatePresence mode="wait">
        {screen === "home" && (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex items-center justify-center"
          >
            <ModeSelect
              onSelectVsAI={handleStartVsAI}
              onSelectMultiplayer={handleSelectMultiplayer}
            />
          </motion.div>
        )}

        {(screen === "creating" || screen === "waiting") && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex-1 flex items-center justify-center"
          >
            <MultiplayerLobby
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onBack={handleBack}
              creating={creatingRoom}
              roomInfo={roomInfo}
            />
          </motion.div>
        )}

        {screen === "game" && (
          <motion.div
            key="game"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <ChessGameView
              gameState={gameState}
              playerColor={playerColor}
              roomCode={roomCode}
              isWaiting={isWaiting}
              onMove={handleMove}
              onNewGame={handleNewGame}
              onBack={handleBack}
              isAI={gameMode === "vsAI"}
              aiThinking={aiThinking}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer
        className="text-center py-3 text-xs"
        style={{ color: "rgba(240,217,181,0.2)" }}
      >
        © {new Date().getFullYear()}. Built with love using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "rgba(240,217,181,0.3)" }}
          className="hover:underline"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
