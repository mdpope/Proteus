#!/usr/bin/env python3
"""Read only native console/lock flags; never infer a lock from missing evidence."""
import ctypes
import json
import sys


def classify_session(flags):
    if not flags.get("available"):
        return "unavailable"
    if flags.get("CGSSessionScreenIsLocked") is True:
        return "locked"
    # CoreGraphics omits ScreenIsLocked for an unlocked interactive console.
    if flags.get("kCGSSessionOnConsoleKey") is True:
        return "unlocked"
    return "unavailable"


def read_session():
    if sys.platform != "darwin":
        return {"available": False}
    cg = ctypes.CDLL("/System/Library/Frameworks/CoreGraphics.framework/CoreGraphics")
    cf = ctypes.CDLL("/System/Library/Frameworks/CoreFoundation.framework/CoreFoundation")
    cg.CGSessionCopyCurrentDictionary.restype = ctypes.c_void_p
    cf.CFStringCreateWithCString.argtypes = [ctypes.c_void_p, ctypes.c_char_p, ctypes.c_uint32]
    cf.CFStringCreateWithCString.restype = ctypes.c_void_p
    cf.CFDictionaryGetValue.argtypes = [ctypes.c_void_p, ctypes.c_void_p]
    cf.CFDictionaryGetValue.restype = ctypes.c_void_p
    cf.CFBooleanGetValue.argtypes = [ctypes.c_void_p]
    cf.CFBooleanGetValue.restype = ctypes.c_bool
    cf.CFGetTypeID.argtypes = [ctypes.c_void_p]
    cf.CFGetTypeID.restype = ctypes.c_ulong
    cf.CFBooleanGetTypeID.restype = ctypes.c_ulong
    cf.CFRelease.argtypes = [ctypes.c_void_p]
    session = cg.CGSessionCopyCurrentDictionary()
    flags = {"available": bool(session)}
    try:
        for name in ("CGSSessionScreenIsLocked", "kCGSSessionOnConsoleKey"):
            key = cf.CFStringCreateWithCString(None, name.encode(), 0x08000100)
            try:
                value = cf.CFDictionaryGetValue(session, key) if session else None
                if value and cf.CFGetTypeID(value) == cf.CFBooleanGetTypeID():
                    flags[name] = bool(cf.CFBooleanGetValue(value))
            finally:
                cf.CFRelease(key)
    finally:
        if session:
            cf.CFRelease(session)
    return flags


if __name__ == "__main__":
    try:
        print(json.dumps({"state": classify_session(read_session())}))
    except (OSError, AttributeError):
        print(json.dumps({"state": "unavailable"}))
