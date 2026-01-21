chrome.runtime.onStartup.addListener(function() {
  updateBadge();
});

chrome.runtime.onInstalled.addListener(function() {
  chrome.storage.local.get(['settings'], function(result) {
    if (!result.settings) {
      chrome.storage.local.set({
        settings: {
          beerPrice: 8,
          beerCalories: 150,
          beerMl: 500,
          weeklyLimit: 14,
          dailyLimit: 4,
          weeklyGoal: 10,
          weight: 80,
          gender: 'M',
          alertsEnabled: true
        }
      });
    }
  });
  
  chrome.storage.local.get(['achievements'], function(result) {
    if (!result.achievements) {
      chrome.storage.local.set({
        achievements: {
          firstBeer: false,
          soberWeek: false,
          moderation: false,
          streak30: false,
          century: false
        }
      });
    }
  });
  
  updateBadge();
});

function updateBadge() {
  var today = new Date().toISOString().split('T')[0];
  
  chrome.storage.local.get(["beerHistory"], function(result) {
    var history = result.beerHistory || {};
    var todayCount = history[today] || 0;
    
    if (todayCount > 0) {
      chrome.action.setBadgeText({ text: todayCount.toString() });
      chrome.action.setBadgeBackgroundColor({ color: todayCount > 4 ? '#ef4444' : '#ffa500' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  });
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  
  if (request.action === "getBeerData") {
    chrome.storage.local.get(["beerHistory"], function(result) {
      sendResponse(result.beerHistory || {});
    });
    return true;
  }
  
  if (request.action === "getSettings") {
    chrome.storage.local.get(["settings"], function(result) {
      sendResponse(result.settings || {
        beerPrice: 8,
        beerCalories: 150,
        beerMl: 500,
        weeklyLimit: 14,
        dailyLimit: 4,
        weeklyGoal: 10,
        weight: 80,
        gender: 'M',
        alertsEnabled: true
      });
    });
    return true;
  }
  
  if (request.action === "getAchievements") {
    chrome.storage.local.get(["achievements"], function(result) {
      sendResponse(result.achievements || {
        firstBeer: false,
        soberWeek: false,
        moderation: false,
        streak30: false,
        century: false
      });
    });
    return true;
  }
  
  if (request.action === "saveSettings") {
    chrome.storage.local.set({ settings: request.settings }, function() {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === "saveAchievements") {
    chrome.storage.local.set({ achievements: request.achievements }, function() {
      sendResponse({ success: true });
    });
    return true;
  }
  
  if (request.action === "addBeers") {
    var today = new Date().toISOString().split('T')[0];
    chrome.storage.local.get(["beerHistory"], function(result) {
      var history = result.beerHistory || {};
      history[today] = (history[today] || 0) + request.count;
      chrome.storage.local.set({ beerHistory: history }, function() {
        updateBadge();
        sendResponse({ success: true, todayTotal: history[today] });
      });
    });
    return true;
  }
  
  if (request.action === "setBeersForDate") {
    chrome.storage.local.get(["beerHistory"], function(result) {
      var history = result.beerHistory || {};
      history[request.date] = request.count;
      chrome.storage.local.set({ beerHistory: history }, function() {
        updateBadge();
        sendResponse({ success: true });
      });
    });
    return true;
  }
  
  if (request.action === "updateBadge") {
    updateBadge();
    sendResponse({ success: true });
    return true;
  }
  
  if (request.action === "clearAllData") {
    chrome.storage.local.clear(function() {
      updateBadge();
      sendResponse({ success: true });
    });
    return true;
  }
});