#!/usr/bin/env python3
"""Weighted main-thread symbols from a single-target xctrace time-profile XML.

Self means the leaf frame, not the deepest app frame. Inclusive stacks are
deduplicated per sample. Output is statistical sampled time, not wall latency.
"""
import collections
import json
import pathlib
import sys
import xml.etree.ElementTree as ET

ids = {}
self_time = collections.Counter()
inclusive = collections.Counter()
app_inclusive = collections.Counter()
samples = 0
for _, element in ET.iterparse(sys.argv[1], events=('end',)):
    if 'id' in element.attrib:
        ids[element.attrib['id']] = element
    if element.tag != 'row':
        continue
    def resolve(node):
        return ids[node.attrib['ref']] if 'ref' in node.attrib else node
    thread = element.find('thread')
    if thread is None or 'Main Thread' not in resolve(thread).attrib.get('fmt', ''):
        continue
    stack = element.find('backtrace')
    if stack is None:
        stack = element.find('tagged-backtrace')
    weight = element.find('weight')
    if stack is None or weight is None:
        continue
    milliseconds = float(resolve(weight).text) / 1e6
    frames = [resolve(frame) for frame in resolve(stack).iter('frame')]
    if not frames:
        continue
    samples += 1
    self_time[frames[0].attrib.get('name', '?')] += milliseconds
    for name in set(frame.attrib.get('name', '?') for frame in frames):
        inclusive[name] += milliseconds
    for name in set(frame.attrib.get('name', '?') for frame in frames if frame.find('binary') is not None and resolve(frame.find('binary')).attrib.get('name', '').startswith('Proteus')):
        app_inclusive[name] += milliseconds

print(json.dumps({'main_samples': samples, 'sampled_ms': sum(self_time.values()),
                  'self_ms': self_time.most_common(20),
                  'inclusive_ms': inclusive.most_common(20),
                  'app_inclusive_ms': app_inclusive.most_common(30)}, indent=2))
