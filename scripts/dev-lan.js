#!/usr/bin/env node
const { networkInterfaces } = require("os");
const { spawn } = require("child_process");

const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

const lanIp =
  Object.values(networkInterfaces())
    .flat()
    .find((n) => n && n.family === "IPv4" && !n.internal)?.address || "0.0.0.0";

const lanUrl = `http://${lanIp}:${PORT}`;
const localUrl = `http://localhost:${PORT}`;

console.log(`Starting dev server:\n  Local:   ${localUrl}\n  Network: ${lanUrl}\n`);

const child = spawn("npx", ["next", "dev", "--hostname", HOST, "--port", PORT], {
  stdio: "inherit",
  env: { ...process.env, HOST, PORT },
});

child.on("exit", (code) => process.exit(code ?? 0));
