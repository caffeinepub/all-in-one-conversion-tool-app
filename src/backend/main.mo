import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import List "mo:core/List";
import Principal "mo:core/Principal";



actor {
  public type Position = {
    file : Nat; // 0-7 (a-h)
    rank : Nat; // 0-7 (1-8)
  };

  public type PieceType = {
    #pawn;
    #knight;
    #bishop;
    #rook;
    #queen;
    #king;
  };

  public type Piece = {
    pieceType : PieceType;
    isWhite : Bool;
  };

  public type Move = {
    from : Position;
    to : Position;
    piece : Piece;
    captured : ?Piece;
  };

  public type GameState = {
    board : [[?Piece]];
    turnWhite : Bool;
    moves : [Move];
    gameStatus : GameStatus;
    mode : GameMode;
    player1 : Principal.Principal;
    player2 : ?Principal.Principal;
  };

  public type GameMode = {
    #multiplayer;
    #vsAI;
  };

  public type GameStatus = {
    #waiting;
    #playing;
    #checkmate;
    #stalemate;
    #draw;
  };

  let games = Map.empty<Text, GameState>();

  public query ({ caller }) func getGameState(roomCode : Text) : async ?GameState {
    games.get(roomCode);
  };

  public shared ({ caller }) func createRoom(mode : GameMode) : async Text {
    let roomCode = generateRoomCode();
    let initialState : GameState = {
      board = initialBoard();
      turnWhite = true;
      moves = [];
      gameStatus = #waiting;
      mode;
      player1 = caller;
      player2 = null;
    };

    games.add(roomCode, initialState);
    roomCode;
  };

  public query ({ caller }) func joinRoom(roomCode : Text) : async Bool {
    switch (games.get(roomCode)) {
      case (null) { false };
      case (?state) {
        true;
      };
    };
  };

  public shared ({ caller }) func makeMove(roomCode : Text, from : Position, to : Position) : async Bool {
    switch (games.get(roomCode)) {
      case (null) { false };
      case (?state) {
        true;
      };
    };
  };

  public shared ({ caller }) func resetGame(roomCode : Text) : async Bool {
    switch (games.get(roomCode)) {
      case (null) { false };
      case (?state) {
        true;
      };
    };
  };

  func generateRoomCode() : Text {
    // Simple deterministic code for now
    "ROOM" # games.size().toText();
  };

  func initialBoard() : [[?Piece]] {
    let board = List.empty<List.List<?Piece>>();

    let emptyRow = List.empty<?Piece>();
    for (_ in Nat.range(0, 8)) {
      emptyRow.add(null);
    };

    for (_ in Nat.range(0, 8)) {
      board.add(emptyRow);
    };

    let resultBoard = List.empty<[?Piece]>();
    for (_ in Nat.range(0, 8)) {
      resultBoard.add([null, null, null, null, null, null, null, null]);
    };
    resultBoard.toArray();
  };
};

