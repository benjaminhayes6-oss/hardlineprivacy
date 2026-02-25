import fs from "fs";
import fetch from "node-fetch";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function askBrain(prompt) {
const res = await fetch("https://api.openai.com/v1/responses", {
method: "POST",
headers: {
"Content-Type": "application/json",
Authorization: `Bearer ${OPENAI_API_KEY}`,
},
body: JSON.stringify({
model: "gpt-4o-mini",
input: prompt,
max_output_tokens: 600,
}),
});

const json = await res.json();
return json.output_text;
}

async function readState() {
if (!fs.existsSync(".brain")) fs.mkdirSync(".brain");

if (!fs.existsSync(".brain/state.json")) {
fs.writeFileSync(
".brain/state.json",
JSON.stringify({ lastActions: [] }, null, 2)
);
}

return JSON.parse(fs.readFileSync(".brain/state.json"));
}

async function saveState(state) {
fs.writeFileSync(".brain/state.json", JSON.stringify(state, null, 2));
}

async function decide() {
const state = await readState();

const decision = await askBrain(`
You are the autonomous CEO of Hardline Privacy.

Decide which systems should run today.

Available systems:

* authority
* growth
* domination
* intelligence
* warroom
* executive

Return ONLY JSON:

{
"run":[]
}

Previous actions:
${JSON.stringify(state.lastActions)}
`);

return JSON.parse(decision);
}

async function runEngine(name) {
console.log("Running:", name);

await fetch(
`https://api.github.com/repos/${process.env.GITHUB_REPOSITORY}/actions/workflows/${name}.yml/dispatches`,
{
method: "POST",
headers: {
Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
Accept: "application/vnd.github+json",
},
body: JSON.stringify({ ref: "main" }),
}
);
}

async function main() {
const decision = await decide();

for (const engine of decision.run) {
await runEngine(engine);
}

const state = await readState();
state.lastActions = decision.run;
await saveState(state);

console.log("Operator cycle complete.");
}

main();
