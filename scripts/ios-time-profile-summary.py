#!/usr/bin/env python3
"""Summarize an exported Instruments trace of the iOS app's main thread.

Usage:
  ios-time-profile-summary.py TRACE.trace            # hangs + top app frames on the main thread
  ios-time-profile-summary.py TRACE.trace --callers SYMBOL   # who calls SYMBOL on the main thread

Reads the trace with `xcrun xctrace export` (set DEVELOPER_DIR if Xcode is not selected).
Only symbol names and sample counts are printed; no app data is read from the trace.
See docs/2026-10-29-ios-main-thread-profiling.md.
"""
import collections, os, subprocess, sys, tempfile, xml.etree.ElementTree as ET

def export(trace, schema, directory):
    path = os.path.join(directory, schema + '.xml')
    with open(path, 'wb') as out:
        subprocess.run(['xcrun', 'xctrace', 'export', '--input', trace, '--xpath',
                        f'/trace-toc/run[@number="1"]/data/table[@schema="{schema}"]'],
                       stdout=out, stderr=subprocess.DEVNULL, check=True)
    return path

def rows(path):
    """Yield (row, resolve) pairs; xctrace XML de-duplicates repeated nodes with id/ref."""
    ids = {}
    resolve = lambda e: ids[e.attrib['ref']] if 'ref' in e.attrib else e
    for _, e in ET.iterparse(path, events=('end',)):
        if 'id' in e.attrib: ids[e.attrib['id']] = e
        if e.tag == 'row': yield e, resolve

def main_thread_frames(path):
    for row, resolve in rows(path):
        thread = row.find('thread')
        if thread is None or 'Main Thread' not in (resolve(thread).attrib.get('fmt') or ''): continue
        backtrace = row.find('backtrace') or row.find('tagged-backtrace')
        if backtrace is None: continue
        frames = []
        for frame in resolve(backtrace).iter('frame'):
            frame = resolve(frame); binary = frame.find('binary')
            frames.append(((resolve(binary).attrib.get('name', '') if binary is not None else ''), frame.attrib.get('name', '?')))
        yield frames

def hangs(path):
    found = []
    for row, resolve in rows(path):
        cells = [resolve(c).attrib.get('fmt') or (resolve(c).text or '') for c in list(row)[:3]]
        found.append(cells)
    return found

def summary(directory, trace):
    print('Potential hangs (start | duration | kind):')
    found = hangs(export(trace, 'potential-hangs', directory))
    for cells in found: print('  ' + ' | '.join(cells))
    print(f'  total {len(found)}')
    inclusive, deepest, total = collections.Counter(), collections.Counter(), 0
    for frames in main_thread_frames(export(trace, 'time-profile', directory)):
        total += 1; seen = set(); first = None
        for binary, name in frames:
            if not binary.startswith('Proteus'): continue
            if name not in seen: inclusive[name] += 1; seen.add(name)
            if first is None: first = name
        if first: deepest[first] += 1
    noise = ('ProteusApp.$main', 'entry_point', 'partial apply', 'protocol witness')
    print(f'\nMain-thread samples: {total} (most are the idle run loop under ProteusApp.$main)')
    print('Top app frames, inclusive:')
    for name, count in [item for item in inclusive.most_common(200) if not any(n in item[0] for n in noise)][:35]: print(f'  {count:6d} {name[:150]}')
    print('Deepest app frame (where app code itself spends time):')
    for name, count in [item for item in deepest.most_common(60) if not any(n in item[0] for n in noise)][:20]: print(f'  {count:6d} {name[:150]}')

def callers(directory, trace, target):
    counts = collections.Counter()
    skip = ('partial apply', 'thunk', 'closure', 'implicit')
    for frames in main_thread_frames(export(trace, 'time-profile', directory)):
        names = [name for _, name in frames]
        for index, name in enumerate(names):
            if target in name:
                chain = [n for n in names[index + 1:index + 10] if not n.startswith(skip)][:3]
                counts[' <- '.join(chain)] += 1; break
    for chain, count in counts.most_common(12): print(f'{count:6d} {chain[:220]}')

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(__doc__)
    with tempfile.TemporaryDirectory() as directory:
        if len(sys.argv) >= 4 and sys.argv[2] == '--callers': callers(directory, sys.argv[1], sys.argv[3])
        else: summary(directory, sys.argv[1])
