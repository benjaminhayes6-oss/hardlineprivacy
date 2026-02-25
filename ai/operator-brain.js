const fetch = require("node-fetch");

const token = process.env.GITHUB_TOKEN;

const owner = "benjaminhayes6-oss";
const repo = "hardlineprivacy";

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

  console.log(`Dispatching ${workflow}`);

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow}/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28"
      },
      body: JSON.stringify({
        ref: "main"
      })
    }
  );

  if (!response.ok) {
    const text = await response.text();
    console.log(`FAILED: ${workflow}`);
    console.log(text);
  } else {
    console.log(`SUCCESS: ${workflow}`);
  }
}

(async () => {
  console.log("MASTER OPERATOR ACTIVATED");

  for (const workflow of workflows) {
    await trigger(workflow);
  }

  console.log("ALL SYSTEMS TRIGGERED");
})();
