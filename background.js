const state = {
  currentTabId: 0,
  previousTabId: 0,
  loglevel: !('update_url' in chrome.runtime.getManifest()) ? 'debug' : null
};

const RELOAD_TRIGGER_HOSTNAME = 'reload.extensions';

async function reloadExtensions() {
  try {
    const extensions = await chrome.management.getAll();

    for (const ext of extensions) {
      if (ext.installType === 'development' && ext.enabled && ext.name !== 'Extensions Reloader') {
        const extensionId = ext.id;
        await chrome.management.setEnabled(extensionId, false);
        await chrome.management.setEnabled(extensionId, true);

        if (ext.type === 'packaged_app') {
          chrome.management.launchApp(extensionId);
        }

        console.log(`${ext.name} reloaded`);
      }
    }

    // Reload the current tab based on stored settings
    chrome.storage.sync.get('reloadPage', async (item) => {
      if (!item.reloadPage) return;

      const tab = await getCurrentTab();
      if (tab && new URL(tab.url).hostname !== RELOAD_TRIGGER_HOSTNAME) {
        chrome.tabs.reload(state.currentTabId);
      }
    });

    // Show an "OK" badge
    chrome.action.setBadgeText({ text: 'OK' });
    chrome.action.setBadgeBackgroundColor({ color: '#4cb749' });
    setTimeout(() => chrome.action.setBadgeText({ text: '' }), 1000);

  } catch (error) {
    console.error('Error reloading extensions:', error);
  }
}

chrome.windows.onFocusChanged.addListener(refreshState);
chrome.tabs.onActivated.addListener(({ tabId }) => setCurrentTab(tabId));

async function getCurrentTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs.length ? tabs[0] : null;
}

async function getCurrentTabId() {
  const tab = await getCurrentTab();
  return tab ? tab.id : 0;
}

function setCurrentTab(id) {
  if (state.currentTabId === id) return;
  
  state.previousTabId = state.currentTabId;
  state.currentTabId = id;

  log('Previous Tab:', state.previousTabId, 'Current Tab:', state.currentTabId);
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'reload') {
    reloadExtensions();
  }
});

chrome.action.onClicked.addListener(() => {
  reloadExtensions();
});

async function refreshState() {
  const tabId = await getCurrentTabId();
  setCurrentTab(tabId);
}

function log(...args) {
  if (state.loglevel === 'debug') {
    console.log(...args);
  }
}

refreshState();
