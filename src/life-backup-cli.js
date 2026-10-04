#!/usr/bin/env node
import { LifeStore } from './life.js';
import { defaultHome } from './files.js';
const flags = new Map();
try {
    const args = process.argv.slice(2), allowed = ['--source-profile','--restore-profile','--dump','--home'];
    for (let i = 0; i < args.length; i += 2) { if (!allowed.includes(args[i]) || !args[i + 1] || flags.has(args[i])) throw new Error('Usage: node src/life-backup-cli.js --source-profile PRIVATE_JSON --restore-profile PRIVATE_JSON --dump PRIVATE_SQL [--home PROTEUS_HOME]'); flags.set(args[i], args[i + 1]); }
    if (!flags.has('--restore-profile') || !flags.has('--dump')) throw new Error('A separately restored database profile and its private SQL backup are required.');
    const store = new LifeStore(flags.get('--home') || defaultHome());
    try { const result = await store.verifyBackup({ sourceProfileFile: flags.get('--source-profile'), restoredProfileFile: flags.get('--restore-profile'), dumpFile: flags.get('--dump') }); process.stdout.write(JSON.stringify(result) + '\n'); } finally { await store.close(); }
} catch (error) { process.stderr.write((error.code ? 'Backup verification failed. Check private files and database access.' : error.message) + '\n'); process.exitCode = 1; }
