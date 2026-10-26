import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
const [output, guardian, runtime] = process.argv.slice(2);
if (process.platform !== "win32" || process.arch !== "x64" || !output || !path.isAbsolute(output)) {
  throw Error("Windows x64: provide a NEW absolute output directory, guardian and runtime.");
}
fs.mkdirSync(output);
const source = fileURLToPath(new URL("./windows-terminal-nesting.cs", import.meta.url));
const compiler = path.join(process.env.SystemRoot, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe");
const executable = path.join(output, "nesting-probe.exe");
const sha256 = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const sourceSha256 = sha256(source), compilerSha256 = sha256(compiler);
const compile = spawnSync(compiler, [
  "/nologo",
  "/target:exe",
  "/platform:x64",
  "/reference:System.Web.Extensions.dll",
  "/out:" + executable,
  source
], { windowsHide: true, encoding: "utf8" });
fs.writeFileSync(path.join(output, "compile.log"), compile.stdout + compile.stderr);
assert.equal(compile.status, 0);
assert.equal(sha256(source), sourceSha256);
assert.equal(sha256(compiler), compilerSha256);
const results = [];
for (const mode of ["normal", "restricted"]) {
  const sentinel = path.join(output, mode + "-sentinel");
  const broker = path.join(output, mode + "-broker.cjs");
  const receipt = path.join(output, mode + "-result.json");
  fs.writeFileSync(broker, `require('fs').writeFileSync(${JSON.stringify(sentinel)},'SYNTHETIC');process.stdout.write(JSON.stringify({t:'exit',exitCode:7})+String.fromCharCode(10));`);
  const log = fs.openSync(path.join(output, mode + ".log"), "wx");
  const child = spawn(executable, [mode, guardian, runtime, broker, receipt], {
    windowsHide: true,
    stdio: ["ignore", log, log]
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, 1e4);
  const code = await new Promise((resolve) => child.once("close", resolve));
  clearTimeout(timer);
  fs.closeSync(log);
  assert.equal(timedOut, false, "Native nesting probe retained its ten-second bound");
  const value = JSON.parse(fs.readFileSync(receipt, "utf8"));
  const commandStarted = fs.existsSync(sentinel);
  if (value.phase === "guardian") {
    const first = JSON.parse(value.first);
    if (first.t === "job-ready") {
      assert.equal(commandStarted, true);
      assert.ok(value.remaining.split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line)).some((frame) => frame.t === "exit" && frame.exitCode === 7));
    } else {
      assert.equal(first.t, "error");
      assert.equal(first.code, "job-setup-failed");
      assert.equal(commandStarted, false);
    }
  } else {
    assert.equal(value.phase, "outer-job-setup");
    assert.equal(commandStarted, false);
  }
  results.push({ mode, code, commandStarted, ...value });
}
const result = { sourceSha256, compilerSha256, probeSha256: sha256(executable), results };
fs.writeFileSync(path.join(output, "acceptance.json"), JSON.stringify(result, null, 2) + "\n", { flag: "wx" });
console.log(JSON.stringify(result));
