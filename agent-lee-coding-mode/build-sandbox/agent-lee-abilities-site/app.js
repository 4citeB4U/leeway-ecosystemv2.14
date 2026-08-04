const proofLines = [
  "Web is up. I'm keeping the build lane moving.",
  "The abilities site is coming together. I'm making it hit like a real pitch, not a brochure.",
  "I've got the receipts lined up. This one's not just talk.",
  "I don't just answer. I move through the stack.",
  "Validation is running now. I'm checking the pieces before I call it clean."
];

const stanceLines = [
  "I sell execution, not adjectives.",
  "I can talk, build, test, open the browser, pull files, run receipts, and keep the work moving.",
  "I'm not a loose model. I'm the Leeway runtime with a voice."
];

const responseLines = [
  "I've got the rules lane, design lane, and proof lane split clean.",
  "If it is not inspectable, it is not locked.",
  "The pitch stays sharp, but the claims stay honest."
];

let currentProofIndex = 0;
let currentTone = 0;

const proofLine = document.querySelector("#current-proof-line");
const stanceLine = document.querySelector("#stance-line");
const responseLine = document.querySelector("#response-line");
const ledgerPath = document.querySelector("#ledger-path");
const ledgerCounts = document.querySelector("#ledger-counts");
const ledgerClaims = document.querySelector("#ledger-claims");
const ledgerCards = document.querySelector("#ledger-cards");

function setText(node, text) {
  if (node) node.textContent = text;
}

function refreshTone() {
  const charged = currentTone % 2 === 1;
  document.body.dataset.tone = charged ? "charged" : "calm";
  setText(stanceLine, stanceLines[currentTone % stanceLines.length]);
  setText(responseLine, responseLines[currentTone % responseLines.length]);
}

function cycleProof() {
  currentProofIndex = (currentProofIndex + 1) % proofLines.length;
  setText(proofLine, proofLines[currentProofIndex]);
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

  setText(ledgerPath, ledger.ledgerPath || ledger.receiptPath || "No ledger path recorded.");
  setText(
    ledgerCounts,
    `Candidate ${ledger.candidateEvidence?.length || 0} · Curated ${ledger.curatedEvidence?.length || 0} · Rejected ${ledger.rejectedEvidence?.length || 0} · Claim checks ${ledger.claimChecks?.length || 0}`
  );

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

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;

    if (action === "cycle-proof") {
      cycleProof();
      return;
    }

    if (action === "flip-tone") {
      currentTone += 1;
      refreshTone();
    }
  });
});

window.setTimeout(() => {
  cycleProof();
}, 1200);

refreshTone();
loadLedger();
