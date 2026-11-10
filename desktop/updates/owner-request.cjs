// This module categorizes failures without exporting connection credentials,
// endpoint URLs, response bodies or arbitrary runtime error strings.
const fs = require('node:fs'), path = require('node:path');
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const failure = (reason, message = 'Updated owner request failed.') => Object.assign(Error(message), {recoveryFailure: reason});
async function ownerRequest(job, route, body, {readConnection = home => JSON.parse(fs.readFileSync(path.join(home, 'connection.json'), 'utf8')), fetch: request = globalThis.fetch, isAlive = alive, timeout = 10000} = {}) {
  let connection, url;
  try { connection = readConnection(job.home); } catch (error) { throw failure(error.code === 'ENOENT' ? 'owner-connection-missing' : 'owner-connection-invalid'); }
  try { url = new URL(connection.origin); } catch { throw failure('owner-connection-invalid'); }
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/' || url.username || url.password || !Number.isSafeInteger(connection.pid) || connection.pid < 1 || typeof connection.token !== 'string' || !connection.token) throw failure('owner-connection-invalid');
  if (!isAlive(connection.pid)) throw failure('owner-process-unavailable');
  let response;
  try { response = await request(url.origin + route, {method: body ? 'POST' : 'GET', headers: {Authorization: 'Bearer ' + connection.token, 'Content-Type': 'application/json'}, ...(body ? {body: JSON.stringify(body)} : {}), signal: AbortSignal.timeout(timeout)}); }
  catch (error) { throw failure(['TimeoutError', 'AbortError'].includes(error.name) ? 'owner-request-timeout' : 'owner-transport-failed'); }
  let result;
  try { result = await response.json(); } catch { throw failure('owner-response-invalid'); }
  if (!response.ok) throw failure(Number.isInteger(response.status) && response.status >= 400 && response.status <= 599 ? 'owner-http-' + response.status : 'owner-http-error', typeof result?.error === 'string' ? result.error : undefined);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw failure('owner-response-invalid');
  return result;
}
module.exports = {ownerRequest};
