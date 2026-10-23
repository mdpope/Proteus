// Claude result.usage is the complete turn aggregate. Do not also add assistant/stream usage.
const count=value=>Number.isFinite(value)&&value>=0?value:null;
export function accumulateClaudeUsage(previous={},raw={}) {
  const uncached=count(raw.input_tokens),read=count(raw.cache_read_input_tokens),created=count(raw.cache_creation_input_tokens),output=count(raw.output_tokens);
  const inputFields=[uncached,read,created],hasInput=inputFields.some(value=>value!==null);
  const previousComplete=!previous.observed||previous.inputAccounting==='claude-total-v1'&&previous.inputComplete!==false;
  const result={...previous,observed:previous.observed===true||hasInput||output!==null,inputAccounting:'claude-total-v1',inputComplete:previousComplete&&uncached!==null};
  if(hasInput)result.inputTokens=(count(previous.inputTokens)||0)+inputFields.reduce((sum,value)=>sum+(value||0),0);
  if(output!==null)result.outputTokens=(count(previous.outputTokens)||0)+output;
  for(const [field,value] of [['uncachedInputTokens',uncached],['cacheReadInputTokens',read],['cacheCreationInputTokens',created]])if(value!==null)result[field]=(count(previous[field])||0)+value;
  return result;
}
