// background script

function _cs2() { if (chrome.runtime.lastError) return; chrome.tabs.executeScript(null, { file:"constants.js" }, _cs3); }
function _cs3() { if (chrome.runtime.lastError) return; chrome.tabs.executeScript(null, { file:"logger.js" }, _cs4); }
function _cs4() { if (chrome.runtime.lastError) return; chrome.tabs.executeScript(null, { file:"storage.js" }, _cs5); }
function _cs5() { if (chrome.runtime.lastError) return; chrome.tabs.executeScript(null, { file:"api.js" }, _cs6); }
function _cs6() { if (chrome.runtime.lastError) return; chrome.tabs.executeScript(null, { file:"inject.js" }); }

// handle when URL changed due to history updated
chrome.webNavigation.onHistoryStateUpdated.addListener(function(details) {
  if (chrome.runtime.lastError) return;

  if (details.url === "https://twitter.com/") {
    chrome.tabs.executeScript(null, { file:"buy.js" }, _cs2);
  }
});