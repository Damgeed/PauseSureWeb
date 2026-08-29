import { spawn } from "node:child_process";

const delaysMilliseconds = [0, 10_000, 20_000];

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function runSmoke() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/verify-production.mjs"], {
      env: process.env,
      stdio: "inherit",
    });
    child.once("error", () => resolve(1));
    child.once("exit", (code, signal) => resolve(signal ? 1 : (code ?? 1)));
  });
}

for (let attempt = 0; attempt < delaysMilliseconds.length; attempt += 1) {
  const delay = delaysMilliseconds[attempt];
  if (delay > 0) {
    console.log(`Waiting ${delay / 1_000}s for Cloudflare propagation before smoke attempt ${attempt + 1}…`);
    await wait(delay);
  }

  const exitCode = await runSmoke();
  if (exitCode === 0) process.exit(0);
  if (attempt < delaysMilliseconds.length - 1) {
    console.warn(`Production smoke attempt ${attempt + 1} failed; retrying within the bounded propagation window.`);
  }
}

console.error("PauseSure production smoke did not pass within the bounded propagation window.");
process.exit(1);
