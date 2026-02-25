const { execSync } = require("child_process");
const fs = require("fs");

console.log("🧠 HARDLINE AUTONOMOUS OPERATOR ONLINE");

/*
============================
SYSTEM CONFIG
============================
*/

const SITE = "https://hardlineprivacy.com";
let workflows = [];

/*
============================
HELPERS
============================
*/

function run(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["pipe","pipe","pipe"] });
  } catch (err) {
    console.log("⚠ Command failed:", cmd);
    console.log(err.message);
    return "";
  }
}

/*
============================
DISCOVER WORKFLOWS
(Self-aware system)
============================
*/

function discoverWorkflows() {
  console.log("🧠 Discovering workflows automatically...");

  const result = run(`gh workflow list --json name,path`);

  if (!result) {
    console.log("⚠ Unable to read workflows");
    return;
  }

  const parsed = JSON.parse(result);

  workflows = parsed
    .filter(wf => !wf.path.includes("operator.yml"))
    .map(wf => wf.name);

  console.log("✅ Workflows found:", workflows);
}

/*
============================
DISPATCH WORKFLOW
============================
*/

function dispatch(workflow) {
  console.log(`🚀 Dispatching ${workflow}`);

  run(`
    gh workflow run "${workflow}" --ref main
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
SELF MANAGEMENT
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
SELF IMPROVEMENT ENGINE
============================
*/

function selfImprove() {
  console.log("🧠 Running Self-Improvement Engine");

  const improvements = [
    {
      title: "Improve SEO meta descriptions",
      file: "index.html",
      change: "<!-- AI Suggestion: Improve meta descriptions for SEO -->"
    },
    {
      title: "Add trust signals section",
      file: "index.html",
      change: "<!-- AI Suggestion: Add testimonials / authority badges -->"
    }
  ];

  improvements.forEach(improvement => {
    try {
      if (!fs.existsSync(improvement.file)) return;

      console.log(`✨ Improving: ${improvement.title}`);

      fs.appendFileSync(
        improvement.file,
        `\n${improvement.change}\n`
      );

      run(`git config user.name "Hardline AI Operator"`);
      run(`git config user.email "ai@hardlineprivacy.com"`);

      const branch = `ai-improvement-${Date.now()}`;

      run(`git checkout -b ${branch}`);
      run(`git add .`);
      run(`git commit -m "AI Improvement: ${improvement.title}"`);
      run(`git push origin ${branch}`);

      run(`
        gh pr create \
        --title "AI Improvement: ${improvement.title}" \
        --body "Automatically generated improvement by Hardline Autonomous Operator." \
        --head ${branch}
      `);

    } catch (e) {
      console.log("⚠ Skipped improvement:", e.message);
    }
  });
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

  discoverWorkflows();

  workflows.forEach(dispatch);

  selfImprove();

  console.log("✅ Autonomous cycle complete");
}

/*
============================
START OPERATOR
============================
*/

runOperatorCycle();
