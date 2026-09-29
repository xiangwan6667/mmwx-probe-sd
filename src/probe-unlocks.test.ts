import assert from 'node:assert/strict';
import test from 'node:test';
import { serverUnlocks, unlockSections } from './probe-unlocks';
import { groupUnlocks, isUnlocked, unlockStatusText } from './unlock-services';

test('unlock results stay associated with API IDs even with duplicate names', () => {
 const first={service:'netflix',status:'yes',region:'HK'};
 const second={service:'openai',status:'no'};
 const payload={enabled:true,servers:[{name:'same',online:true,unlocks:[first]},{name:'same',online:true,unlocks:[second]}]};
 assert.deepEqual(serverUnlocks(payload,0),[first]);
 assert.deepEqual(serverUnlocks(payload,'1'),[second]);
 for(const id of ['same','-1','01','2']) assert.deepEqual(serverUnlocks(payload,id),[]);
 assert.deepEqual(serverUnlocks({...payload,enabled:false},0),[]);
 assert.deepEqual(serverUnlocks(undefined,0),[]);
});
test('official unlock categories and partial results preserve meaning', () => {
 const results=[{service:'openai',status:'no'},{service:'netflix',status:'originals_only',region:'US'},{service:'apple',status:'yes',region:'HK'}];
 assert.equal(groupUnlocks(results).streaming[0].service,'netflix');
 assert.equal(groupUnlocks(results).ai[0].service,'openai');
 assert.equal(results.filter(result=>isUnlocked(result.status)).length,2);
 assert.equal(unlockStatusText(results[1],true),'仅自制剧 · US');
 assert.equal(unlockStatusText(results[2],true),'HK');
 const sections=unlockSections(results);
 assert.deepEqual(sections.map(section=>[section.zh,section.count,section.rows.length]),[['流媒体',1,1],['AI',0,1],['其他',1,1]]);
 assert.equal(sections[0].rows[0].tone,'partial');
 assert.equal(sections[2].rows[0].tone,'info');
});
