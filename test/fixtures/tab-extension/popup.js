chrome.tabs.query({},tabs=>document.querySelector('output').textContent='Extension API ready: '+tabs.length+' browser tabs');
