import assert from 'node:assert/strict';
import test from 'node:test';
import {buildLoadTimeRangeOptions,buildPingTimeRangeOptions} from './lumina/upstream/components/instance/chartShared';
test('Lumina history uses only supported host ranges and respects retention',()=>{
 assert.deepEqual(buildLoadTimeRangeOptions(24).map(r=>r.value),[0,1,6,24]);
 assert.deepEqual(buildPingTimeRangeOptions(168).map(r=>r.value),[1,6,24,72,168]);
 assert.deepEqual(buildPingTimeRangeOptions(48).map(r=>r.value),[1,6,24,48]);
});
