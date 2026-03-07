import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Move {
    to: Position;
    from: Position;
    captured?: Piece;
    piece: Piece;
}
export interface Position {
    file: bigint;
    rank: bigint;
}
export type Principal = Principal;
export interface Piece {
    pieceType: PieceType;
    isWhite: boolean;
}
export interface GameState {
    moves: Array<Move>;
    mode: GameMode;
    gameStatus: GameStatus;
    player1: Principal;
    player2?: Principal;
    turnWhite: boolean;
    board: Array<Array<Piece | null>>;
}
export enum GameMode {
    vsAI = "vsAI",
    multiplayer = "multiplayer"
}
export enum GameStatus {
    stalemate = "stalemate",
    draw = "draw",
    playing = "playing",
    checkmate = "checkmate",
    waiting = "waiting"
}
export enum PieceType {
    king = "king",
    pawn = "pawn",
    rook = "rook",
    queen = "queen",
    knight = "knight",
    bishop = "bishop"
}
export interface backendInterface {
    createRoom(mode: GameMode): Promise<string>;
    getGameState(roomCode: string): Promise<GameState | null>;
    joinRoom(roomCode: string): Promise<boolean>;
    makeMove(roomCode: string, from: Position, to: Position): Promise<boolean>;
    resetGame(roomCode: string): Promise<boolean>;
}
