import {showOpenRouterModels} from '../chats/openrouter-models.js';

export function mountOpenRouterSettings(root, status, {api, openExternal, refresh, toast}) {
  const form = document.createElement('form');
  form.innerHTML = '<p class="note">Use an API key from your OpenRouter workspace. Requests use that workspace’s credits and routing settings. The key is stored on this computer.</p><label>API key<input name="key" type="password" autocomplete="off" spellcheck="false" maxlength="246" required></label><div class="actions"><button type="submit">Save API key</button><button type="button" data-keys>Open OpenRouter API keys</button><button type="button" data-models>Browse models &amp; favorites</button><button type="button" data-disconnect>Remove saved key</button></div>';
  root.replaceChildren(form);
  const input = form.elements.key, buttons = [...form.querySelectorAll('button')];
  const browse = form.querySelector('[data-models]'), disconnect = form.querySelector('[data-disconnect]');
  const enable = ready => { for (const button of buttons) button.disabled = !ready; browse.disabled = !ready || !(status?.models?.length || status?.modelCount); disconnect.hidden = !status?.credentialConfigured; };
  enable(true);
  async function configure(action) {
    enable(false);
    const key = input.value.trim();
    input.value = '';
    try {
      await api('/api/openrouter/connection', {action, ...(action === 'connect' ? {key} : {})});
      await refresh();
    } catch (error) { toast(error.message); }
    finally { if (form.isConnected) enable(true); }
  }
  form.onsubmit = event => { event.preventDefault(); void configure('connect'); };
  disconnect.onclick = () => void configure('disconnect');
  browse.onclick = async () => {
    browse.disabled = true;
    try {
      const catalog = status.models ? status : await api('/api/provider', {provider:'openrouter',force:false});
      if (catalog.models?.length) showOpenRouterModels({models: catalog.models});
      else toast(catalog.connectionError || 'OpenRouter models are unavailable.');
    } catch (error) { toast(error.message); }
    finally { if (form.isConnected) enable(true); }
  };
  form.querySelector('[data-keys]').onclick = () => Promise.resolve(openExternal('https://openrouter.ai/settings/keys')).catch(error => toast(error.message));
}
