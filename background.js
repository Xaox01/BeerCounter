// Sprawdza czy już pytano dzisiaj
chrome.runtime.onStartup.addListener(() => {
  checkAndAsk();
});

chrome.runtime.onInstalled.addListener(() => {
  // Ustaw domyślne ustawienia
  chrome.storage.local.get(['settings'], (result) => {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          beerPrice: 8,
          beerCalories: 150,
          beerMl: 500,
          weeklyLimit: 14,
          dailyLimit: 4,
          alertsEnabled: true
        }
      });
    }
  });
  checkAndAsk();
});

function checkAndAsk() {
  const today = new Date().toISOString().split('T')[0];
  
  chrome.storage.local.get(["lastAskedDate"], (result) => {
    if (result.lastAskedDate !== today) {
      chrome.windows.create({
        url: chrome.runtime.getURL("ask.html"),
        type: "popup",
        width: 420,
        height: 580,
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
  
  if (request.action === "getSettings") {
    chrome.storage.local.get(["settings"], (result) => {
      sendResponse(result.settings || {
        beerPrice: 8,
        beerCalories: 150,
        beerMl: 500,
        weeklyLimit: 14,
        dailyLimit: 4,
        alertsEnabled: true
      });
    });
    return true;
  }
  
  if (request.action === "saveSettings") {
    chrome.storage.local.set({ settings: request.settings }, () => {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === "addBeers") {
    const today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(["beerHistory", "settings"], (result) => {
      const history = result.beerHistory || {};
      const settings = result.settings || {};
      
      history[today] = (history[today] || 0) + request.count;
      
      chrome.storage.local.set({ beerHistory: history }, () => {
        // Sprawdź limity
        if (settings.alertsEnabled && history[today] >= settings.dailyLimit) {
          chrome.notifications?.create({
            type: 'basic',
            iconUrl: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"><text y="64" font-size="64">🍺</text></svg>',
            title: '⚠️ Limit dzienny!',
            message: `Osiągnąłeś ${settings.dailyLimit} piw na dziś!`
          });
        }
        
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