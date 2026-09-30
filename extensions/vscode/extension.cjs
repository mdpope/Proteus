const vscode = require('vscode');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
exports.activate = context => {
  context.subscriptions.push(vscode.commands.registerCommand('proteus.startChat', async () => {
    try {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length || folders.some(f => f.uri.scheme !== 'file')) throw new Error('Open a local workspace first. Remote workspaces need a remote Proteus runner.');
      const prompt = await vscode.window.showInputBox({ prompt: 'What should Proteus work on in this workspace?' });
      if (!prompt) return;
      const config = vscode.workspace.getConfiguration('proteus');
      const home = config.get('dataDirectory') || path.join(os.homedir(), 'Library', 'Application Support', 'Proteus');
      const connection = JSON.parse(await fs.readFile(path.join(home, 'connection.json'), 'utf8'));
      const origin = new URL(connection.origin); if (origin.hostname !== '127.0.0.1' || origin.protocol !== 'http:') throw new Error('Proteus connection must point to the local runner.');
      const response = await fetch(new URL('/api/chat', origin), {
        method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${connection.token}` },
        body: JSON.stringify({ name: vscode.workspace.name || 'Workspace chat', prompt, provider:'copilot', model:config.get('model'), workspace:{ cwd:folders[0].uri.fsPath, additionalDirectories:folders.slice(1).map(f=>f.uri.fsPath) } })
      });
      const run = await response.json(); if (!response.ok) throw new Error(run.error);
      await vscode.window.showInformationMessage(`Proteus started ${run.title}. Open its Run history to continue.`);
    } catch (error) { vscode.window.showErrorMessage(`Proteus: ${error.message}. Make sure the desktop app is running.`); }
  }));
};
