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
import signal

p = argparse.ArgumentParser()
p.add_argument('--device', required=True)
p.add_argument('--bundle', required=True)
p.add_argument('--log', required=True)
p.add_argument('--output', required=True)
p.add_argument('--start-now', action='store_true', help='Capture an already-running stalled preparation; not a matched journey.')
p.add_argument('--seconds', type=int, default=600)
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
    if log.exists() and '** TEST EXECUTE FAILED **' in log.read_text():
        raise SystemExit('Journey failed before its cold-start marker; no matched capture.')
    if args.start_now or log.exists() and marker in log.read_text():
        break
    time.sleep(.2)
else:
    raise SystemExit('The requested cold-start marker was not observed.')
container = subprocess.check_output(['xcrun', 'simctl', 'get_app_container', args.device, args.bundle, 'app'], env=env, text=True).strip()
processes = subprocess.check_output(['ps', '-ax', '-o', 'pid=,command='], text=True)
matches = [row.split(None, 1)[0] for row in processes.splitlines() if row.strip().split(None, 1)[-1].startswith(container + '/Proteus')]
if len(matches) != 1:
    raise SystemExit('The exact benchmark process is unavailable or ambiguous.')
recorder = subprocess.Popen(['xcrun', 'xctrace', 'record', '--template', 'Time Profiler', '--device', args.device, '--attach', matches[0], '--time-limit', str(args.seconds) + 's', '--output', str(output)], env=env)
while recorder.poll() is None:
    progress = pathlib.Path(args.log).read_text()
    if 'JOURNEY arm=' + args.bundle + ' finished' in progress or '** TEST EXECUTE FAILED **' in progress:
        recorder.send_signal(signal.SIGINT)
        break
    time.sleep(.2)
if recorder.wait() != 0:
    raise SystemExit('Instruments did not finalize the journey recording.')
