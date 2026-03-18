import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
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

  // ── WebRTC Signaling for Mobile Camera ──────────────────────────────────────

  public type CamSession = {
    offer : Text;
    answer : ?Text;
    desktopCandidates : [Text];
    mobileCandidates : [Text];
  };

  let games = Map.empty<Text, GameState>();
  let camSessions = Map.empty<Text, CamSession>();

  // Create a new camera session with an SDP offer from desktop
  public shared func createCamSession(offer : Text) : async Text {
    let sessionId = "CAM" # camSessions.size().toText();
    let session : CamSession = {
      offer;
      answer = null;
      desktopCandidates = [];
      mobileCandidates = [];
    };
    camSessions.add(sessionId, session);
    sessionId;
  };

  // Mobile sets the SDP answer
  public shared func setCamAnswer(sessionId : Text, answer : Text) : async Bool {
    switch (camSessions.get(sessionId)) {
      case (null) { false };
      case (?s) {
        let updated : CamSession = {
          offer = s.offer;
          answer = ?answer;
          desktopCandidates = s.desktopCandidates;
          mobileCandidates = s.mobileCandidates;
        };
        camSessions.add(sessionId, updated);
        true;
      };
    };
  };

  // Add an ICE candidate (fromMobile = true means mobile added it)
  public shared func addCamIceCandidate(sessionId : Text, candidate : Text, fromMobile : Bool) : async Bool {
    switch (camSessions.get(sessionId)) {
      case (null) { false };
      case (?s) {
        let updated : CamSession = if (fromMobile) {
          {
            offer = s.offer;
            answer = s.answer;
            desktopCandidates = s.desktopCandidates;
            mobileCandidates = s.mobileCandidates.concat([candidate]);
          };
        } else {
          {
            offer = s.offer;
            answer = s.answer;
            desktopCandidates = s.desktopCandidates.concat([candidate]);
            mobileCandidates = s.mobileCandidates;
          };
        };
        camSessions.add(sessionId, updated);
        true;
      };
    };
  };

  // Query session state
  public query func getCamSession(sessionId : Text) : async ?CamSession {
    camSessions.get(sessionId);
  };

  // ── Chess ───────────────────────────────────────────────────────────────────

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

