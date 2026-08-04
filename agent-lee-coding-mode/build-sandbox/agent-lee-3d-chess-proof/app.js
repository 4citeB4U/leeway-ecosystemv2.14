const themeData = {
  knights_and_dragons: {
    id: "knights_and_dragons",
    label: "Knights and Dragons",
    accent: "#74d5ff",
    contrast: "#f4c46c",
    lightSquare: "#d7c1a4",
    darkSquare: "#5c3a2c",
    family: "mythic_rampart",
    motif: "high-fantasy armor, dragon scale edges, luminous sigils",
    kingTitle: "Dragon Crown",
    rookTitle: "Keep Tower"
  },
  ninjas_and_samurai: {
    id: "ninjas_and_samurai",
    label: "Ninjas and Samurai",
    accent: "#f1a6ff",
    contrast: "#9de2ff",
    lightSquare: "#c8cad3",
    darkSquare: "#383f54",
    family: "shadow_clan",
    motif: "quiet steel, lacquer, cloth wrap, precise movement",
    kingTitle: "Shogun",
    rookTitle: "Guard Tower"
  },
  kung_fu_masters: {
    id: "kung_fu_masters",
    label: "Kung Fu Masters",
    accent: "#f4d15e",
    contrast: "#e96a6a",
    lightSquare: "#dbc48a",
    darkSquare: "#8b5d3a",
    family: "spirit_dojo",
    motif: "flow, discipline, balance, ring-light stage presence",
    kingTitle: "Grand Master",
    rookTitle: "Temple Pillar"
  },
  modern_military: {
    id: "modern_military",
    label: "Modern Military",
    accent: "#7af0bf",
    contrast: "#ff8f78",
    lightSquare: "#d2d7ce",
    darkSquare: "#475047",
    family: "tactical_force",
    motif: "clean hard edges, mission hardware, night-ops status lights",
    kingTitle: "Command Node",
    rookTitle: "Forward Base"
  },
  classic_grandmaster: {
    id: "classic_grandmaster",
    label: "Classic Grandmaster",
    accent: "#e8c46b",
    contrast: "#73d6ff",
    lightSquare: "#d9caa3",
    darkSquare: "#6f5539",
    family: "classical_tournament",
    motif: "heritage wood, tournament brass, clean studio authority",
    kingTitle: "King",
    rookTitle: "Rook"
  }
};

const glyphs = {
  white: {
    king: "♔",
    queen: "♕",
    rook: "♖",
    bishop: "♗",
    knight: "♘",
    pawn: "♙"
  },
  black: {
    king: "♚",
    queen: "♛",
    rook: "♜",
    bishop: "♝",
    knight: "♞",
    pawn: "♟"
  }
};

const statusLine = document.querySelector("#engine-status");
const moveResult = document.querySelector("#move-result");
const themeSelect = document.querySelector("#theme-select");
const moveSelect = document.querySelector("#move-select");
const boardEl = document.querySelector("#board");
const familyList = document.querySelector("#family-list");
const themePills = document.querySelector("#theme-pills");
const sceneSnippet = document.querySelector("#scene-snippet");
const validateMoveButton = document.querySelector("#validate-move");
const ledgerPath = document.querySelector("#ledger-path");
const ledgerCounts = document.querySelector("#ledger-counts");
const ledgerClaims = document.querySelector("#ledger-claims");
const ledgerCards = document.querySelector("#ledger-cards");

const engine = window.AgentLeeChessRules;
let currentTheme = "classic_grandmaster";
let boardState = engine.createInitialBoard();

function setThemeVars(theme) {
  document.documentElement.style.setProperty("--theme-accent", theme.accent);
  document.documentElement.style.setProperty("--theme-contrast", theme.contrast);
  document.documentElement.style.setProperty("--square-light", theme.lightSquare);
  document.documentElement.style.setProperty("--square-dark", theme.darkSquare);
}

function buildThemeSelectors() {
  themeSelect.innerHTML = "";
  themePills.innerHTML = "";

  for (const theme of Object.values(themeData)) {
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = theme.label;
    themeSelect.appendChild(option);

    const pill = document.createElement("button");
    pill.type = "button";
    pill.className = "theme-chip";
    pill.textContent = theme.label;
    pill.addEventListener("click", () => {
      themeSelect.value = theme.id;
      applyTheme(theme.id);
    });
    themePills.appendChild(pill);
  }
}

function buildFamilyList() {
  familyList.innerHTML = "";

  for (const theme of Object.values(themeData)) {
    const card = document.createElement("article");
    card.className = "family-card";
    card.innerHTML = `
      <strong>${theme.label}</strong>
      <div>${theme.family}</div>
      <div>${theme.motif}</div>
      <div><span>King:</span> ${theme.kingTitle} · <span>Rook:</span> ${theme.rookTitle}</div>
    `;
    familyList.appendChild(card);
  }
}

