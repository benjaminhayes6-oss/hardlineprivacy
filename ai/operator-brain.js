const { execSync } = require("child_process");
const fs = require("fs");

console.log("🧠 HARDLINE AUTONOMOUS OPERATOR ONLINE");

/*
============================
SYSTEM CONFIG
============================
*/

const workflows = [
  "growth.yml",
  "domination.yml",
  "intelligence.yml",
  "signals.yml",
  "warroom.yml",
  "executive.yml",
  "authority.yml"
];

const SITE = "https://hardlineprivacy.com";

/*
============================
HELPERS
============================
*/

function run(cmd) {
  return execSync(cmd, { encoding: "utf8" });
}

function dispatch(workflow) {
  console.log(`🚀 Dispatching ${workflow}`);

  run(`
    gh api \
    -X POST \
    repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/${workflow}/dispatches \
    -f ref=main
  `);
}

/*
============================
AUTONOMOUS ANALYSIS
============================
*/

function analyzeRepoHealth() {
  console.log("🔎 Checking repo health...");

  const status = run("git status --porcelain");

  if (status.trim().length > 0) {
    console.log("⚠ Repo changes detected");
    createIssue("Repository changes detected requiring review");
  }
}

function analyzeWebsite() {
  console.log("🌐 Checking website availability...");

  try {
    run(`curl -Is ${SITE}`);
    console.log("✅ Website reachable");
  } catch {
    createIssue("Website appears unreachable");
  }
}

/*
============================
SELF-MANAGEMENT
============================
*/

function createIssue(title) {
  console.log(`📌 Creating Issue: ${title}`);

  run(`
    gh issue create \
    --title "${title}" \
    --body "Created automatically by Hardline Autonomous Operator."
  `);
}

/*
============================
AUTONOMOUS DECISION ENGINE
============================
*/

function runOperatorCycle() {
  console.log("⚙ Running autonomous cycle");

  analyzeRepoHealth();
  analyzeWebsite();

  workflows.forEach(dispatch);

  console.log("✅ Autonomous cycle complete");
}

runOperatorCycle();
