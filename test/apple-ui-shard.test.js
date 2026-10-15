import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { discoverRemoteUITests, selectAppleUIShard } from './apple-ui-shard.mjs';

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

test('three native UI shards are disjoint and cover every actual Swift test exactly once', () => {
  const source = fs.readdirSync(new URL('../ios/ProteusUITests/', import.meta.url)).filter(name => name.endsWith('.swift')).sort().map(name => fs.readFileSync(new URL('../ios/ProteusUITests/' + name, import.meta.url), 'utf8')).join('\n');
  const inventory = discoverRemoteUITests(source), shards = [1, 2, 3].map(shard => selectAppleUIShard(inventory, shard, 3));
  const declared = [...source.matchAll(/^\s*(?:@MainActor\s+)?func\s+(test\w*)\s*\(/gm)].map(match => match[1]).sort();
  assert.deepEqual(inventory, declared, 'Every current Swift test declaration must appear in the parsed inventory');
  assert.ok(inventory.includes('testActualSimulatorLocalNotificationTapRoutesThroughSpringBoard'), 'The real notification test must remain in the UI inventory');
  assert.ok(shards.every(shard => shard.length > 0));
  assert.deepEqual(shards.flat().sort(), inventory);
  assert.equal(new Set(shards.flat()).size, inventory.length);
  assert.ok(Math.max(...shards.map(shard => shard.length)) - Math.min(...shards.map(shard => shard.length)) <= 1);
  assert.deepEqual(selectAppleUIShard([...inventory].reverse(), 1, 3), shards[0], 'Source declaration order cannot change shard ownership');
  for (const [shard, total] of [[0, 3], [4, 3], [1, 0], [1.5, 3], [1, inventory.length + 1]]) assert.throws(() => selectAppleUIShard(inventory, shard, total));
});
