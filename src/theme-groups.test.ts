import test from 'node:test';
import assert from 'node:assert/strict';
import { payloadToNodes as emeraldNodes } from './emerald/data-adapter';
import { payloadToNodes as luminaNodes, publicConfig } from './lumina/data-adapter';
import { toNezhaData, toNezhaGroups } from './nezhadash/adapter';

test('transplanted themes keep country flags without inventing geographic groups', () => {
 const payload={enabled:true,servers:[{online:true,region:'HK',region_country:'HK'},{online:true,region:'US',region_country:'US'}]};
 for(const convert of [emeraldNodes,luminaNodes]) {
  const nodes=convert(payload);
  assert.deepEqual(nodes.map(node=>node.group),['','']);
  assert.deepEqual(nodes.map(node=>node.region),['HK','US']);
 }
 assert.deepEqual(toNezhaGroups(payload).data,[]);
 assert.deepEqual(toNezhaData(payload).servers.map(node=>node.country_code),['HK','US']);
 assert.equal(publicConfig(payload).theme_settings.showGroupTabs,false);
 assert.equal(publicConfig(payload).theme_settings.showCardGroup,false);
});
