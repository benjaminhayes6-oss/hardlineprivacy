const { execSync } = require("child_process");

console.log("🧠 Hardline Master Operator Brain Online");

const workflows = [
  { name: "growth.yml", priority: "high" },
  { name: "domination.yml", priority: "high" },
  { name: "intelligence.yml", priority: "medium" },
  { name: "signals.yml", priority: "medium" },
  { name: "warroom.yml", priority: "conditional" },
  { name: "executive.yml", priority: "low" },
  { name: "authority.yml", priority: "low" }
];

function shouldRun(priority) {
  const hour = new Date().getUTCHours();

  if (priority === "high") return true;
  if (priority === "medium") return hour % 2 === 0;
  if (priority === "conditional") return hour >= 12;
  if (priority === "low") return hour === 15;

  return false;
}

for (const wf of workflows) {
  if (!shouldRun(wf.priority)) {
    console.log(`⏭ Skipping ${wf.name}`);
    continue;
  }

  console.log(`🚀 Dispatching ${wf.name}`);

  execSync(`
    gh api \
    -X POST \
    repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/${wf.name}/dispatches \
    -f ref=main
  `);
}

console.log("✅ Operator cycle complete");
