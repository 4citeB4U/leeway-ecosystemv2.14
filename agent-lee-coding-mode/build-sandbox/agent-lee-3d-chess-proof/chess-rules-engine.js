const FILES = "abcdefgh".split("");
const RANKS = "12345678".split("");
const WHITE = "white";
const BLACK = "black";

function squareToCoords(square) {
  const value = String(square || "").trim().toLowerCase();
  if (!/^[a-h][1-8]$/.test(value)) return null;
  return {
    file: FILES.indexOf(value[0]),
    rank: RANKS.indexOf(value[1])
  };
}

function coordsToSquare(file, rank) {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null;
  return `${FILES[file]}${RANKS[rank]}`;
}

function cloneBoard(board) {
  const next = {};
  for (const [square, piece] of Object.entries(board || {})) {
    next[square] = piece ? { ...piece } : piece;
  }
  return next;
}

function createInitialBoard() {
  const board = {};
  const whiteBack = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"];
  const blackBack = [...whiteBack];

  for (let i = 0; i < 8; i += 1) {
    board[coordsToSquare(i, 1)] = { type: "pawn", color: WHITE, family: "classic_grandmaster" };
    board[coordsToSquare(i, 6)] = { type: "pawn", color: BLACK, family: "classic_grandmaster" };
    board[coordsToSquare(i, 0)] = { type: whiteBack[i], color: WHITE, family: "classic_grandmaster" };
    board[coordsToSquare(i, 7)] = { type: blackBack[i], color: BLACK, family: "classic_grandmaster" };
  }

  return board;
}

function sameColor(pieceA, pieceB) {
  return pieceA && pieceB && pieceA.color === pieceB.color;
}

function pathClear(board, from, to) {
  const start = squareToCoords(from);
  const end = squareToCoords(to);
  if (!start || !end) return false;

  const deltaFile = Math.sign(end.file - start.file);
  const deltaRank = Math.sign(end.rank - start.rank);
  let file = start.file + deltaFile;
  let rank = start.rank + deltaRank;

  while (file !== end.file || rank !== end.rank) {
    const square = coordsToSquare(file, rank);
    if (board[square]) return false;
    file += deltaFile;
    rank += deltaRank;
  }

  return true;
}

function normalizeMove(move) {
  if (!move) return null;
  if (typeof move === "string") {
    const compact = move.replace(/[\s-]/g, "").toLowerCase();
    if (/^[a-h][1-8][a-h][1-8]$/.test(compact)) {
      return { from: compact.slice(0, 2), to: compact.slice(2, 4) };
    }
    return null;
  }

  if (typeof move === "object") {
    const from = String(move.from || move.source || "").toLowerCase();
    const to = String(move.to || move.target || "").toLowerCase();
    if (/^[a-h][1-8]$/.test(from) && /^[a-h][1-8]$/.test(to)) {
      return { from, to };
    }
  }

  return null;
}

function validateMove(moveInput, boardInput = createInitialBoard()) {
  const move = normalizeMove(moveInput);
  const board = cloneBoard(boardInput);

  if (!move) {
    return {
      ok: false,
      status: "illegal",
      reason: "MOVE_FORMAT_INVALID",
      notes: ["Use coordinate moves like e2e4."],
      selfCheckEvaluated: false
    };
  }

  const from = squareToCoords(move.from);
  const to = squareToCoords(move.to);
  const piece = board[move.from];
  const target = board[move.to];

  if (!piece) {
    return {
      ok: false,
      status: "illegal",
      reason: "NO_PIECE_AT_SOURCE",
      from: move.from,
      to: move.to,
      notes: ["There is no piece on the source square."],
      selfCheckEvaluated: false
    };
  }

  if (sameColor(piece, target)) {
    return {
      ok: false,
      status: "illegal",
      reason: "OWN_PIECE_BLOCKS_DESTINATION",
      from: move.from,
      to: move.to,
      piece,
      target,
      notes: ["A friendly piece is already on the destination square."],
      selfCheckEvaluated: false
    };
  }

  const fileDelta = to.file - from.file;
  const rankDelta = to.rank - from.rank;
  const absFile = Math.abs(fileDelta);
  const absRank = Math.abs(rankDelta);
  const forward = piece.color === WHITE ? 1 : -1;
  const pawnStartRank = piece.color === WHITE ? 1 : 6;

  switch (piece.type) {
    case "pawn": {
      const oneStep = fileDelta === 0 && rankDelta === forward && !target;
      const twoStep = fileDelta === 0 && rankDelta === forward * 2 && from.rank === pawnStartRank && !target && !board[coordsToSquare(from.file, from.rank + forward)];
      const capture = absFile === 1 && rankDelta === forward && !!target && target.color !== piece.color;

      if (!oneStep && !twoStep && !capture) {
        return {
          ok: false,
          status: "illegal",
          reason: "PAWN_MOVE_INVALID",
          from: move.from,
          to: move.to,
          piece,
          target,
          notes: ["Pawn moves must be forward, capture diagonally, or take the two-step from home."],
          selfCheckEvaluated: false,
          partialRules: true
        };
      }
      break;
    }
    case "knight":
      if (!((absFile === 1 && absRank === 2) || (absFile === 2 && absRank === 1))) {
        return illegal("KNIGHT_MOVE_INVALID", "Knight moves in an L shape.");
      }
      break;
    case "bishop":
      if (absFile !== absRank || !pathClear(board, move.from, move.to)) {
        return illegal("BISHOP_MOVE_INVALID", "Bishop moves on a clear diagonal.");
      }
      break;
    case "rook":
      if (!(fileDelta === 0 || rankDelta === 0) || !pathClear(board, move.from, move.to)) {
        return illegal("ROOK_MOVE_INVALID", "Rook moves in a straight line with no pieces in the way.");
      }
      break;
    case "queen":
      if (!((fileDelta === 0 || rankDelta === 0) || absFile === absRank) || !pathClear(board, move.from, move.to)) {
        return illegal("QUEEN_MOVE_INVALID", "Queen moves like rook or bishop on a clear line.");
      }
      break;
    case "king":
      if (absFile > 1 || absRank > 1) {
        return {
          ok: false,
          status: "guarded",
          reason: "CASTLING_AND_CHECK_NOT_IMPLEMENTED",
          from: move.from,
          to: move.to,
          piece,
          target,
          notes: ["King moves are limited to one square here; castling and check safety stay guarded."],
          selfCheckEvaluated: false,
          partialRules: true
        };
      }
      break;
    default:
      return illegal("PIECE_TYPE_UNSUPPORTED", "Piece type is not recognized by this proof engine.");
  }

  return {
    ok: true,
    status: "legal",
    reason: "BASIC_RULES_PASS",
    from: move.from,
    to: move.to,
    piece,
    target: target || null,
    notes: [
      "Basic movement passed.",
      "Self-check, repetition, and advanced engine search remain outside this partial proof."
    ],
    selfCheckEvaluated: false,
    partialRules: true
  };
}

function illegal(reason, detail) {
  return {
    ok: false,
    status: "illegal",
    reason,
    notes: [detail],
    selfCheckEvaluated: false,
    partialRules: true
  };
}

function evaluateMoveList(moveList, board) {
  return (moveList || []).map((move) => ({
    move,
    result: validateMove(move, board)
  }));
}

globalThis.AgentLeeChessRules = {
  squareToCoords,
  coordsToSquare,
  createInitialBoard,
  validateMove,
  evaluateMoveList
};
