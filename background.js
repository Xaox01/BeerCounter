// Sprawdza czy już pytano dzisiaj
chrome.runtime.onStartup.addListener(() => {
  checkAndAsk();
});

chrome.runtime.onInstalled.addListener(() => {
  checkAndAsk();
});

function checkAndAsk() {
  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.local.get(["lastAskedDate"], (result) => {
    // Jeśli jeszcze nie pytano dzisiaj - pokaż okno
    if (result.lastAskedDate !== today) {
      chrome.windows.create({
        url: chrome.runtime.getURL("ask.html"),
        type: "popup",
        width: 420,
        height: 550,
        focused: true
      });
    }
  });
}

// Obsługa wiadomości
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  
  if (request.action === "getBeerData") {
    chrome.storage.local.get(["beerHistory"], (result) => {
      sendResponse(result.beerHistory || {});
    });
    return true;
  }
  
  if (request.action === "addBeers") {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(["beerHistory"], (result) => {
      const history = result.beerHistory || {};
      history[today] = (history[today] || 0) + request.count;
      chrome.storage.local.set({ beerHistory: history }, () => {
        sendResponse({ success: true, todayTotal: history[today] });
      });
    });
    return true;
  }
  
  if (request.action === "setBeersForDate") {
    chrome.storage.local.get(["beerHistory"], (result) => {
      const history = result.beerHistory || {};
      history[request.date] = request.count;
      chrome.storage.local.set({ beerHistory: history }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === "markAskedToday") {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.set({ lastAskedDate: today }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === "resetToday") {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(["beerHistory"], (result) => {
      const history = result.beerHistory || {};
      history[today] = 0;
      chrome.storage.local.set({ beerHistory: history }, () => {
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === "clearAllData") {
    chrome.storage.local.clear(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});