"""Render Proteus's geometric P mark without external imaging dependencies."""
import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def chunk(kind, value):
    return struct.pack('>I', len(value)) + kind + value + struct.pack('>I', zlib.crc32(kind + value) & 0xffffffff)

def draw(size, template=False):
    rows = []
    for y in range(size):
        row = bytearray()
        for x in range(size):
            a = (x + 0.5) * 32 / size
            b = (y + 0.5) * 32 / size
            ring = 10.3 <= math.hypot(a - 16, b - 16) <= 13.4
            stem = 11 <= a <= 14 and 9 <= b <= 24
            bowl = 13 <= a <= 22 and 9 <= b <= 18 and not (14 <= a <= 19 and 12 <= b <= 15)
            ink = ring or stem or bowl
            if template:
                row.extend([0, 0, 0, 255 if ink else 0])
            else:
                row.extend([197, 234, 154, 255] if ink else [17, 26 + int(8 * (1 - y / size)), 24, 255])
        rows.append(b'\0' + row)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', size, size, 8, 6, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(b''.join(rows))) + chunk(b'IEND', b'')

(ROOT / 'desktop/trayTemplate.png').write_bytes(draw(64, True))
icon = ROOT / 'ios/Proteus/Assets.xcassets/AppIcon.appiconset'
icon.mkdir(parents=True, exist_ok=True)
(icon / 'AppIcon.png').write_bytes(draw(1024))
(icon / 'Contents.json').write_text('{"images":[{"filename":"AppIcon.png","idiom":"universal","platform":"ios","size":"1024x1024"}],"info":{"author":"xcode","version":1}}\n')
(icon.parent / 'Contents.json').write_text('{"info":{"author":"xcode","version":1}}\n')
