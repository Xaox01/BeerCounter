var tips = [
  "💡 Picie wody między piwami zmniejsza kaca!",
  "💡 Jedno piwo to ok. 150 kalorii - jak mała pizza!",
  "💡 Wątroba regeneruje się po 2 tygodniach przerwy.",
  "💡 Alkohol odwadnia - pij wodę!",
  "💡 3 dni przerwy w tygodniu = zdrowa wątroba!",
  "💡 Piwo bezalkoholowe ma tylko 30 kcal!",
  "💡 Sen po alkoholu jest mniej regenerujący.",
  "💡 Średnio Polak pije 100L piwa rocznie!"
];

document.addEventListener('DOMContentLoaded', function() {
  var beerCountInput = document.getElementById('beerCount');
  var decreaseBtn = document.getElementById('decrease');
  var increaseBtn = document.getElementById('increase');
  var submitBtn = document.getElementById('submit');
  var skipBtn = document.getElementById('skipBtn');
  var dateDisplay = document.getElementById('dateDisplay');
  var tipBox = document.getElementById('tipBox');
  var quickButtons = document.querySelectorAll('.quick-btn');
  
  var yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().split('T')[0];
  
  dateDisplay.textContent = yesterday.toLocaleDateString('pl-PL', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Losowy tip
  tipBox.textContent = tips[Math.floor(Math.random() * tips.length)];
  
  chrome.runtime.sendMessage({ action: "getBeerData" }, function(history) {
    if (history && history[yesterdayStr] !== undefined) {
      beerCountInput.value = history[yesterdayStr];
      document.getElementById('yesterdayStats').innerHTML = 
        '<p>Wczoraj już zapisano: ' + history[yesterdayStr] + ' 🍺</p>';
    }
  });
  
  decreaseBtn.addEventListener('click', function() {
    var current = parseInt(beerCountInput.value) || 0;
    if (current > 0) beerCountInput.value = current - 1;
  });
  
  increaseBtn.addEventListener('click', function() {
    var current = parseInt(beerCountInput.value) || 0;
    beerCountInput.value = current + 1;
  });
  
  for (var i = 0; i < quickButtons.length; i++) {
    quickButtons[i].addEventListener('click', function() {
      beerCountInput.value = this.dataset.count;
    });
  }
  
  submitBtn.addEventListener('click', function() {
    var count = parseInt(beerCountInput.value) || 0;
    
    chrome.runtime.sendMessage({ 
      action: "setBeersForDate", 
      date: yesterdayStr,
      count: count 
    }, function() {
      // Odblokuj osiągnięcie "Pierwszy wpis"
      chrome.runtime.sendMessage({ action: "unlockAchievement", id: "firstEntry" });
      
      chrome.runtime.sendMessage({ action: "markAskedToday" }, function() {
        window.close();
      });
    });
  });
  
  skipBtn.addEventListener('click', function() {
    chrome.runtime.sendMessage({ 
      action: "setBeersForDate", 
      date: yesterdayStr,
      count: 0 
    }, function() {
      chrome.runtime.sendMessage({ action: "unlockAchievement", id: "firstEntry" });
      chrome.runtime.sendMessage({ action: "markAskedToday" }, function() {
        window.close();
      });
    });
  });
});