import test from 'node:test';
import assert from 'node:assert/strict';
import {accumulateClaudeUsage} from '../src/claude-usage.js';
test('Claude aggregates uncached and cached input exactly once per completed result',()=>{
 const first=accumulateClaudeUsage({}, {input_tokens:44,cache_read_input_tokens:1000,cache_creation_input_tokens:600,output_tokens:30});
 assert.equal(first.inputTokens,1644);assert.equal(first.outputTokens,30);assert.equal(first.inputComplete,true);
 const next=accumulateClaudeUsage(JSON.parse(JSON.stringify(first)),{input_tokens:20,cache_read_input_tokens:900,cache_creation_input_tokens:0,output_tokens:50});
 assert.equal(next.inputTokens,2564);assert.equal(next.outputTokens,80);assert.equal(next.cacheReadInputTokens,1900);assert.equal(next.uncachedInputTokens,64);
});
test('Claude never backfills ambiguous historical aggregates or manufactures absent usage',()=>{
 const mixed=accumulateClaudeUsage({observed:true,inputTokens:44,outputTokens:100},{input_tokens:2,cache_read_input_tokens:400,output_tokens:8});
 assert.equal(mixed.inputTokens,446);assert.equal(mixed.inputComplete,false);
 const missing=accumulateClaudeUsage({},{});assert.equal(missing.observed,false);assert.equal(missing.inputTokens,undefined);assert.equal(missing.outputTokens,undefined);
});
