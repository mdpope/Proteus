#!/bin/zsh
# Record a Time Profiler trace of a paired iOS preview app while testRealHostTour walks the
# real host's workspaces, projects and tabs, then summarize main-thread hangs and hot frames.
#
# Usage: scripts/ios-real-host-profile.sh SIMULATOR_UUID PREVIEW_BUNDLE_ID TAG [SECONDS]
#   PREVIEW_BUNDLE_ID must already be installed and paired with the real host
#   (see docs/2026-10-29-ios-main-thread-profiling.md for pairing with --pair-link).
# Output: $TMPDIR/proteus-ios-profile/TAG/{trace.trace,tour.log,summary.txt}
# The tour opens and selects existing tabs only; it sends no chat messages.
set -euo pipefail
device=$1; bundle=$2; tag=$3; seconds=${4:-75}
export DEVELOPER_DIR=${DEVELOPER_DIR:-$(xcode-select -p)}
root=${0:A:h:h}; out=${TMPDIR:-/tmp}/proteus-ios-profile/$tag
rm -rf $out; mkdir -p $out
xcrun simctl terminate $device $bundle >/dev/null 2>&1 || true
xcrun simctl launch $device $bundle --native-design-preview >/dev/null
sleep 12  # let it reconnect and receive the host's state
pid=$(xcrun simctl spawn $device launchctl list | awk -v b="UIKitApplication:$bundle" 'index($3,b)==1 {print $1}')
[[ -n $pid ]] || { echo "Preview app is not running on $device" >&2; exit 1; }
# PROTEUS_REAL_ATTACH makes the tour activate (not relaunch) the app, so the profiler stays attached.
( cd $root && TEST_RUNNER_PROTEUS_REAL_HOST_BUNDLE=$bundle TEST_RUNNER_PROTEUS_REAL_ATTACH=1 \
    node scripts/apple-build.mjs test --device $device --only ProteusUITests/RemoteUITests/testRealHostTour > $out/tour.log 2>&1 ) &
tour=$!
until grep -q "Test Case.*started" $out/tour.log 2>/dev/null; do sleep 2; done
xcrun xctrace record --template 'Time Profiler' --device $device --attach $pid --time-limit ${seconds}s --output $out/trace.trace > $out/xctrace.log 2>&1
wait $tour || true
grep "Test Case.*\(passed\|failed\)" $out/tour.log || true
python3 -I $root/scripts/ios-time-profile-summary.py $out/trace.trace | tee $out/summary.txt
echo "Trace: $out/trace.trace (open in Instruments for call trees)"
