#!/usr/bin/env python3
"""Record one isolated simulator journey after its cold-start timing marker.

Use only with a passing NativeReleaseJourney test. Cold-launch wall time is in
the XCTest log; this attached trace excludes launch and attachment latency.
"""
import argparse
import os
import pathlib
import subprocess
import time

p = argparse.ArgumentParser()
p.add_argument('--device', required=True)
p.add_argument('--bundle', required=True)
p.add_argument('--log', required=True)
p.add_argument('--output', required=True)
args = p.parse_args()
if not args.bundle.startswith('org.proteusapp.proteus.journey-'):
    p.error('Only the dedicated journey identities may be profiled.')
output = pathlib.Path(args.output).resolve()
if output.is_relative_to(pathlib.Path(__file__).resolve().parents[2]):
    p.error('Keep raw traces outside the repository.')
env = dict(os.environ)
marker = 'arm=' + args.bundle + ' step=cold-to-interactive'
deadline = time.monotonic() + 180
while time.monotonic() < deadline:
    log = pathlib.Path(args.log)
    if log.exists() and marker in log.read_text():
        break
    time.sleep(.2)
else:
    raise SystemExit('The requested cold-start marker was not observed.')
container = subprocess.check_output(['xcrun', 'simctl', 'get_app_container', args.device, args.bundle, 'app'], env=env, text=True).strip()
processes = subprocess.check_output(['ps', '-ax', '-o', 'pid=,command='], text=True)
matches = [row.split(None, 1)[0] for row in processes.splitlines() if row.strip().split(None, 1)[-1].startswith(container + '/Proteus')]
if len(matches) != 1:
    raise SystemExit('The exact benchmark process is unavailable or ambiguous.')
subprocess.run(['xcrun', 'xctrace', 'record', '--template', 'Time Profiler', '--device', args.device, '--attach', matches[0], '--time-limit', '600s', '--output', str(output)], env=env, check=True)
