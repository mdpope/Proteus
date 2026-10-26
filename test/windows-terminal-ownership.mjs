import { WorkspaceFiles } from "../src/services/workspaces/workspace-files.js";
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { spawn as nativeSpawn } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createWindowsPty } from "../src/services/tools/windows-terminal/proxy.js";
import { TerminalStore } from "../src/services/tools/terminals.js";
const require2 = createRequire(import.meta.url), k = require2("koffi"), kernel = k.load("kernel32.dll"), open = kernel.func("void * __stdcall OpenProcess(uint32_t,bool,uint32_t)"), wait = kernel.func("uint32_t __stdcall WaitForSingleObject(void *,uint32_t)"), times = kernel.func("bool __stdcall GetProcessTimes(void *,void *,void *,void *,void *)"), close = kernel.func("bool __stdcall CloseHandle(void *)"), current = kernel.func("void * __stdcall GetCurrentProcess()"), count = kernel.func("bool __stdcall GetProcessHandleCount(void *,uint32_t *)");
const [out, helper, failureHelper, legacyRoot] = process.argv.slice(2);
if (process.platform !== "win32" || !out || !helper) throw Error("Windows: provide NEW absolute receipt directory and exact compiled guardian");
fs.mkdirSync(out);
const emit = (type, value = {}) => fs.appendFileSync(out + "/events.jsonl", JSON.stringify({ type, wall: (/* @__PURE__ */ new Date()).toISOString(), monoNs: process.hrtime.bigint().toString(), ...value }) + "\n");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms)), until = async (fn, label, ms = 1e4) => {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await fn()) return;
    await sleep(25);
  }
  throw Error("Timed out: " + label);
};
function handleCount() {
  const b = Buffer.alloc(4);
  assert.equal(count(current(), b), true);
  return b.readUInt32LE();
}
function identity(pid, held = false) {
  const h = open(1048576 | 4096, false, pid);
  if (!h) return { pid, alive: false };
  const b = [Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8), Buffer.alloc(8)];
  assert.equal(times(h, ...b), true);
  const record = { pid, alive: wait(h, 0) === 258, created: b[0].toString("hex") };
  if (held) return { record, alive: () => wait(h, 0) === 258, release: () => close(h) };
  close(h);
  return record;
}
const spawnOwned = createWindowsPty({ guardianPath: helper });
const legacy = legacyRoot ? await import(pathToFileURL(legacyRoot + (fs.existsSync(legacyRoot + "/src/terminals.js") ? "/src/terminals.js" : "/src/services/tools/terminals.js"))) : null;
let serial = 0, failures = 0;
async function terminalCase(mode, { crashGuardian = false } = {}) {
  const dir = path.join(out, String(++serial) + "-" + mode);
  fs.mkdirSync(dir);
  const pidfile = dir + "/descendant.json", shellFile = dir + "/shell.json", desc = dir + "/descendant.cjs", ps = dir + "/shell.ps1";
  const node = process.env.PROTEUS_TEST_NODE;
  assert.ok(node);
  fs.writeFileSync(desc, `require('fs').writeFileSync(${JSON.stringify(pidfile)},JSON.stringify({pid:process.pid}));setTimeout(()=>process.exit(0),12000);setInterval(()=>{},1000).unref();`);
  fs.writeFileSync(ps, `$PID | Set-Content -LiteralPath '${shellFile}'
$p=Start-Process -FilePath '${node}' -ArgumentList '${desc}' -NoNewWindow -PassThru
Write-Output 'BOUNDED_PTY_READY'
${mode === "natural" ? "Start-Sleep -Milliseconds 500\nexit 7" : "Start-Sleep -Seconds 20\nexit 8"}
`);
  let guardian, child;
  const spawn = createWindowsPty({ guardianPath: helper, spawnGuardian: (...args) => guardian = nativeSpawn(...args) }), workspaceFiles = { roots: () => ({ roots: [{ id: "fixture", path: dir, available: true }] }), resolve: () => ({ root: { id: "fixture", path: dir }, resolved: dir, relative: "" }) };
  const Store = legacy?.TerminalStore || TerminalStore, store = new Store(dir, { workspaceFiles, spawnPty: legacy ? void 0 : async (...args) => child = await spawn(...args) });
  let exited = 0;
  store.on("event", (e) => {
    if (e.type === "exit") exited++;
  });
  const p = store.profiles();
  store.saveProfiles([{ ...p.profiles[0], command: `& '${ps}'; exit $LASTEXITCODE`, workingDirectory: dir }], p.revision);
  const s = await store.create({ rootId: "fixture" });
  await until(() => fs.existsSync(pidfile) && store.snapshot(s.id).data.includes("BOUNDED_PTY_READY"), "ready");
  const shellPid = Number(fs.readFileSync(shellFile, "utf8").replace(/^\uFEFF/, "")), descPid = JSON.parse(fs.readFileSync(pidfile)).pid, shell = identity(shellPid, true), descendant = identity(descPid, true);
  emit("ready", { mode, legacy: !!legacy, shell: shell.record, descendant: descendant.record, guardianPid: guardian?.pid });
  try {
    if (crashGuardian) {
      guardian.kill();
      await child.closed;
    } else if (mode === "natural") {
      await until(() => store.snapshot(s.id).session.status === "exited", "natural exit");
      assert.equal(store.snapshot(s.id).session.exitCode, 7);
    } else {
      await store.close(s.id);
      await store.close(s.id).catch((e) => {
        assert.match(e.message, /no longer available/);
      });
    }
    emit("exit", { mode, exited, shellAlive: shell.alive(), descendantAlive: descendant.alive() });
    await sleep(250);
    if (legacy) {
      await sleep(6500);
    }
    assert.equal(shell.alive(), false, "root process handle must be signalled");
    assert.equal(descendant.alive(), false, "descendant must die before its unchanged12s self-exit deadline");
    assert.equal(exited, 1, "exit emitted once, after owned guardian ended");
    await store.dispose();
    await store.dispose();
    assert.equal(store.sessions.size, 0);
    emit("case-pass", { mode, crashGuardian });
  } finally {
    await store.dispose();
    shell.release();
    descendant.release();
  }
}
async function ioAndHistory() {
  const dir = path.join(out, "io-history");
  fs.mkdirSync(dir);
  const starts = dir + "/starts.txt", workspaceFiles = { roots: () => ({ roots: [{ id: "fixture", path: dir, available: true }] }), resolve: () => ({ root: { id: "fixture" }, resolved: dir, relative: "" }) };
  let launches = 0;
  const store = new TerminalStore(dir, { workspaceFiles, spawnPty: async (...a) => {
    launches++;
    return spawnOwned(...a);
  } });
  const p = store.profiles();
  store.saveProfiles([{ ...p.profiles[0], command: `Add-Content -LiteralPath '${starts}' -Value 'once';$x=[Console]::ReadLine();Write-Output ('ECHO:'+$x);Write-Output 'TAIL:\xE9\u{1F642}';exit 7` }], p.revision);
  const s = await store.create({ cols: 100, rows: 30 });
  store.resize(s.id, 120, 40);
  store.write(s.id, "owned-input\r");
  await until(() => store.snapshot(s.id).session.status === "exited", "input/tail exit");
  assert.match(store.snapshot(s.id).data, /ECHO:owned-input/);
  assert.match(store.snapshot(s.id).data, /TAIL:\u00e9\u{1f642}/u);
  assert.equal(store.snapshot(s.id).session.exitCode, 7);
  await store.close(s.id);
  const resumed = await store.create({ resumeShell: true });
  await store.close(resumed.id);
  await store.dispose();
  assert.equal(fs.readFileSync(starts, "utf8").trim(), "once");
  const restored = new TerminalStore(dir, { workspaceFiles, spawnPty: () => {
    throw Error("startup replay forbidden");
  } });
  assert.ok(restored.snapshot(s.id).data.includes("TAIL:\xE9\u{1F642}"));
  assert.equal(restored.snapshot(s.id).live, false);
  await restored.dispose();
  assert.equal(launches, 2);
  emit("io-history-pass", { launches });
}
async function jobFailure() {
  const dir = path.join(out, "job-failure");
  fs.mkdirSync(dir);
  const sentinel = dir + "/SENTINEL.txt";
  const spawn = createWindowsPty({ guardianPath: failureHelper, guardianArguments: ["--test-invalid-job-info"] });
  await assert.rejects(spawn("C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe", ["-NoLogo", "-EncodedCommand", Buffer.from(`Set-Content -LiteralPath '${sentinel}' -Value 'BAD'`, "utf16le").toString("base64")], { cwd: dir, env: process.env, cols: 80, rows: 24 }), /job-setup-failed/);
  assert.equal(fs.existsSync(sentinel), false);
  emit("job-failure-pass", { sentinelAbsent: true });
}
async function ownerDisconnect() {
  const dir = path.join(out, "owner-disconnect");
  fs.mkdirSync(dir);
  const fdOut = fs.openSync(dir + "/stdout.log", "w"), fdErr = fs.openSync(dir + "/stderr.log", "w");
  const owner = nativeSpawn(process.execPath, [fileURLToPath(new URL("./windows-terminal-owner-fixture.mjs", import.meta.url)), dir, helper, process.env.PROTEUS_TEST_NODE], { env: { ...process.env, ELECTRON_RUN_AS_NODE: "1" }, windowsHide: true, stdio: ["ignore", fdOut, fdErr] });
  await until(() => fs.existsSync(dir + "/owner-ready.json"), "owner ready");
  const ids = JSON.parse(fs.readFileSync(dir + "/owner-ready.json")), held = [ids.guardianPid, ids.shellPid, ids.descendantPid].map((pid) => identity(pid, true));
  try {
    owner.kill();
    await new Promise((r) => owner.once("close", r));
    await until(() => held.every((h) => !h.alive()), "owner pipe-disconnect tree death", 1e3);
    emit("owner-disconnect-pass", { ids, allDead: true });
  } finally {
    held.forEach((h) => h.release());
    fs.closeSync(fdOut);
    fs.closeSync(fdErr);
  }
}
async function defaultIntegration() {
  const dir = path.join(out, "default-integration-" + ++serial);
  fs.mkdirSync(dir);
  const workspaceFiles = new WorkspaceFiles(() => ({ workspaces: [{ id: "fixture", name: "Disposable", cwd: dir, additionalDirectories: [] }], libraryFolders: [] }));
  const store = new TerminalStore(dir, { workspaceFiles });
  try {
    const p = store.profiles();
    store.saveProfiles([{ ...p.profiles[0], command: "Write-Output 'DEFAULT_GUARDIAN_PATH';exit 7" }], p.revision);
    const session = await store.create({ rootId: workspaceFiles.roots().roots[0].id });
    await until(() => store.snapshot(session.id).session.status === "exited", "default guardian integration");
    assert.equal(store.snapshot(session.id).session.exitCode, 7);
    assert.match(store.snapshot(session.id).data, /DEFAULT_GUARDIAN_PATH/);
    assert.equal(store.sessions.get(session.id).child.ownsProcessTree, true);
    emit("default-integration-pass");
  } finally {
    await store.dispose();
  }
}
let warmedHandles, warmedResources;
for (const [name, fn] of legacyRoot ? [["natural", () => terminalCase("natural")], ["explicit", () => terminalCase("explicit")]] : [["warmup", () => terminalCase("explicit")], ["natural", () => terminalCase("natural")], ["explicit", () => terminalCase("explicit")], ["guardian-crash", () => terminalCase("explicit", { crashGuardian: true })], ["owner-disconnect", ownerDisconnect], ["default-integration", defaultIntegration], ["default-repeat", defaultIntegration], ["io/history", ioAndHistory], ["job-failure", jobFailure]]) {
  try {
    emit("count-before", { name, handles: handleCount() });
    await fn();
    await sleep(25);
    emit("count-after", { name, handles: handleCount(), resources: process.getActiveResourcesInfo() });
    if (name === "warmup") {
      await sleep(250);
      warmedHandles = handleCount();
      warmedResources = process.getActiveResourcesInfo();
      emit("baseline-counts", { handles: warmedHandles, resources: warmedResources });
    }
  } catch (error) {
    failures++;
    emit("FAIL", { name, message: error.message, stack: error.stack });
  }
}
await sleep(250);
if (warmedHandles !== void 0) {
  const final = handleCount();
  emit("final-counts", { baseline: warmedHandles, final, resources: process.getActiveResourcesInfo() });
  if (final !== warmedHandles) {
    failures++;
    emit("FAIL", { name: "handle-count-baseline", message: "Handle count did not return to warmed baseline" });
  }
}
emit("summary", { failures, handles: handleCount(), activeResources: process.getActiveResourcesInfo() });
process.exitCode = failures ? 1 : 0;
