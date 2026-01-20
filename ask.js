document.addEventListener('DOMContentLoaded', () => {
  const beerCountInput = document.getElementById('beerCount');
  const decreaseBtn = document.getElementById('decrease');
  const increaseBtn = document.getElementById('increase');
  const submitBtn = document.getElementById('submit');
  const skipBtn = document.getElementById('skipBtn');
  const dateDisplay = document.getElementById('dateDisplay');
  const quickButtons = document.querySelectorAll('.quick-btn');
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  dateDisplay.textContent = yesterday.toLocaleDateString('pl-PL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  chrome.runtime.sendMessage({ action: "getBeerData" }, (history) => {
    if (history && history[yesterdayStr] !== undefined) {
      beerCountInput.value = history[yesterdayStr];
      document.getElementById('yesterdayStats').innerHTML = 
        `<p>Wczoraj już zapisano: ${history[yesterdayStr]} 🍺</p>`;
    }
  });
  
  decreaseBtn.addEventListener('click', () => {
    const current = parseInt(beerCountInput.value) || 0;
    if (current > 0) beerCountInput.value = current - 1;
  });
  
  increaseBtn.addEventListener('click', () => {
    const current = parseInt(beerCountInput.value) || 0;
    beerCountInput.value = current + 1;
  });
  
  quickButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      beerCountInput.value = btn.dataset.count;
    });
  });
  
  submitBtn.addEventListener('click', () => {
    const count = parseInt(beerCountInput.value) || 0;
    
    chrome.runtime.sendMessage({ 
      action: "setBeersForDate", 
      date: yesterdayStr,
      count: count 
    }, () => {
      chrome.runtime.sendMessage({ action: "markAskedToday" }, () => {
        window.close();
      });
    });
  });
  
  skipBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ 
      action: "setBeersForDate", 
      date: yesterdayStr,
      count: 0 
    }, () => {
      chrome.runtime.sendMessage({ action: "markAskedToday" }, () => {
        window.close();
      });
    });
  });
});