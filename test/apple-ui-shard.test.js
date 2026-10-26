import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { discoverRemoteUITests, selectAppleUIShard, appleUITestFamilies, selectAppleUISimulator } from './apple-ui-shard.mjs';

test('Swift UI inventory ignores fixture strings, comments and nested helper declarations', () => {
  const source = `import XCTest
final class RemoteUITests: XCTestCase {
  // func testComment() {}
  /* func testBlock() {} /* nested */ */
  let fixture = """
  func testMultiline() { }
  """
  let raw = #"func testRaw() { }"#
  let text = "escaped \\" func testString() { }"
  @MainActor func testBravo() throws { func testNested() {} }
  @MainActor func testAlpha() async throws { }
}
extension RemoteUITests { @MainActor func testCharlie() {} }
`;
  assert.deepEqual(discoverRemoteUITests(source), ['testAlpha', 'testBravo', 'testCharlie']);
  assert.throws(() => discoverRemoteUITests(source + '\nclass AnotherTests: XCTestCase {}'), /classes changed/);
  assert.throws(() => discoverRemoteUITests(source.replace('testCharlie', 'testAlpha')), /unique/);
});

test('phone shards and the tablet suite cover every actual Swift test exactly once', () => {
  const source = fs.readdirSync(new URL('../ios/ProteusUITests/', import.meta.url)).filter(name => name.endsWith('.swift')).sort().map(name => fs.readFileSync(new URL('../ios/ProteusUITests/' + name, import.meta.url), 'utf8')).join('\n');
  const inventory = discoverRemoteUITests(source), families = appleUITestFamilies(inventory), shards = [1, 2, 3].map(shard => selectAppleUIShard(families.phone, shard, 3));
  const tablet = selectAppleUIShard(families.tablet, 1, 1), selected = [...shards.flat(), ...tablet];
  const declared = [...source.matchAll(/^\s*(?:@MainActor\s+)?func\s+(test\w*)\s*\(/gm)].map(match => match[1]).sort();
  assert.deepEqual(inventory, declared, 'Every current Swift test declaration must appear in the parsed inventory');
  assert.ok(inventory.includes('testActualSimulatorLocalNotificationTapRoutesThroughSpringBoard'), 'The real notification test must remain in the UI inventory');
  assert.ok(shards.every(shard => shard.length > 0));
  assert.deepEqual(selected.sort(), inventory);
  assert.equal(new Set(selected).size, inventory.length);
  for (const name of ['testIPadMainAndTeamBrowserTabsRestoreSeparately', 'testIPadMainTabStripKeepsExactScrollPositionAcrossTabAndSidebarSelection', 'testIPadNotificationTapOpensHostContentTabsAndColdSchedule', 'testIPadSidebarHeadingAndNewTabsReveal', 'testTabletUsesOnlyTopChatActions', 'testTabletQuestionQueueChoicesAndCustomAnswerUseOwnerSession']) assert.ok(tablet.includes(name), 'Known tablet workflows require an iPad: ' + name);
  assert.ok(tablet.every(name => /^test(?:IPad|Tablet)/.test(name)));
  assert.ok(shards.flat().every(name => !tablet.includes(name)));
  assert.ok(Math.max(...shards.map(shard => shard.length)) - Math.min(...shards.map(shard => shard.length)) <= 1);
  assert.deepEqual(selectAppleUIShard([...families.phone].reverse(), 1, 3), shards[0], 'Source declaration order cannot change shard ownership');
  for (const [shard, total] of [[0, 3], [4, 3], [1, 0], [1.5, 3], [1, inventory.length + 1]]) assert.throws(() => selectAppleUIShard(inventory, shard, total));
});

test('simulator selection uses available iOS hardware of the requested family and never substitutes a phone for a tablet', () => {
  const phone = { name: 'Renamed iPad', udid: '11111111-1111-4111-8111-111111111111', isAvailable: true, deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro', state: 'Shutdown' };
  const tablet = { name: 'iPad Air', udid: '22222222-2222-4222-8222-222222222222', isAvailable: true, deviceTypeIdentifier: 'com.apple.CoreSimulator.SimDeviceType.iPad-Air-13-inch-M3', state: 'Shutdown' };
  const inventory = { devices: { 'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [phone, tablet, { ...tablet, udid: '33333333-3333-4333-8333-333333333333', isAvailable: false }], 'com.apple.CoreSimulator.SimRuntime.tvOS-26-0': [{ ...tablet, state: 'Booted' }] } };
  assert.equal(selectAppleUISimulator(inventory, 'phone').udid, phone.udid);
  assert.equal(selectAppleUISimulator(inventory, 'tablet').udid, tablet.udid);
  assert.throws(() => selectAppleUISimulator({ devices: { 'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [phone] } }, 'tablet'), /No available iPad/);
  assert.throws(() => selectAppleUISimulator(inventory, 'unknown'), /Choose phone or tablet/);
});
