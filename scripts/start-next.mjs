import { spawn } from "node:child_process";

const port = process.env.PORT ?? "3016";
const child = spawn(
  "npx",
  ["next", "start", "--hostname", "0.0.0.0", "--port", port],
  {
    stdio: "inherit",
    shell: process.platform === "win32",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