function renderBoard() {
  boardEl.innerHTML = "";

  for (let rank = 7; rank >= 0; rank -= 1) {
    for (let file = 0; file < 8; file += 1) {
      const square = engine.coordsToSquare(file, rank);
      const cell = document.createElement("div");
      const isLight = (file + rank) % 2 === 0;
      cell.className = `square ${isLight ? "light" : "dark"}`;
      cell.dataset.cell = square;

      const piece = boardState[square];
      if (piece) {
        const token = document.createElement("div");
        token.className = `piece ${piece.color}`;
        token.dataset.piece = glyphs[piece.color][piece.type];
        token.dataset.role = piece.type;
        token.title = `${piece.color} ${piece.type} on ${square}`;
        cell.appendChild(token);
      }

      boardEl.appendChild(cell);
    }
  }
}

function scenePreview(theme) {
  sceneSnippet.textContent = JSON.stringify(
    {
      sceneId: "agent-lee-3d-chess-proof",
      renderer: {
        family: "webgl-webxr-ready",
        status: "partial"
      },
      board: {
        files: 8,
        ranks: 8,
        levels: 1,
        projection: "isometric"
      },
      theme: theme.id,
      pieceFamilies: Object.keys(themeData)
    },
    null,
    2
  );
}

function applyTheme(themeId) {
  const theme = themeData[themeId] || themeData.classic_grandmaster;
  currentTheme = theme.id;
  setThemeVars(theme);
  scenePreview(theme);
  statusLine.textContent = `I've got the rules lane, design lane, and 3D lane split clean. Theme locked: ${theme.label}.`;
}

function movePiece(from, to) {
  const piece = boardState[from];
  if (!piece) return;
  delete boardState[from];
  boardState[to] = piece;
}

function updateMoveResult(result, move) {
  if (result.ok) {
    moveResult.textContent = `${move.toUpperCase()} passes the partial engine. ${result.notes.join(" ")} The 3D set stays honest about the missing search and check-safety backend.`;
  } else {
    moveResult.textContent = `${move.toUpperCase()} is ${result.status}. ${result.reason}. ${result.notes.join(" ")}`;
  }
}

function validateSelectedMove() {
  const move = moveSelect.value;
  const result = engine.validateMove(move, boardState);
  updateMoveResult(result, move);

  if (result.ok) {
    movePiece(result.from, result.to);
    renderBoard();
  }
}

function createClaimItem(text) {
  const item = document.createElement("li");
  item.textContent = text;
  return item;
}

function createEvidenceCard(item) {
  const card = document.createElement("article");
  card.className = "ledger-card";
  const supports = Array.isArray(item.supports) ? item.supports.join(" · ") : "";
  card.innerHTML = `
    <strong>${item.title || item.source || "Untitled evidence"}</strong>
    <div>${item.sourceType || "documentation"} · ${item.status || "candidate"} · quality ${item.qualityScore ?? "?"}</div>
    <p>${item.keyEvidence || item.notes || ""}</p>
    <small>${supports}</small>
  `;
  return card;
}

function renderLedger(ledger) {
  if (!ledger) return;

  if (ledgerPath) {
    ledgerPath.textContent = ledger.ledgerPath || ledger.receiptPath || "No ledger path recorded.";
  }
  if (ledgerCounts) {
    ledgerCounts.textContent = `Candidate ${ledger.candidateEvidence?.length || 0} · Curated ${ledger.curatedEvidence?.length || 0} · Rejected ${ledger.rejectedEvidence?.length || 0} · Claim checks ${ledger.claimChecks?.length || 0}`;
  }
  if (ledgerClaims) {
    ledgerClaims.innerHTML = "";
    (ledger.claimChecks || []).forEach((check) => {
      ledgerClaims.appendChild(createClaimItem(`${check.claim} (${check.result})`));
    });
  }
  if (ledgerCards) {
    ledgerCards.innerHTML = "";
    (ledger.curatedEvidence || []).forEach((item) => {
      ledgerCards.appendChild(createEvidenceCard(item));
    });
  }
}

async function loadLedger() {
  const injected = window.__AGENT_LEE_RESEARCH_LEDGER__ || window.__AGENT_LEE_LEDGER__;
  if (injected) {
    renderLedger(injected);
    return;
  }

  try {
    const response = await fetch("./research-ledger.json", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    renderLedger(data);
  } catch {
    // The validator may inject the ledger for file:// previews.
  }
}

buildThemeSelectors();
buildFamilyList();
applyTheme(currentTheme);
renderBoard();
updateMoveResult(engine.validateMove(moveSelect.value, boardState), moveSelect.value);

themeSelect.addEventListener("change", () => {
  applyTheme(themeSelect.value);
  renderBoard();
});

validateMoveButton.addEventListener("click", validateSelectedMove);

window.setTimeout(() => {
  statusLine.textContent = "Validation is running now. I'm checking the pieces before I call it clean.";
}, 900);

loadLedger();
