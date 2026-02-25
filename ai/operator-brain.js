const fetch = require("node-fetch");

const token = process.env.GITHUB_TOKEN;
const repo = "hardlineprivacy";
const owner = "benjaminhayes6-oss";

const workflows = [
  "growth.yml",
  "domination.yml",
  "intelligence.yml",
  "signals.yml",
  "warroom.yml",
  "executive.yml",
  "authority.yml"
];

async function trigger(workflow) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`;

  await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json"
    },
    body: JSON.stringify({
      ref: "main"
    })
  });

  console.log(`Triggered ${workflow}`);
}

async function run() {
  console.log("MASTER OPERATOR ONLINE");

  for (const workflow of workflows) {
    await trigger(workflow);
  }

  console.log("ALL SYSTEMS EXECUTED");
}

run();
