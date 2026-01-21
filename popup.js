var currentMonth = new Date().getMonth();
var currentYear = new Date().getFullYear();
var beerHistory = {};
var settings = {};
var achievements = {};

var ACHIEVEMENTS_DATA = {
  firstBeer: { icon: '🌟', name: 'Pierwszy wpis', desc: 'Zapisz pierwsze dane' },
  soberWeek: { icon: '🚗', name: 'Trzeźwy tydzień', desc: '7 dni bez alkoholu' },
  moderation: { icon: '🧘', name: 'Umiar', desc: 'Max 2 piwa/dzień przez tydzień' },
  streak30: { icon: '📅', name: 'Miesiąc', desc: '30 dni zapisywania z rzędu' },
  century: { icon: '💯', name: 'Weteran', desc: '100 dni w aplikacji' }
};

var FUN_COMPARISONS = [
  { icon: '🍕', name: 'pizz', divisor: 35 },
  { icon: '🍔', name: 'kebabów', divisor: 25 },
  { icon: '☕', name: 'kaw', divisor: 15 },
  { icon: '🎬', name: 'biletów do kina', divisor: 30 },
  { icon: '🏃', name: 'km biegu (kalorie)', divisor: 70 },
  { icon: '🍫', name: 'czekolad', divisor: 8 }
];

var BAC_TIPS = [
  'Limit promili dla kierowców w Polsce to 0.2‰. Po przekroczeniu 0.5‰ grozi kara do 2 lat więzienia.',
  'Wątroba metabolizuje około 0.1-0.15‰ alkoholu na godzinę.',
  'Kobieta tej samej wagi co mężczyzna będzie miała wyższy poziom alkoholu we krwi.',
  'Jedzenie przed piciem spowalnia wchłanianie alkoholu, ale nie zmniejsza jego ilości.',
  'Kac to głównie skutek odwodnienia. Pij wodę między piwami!',
  'Jedno piwo 0.5L 5% = około 20g czystego alkoholu.',
  'Alkohol zaburza fazę REM snu, przez co czujesz się zmęczony następnego dnia.',
  'Piwo bezalkoholowe może zawierać do 0.5% alkoholu.',
  'Średnio organizm spala 7-10g alkoholu na godzinę.',
  'Po 3 piwach 0.5L czas reakcji kierowcy wydłuża się o 25%.'
];

document.addEventListener('DOMContentLoaded', function() {
  loadData();
  setupTabs();
  setupEvents();
});

function setupTabs() {
  var tabs = document.querySelectorAll('.tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].addEventListener('click', function() {
      var tabId = this.dataset.tab;
      
      var allTabs = document.querySelectorAll('.tab');
      for (var j = 0; j < allTabs.length; j++) {
        allTabs[j].classList.remove('active');
      }
      
      var allContents = document.querySelectorAll('.tab-content');
      for (var j = 0; j < allContents.length; j++) {
        allContents[j].classList.remove('active');
      }
      
      this.classList.add('active');
      document.getElementById(tabId).classList.add('active');
      
      if (tabId === 'charts') renderAllCharts();
      if (tabId === 'calendar') renderCalendar();
      if (tabId === 'settings') loadSettingsForm();
      if (tabId === 'bac') loadBacSettings();
    });
  }
}

function setupEvents() {
  // Dodawanie piw
  var addBtns = document.querySelectorAll('.add-btn');
  for (var i = 0; i < addBtns.length; i++) {
    addBtns[i].addEventListener('click', function() {
      var count = parseInt(this.dataset.count);
      chrome.runtime.sendMessage({ action: "addBeers", count: count }, function() {
        loadData();
        showToast('Dodano ' + count + ' 🍺');
      });
    });
  }
  
  // Ręczne dodawanie
  document.getElementById('manualDate').valueAsDate = new Date();
  document.getElementById('manualSave').addEventListener('click', function() {
    var date = document.getElementById('manualDate').value;
    var count = parseInt(document.getElementById('manualCount').value) || 0;
    if (date) {
      chrome.runtime.sendMessage({ 
        action: "setBeersForDate", 
        date: date, 
        count: count 
      }, function() {
        loadData();
        showToast('Zapisano!');
      });
    }
  });
  
  // Kalendarz nawigacja
  document.getElementById('prevMonth').addEventListener('click', function() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', function() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });
  
  // Ustawienia
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  document.getElementById('exportCSV').addEventListener('click', exportToCSV);
  
  // Reset osiągnięć
  document.getElementById('resetAchievements').addEventListener('click', function() {
    if (confirm('Zresetować wszystkie osiągnięcia?')) {
      achievements = {
        firstBeer: false,
        soberWeek: false,
        moderation: false,
        streak30: false,
        century: false
      };
      chrome.runtime.sendMessage({ action: "saveAchievements", achievements: achievements }, function() {
        loadData();
        showToast('Osiągnięcia zresetowane');
      });
    }
  });
  
  // Usuń wszystko
  document.getElementById('clearAll').addEventListener('click', function() {
    if (confirm('NA PEWNO usunąć WSZYSTKIE dane?')) {
      chrome.runtime.sendMessage({ action: "clearAllData" }, function() {
        loadData();
        showToast('Dane usunięte');
      });
    }
  });
  
  // Kalkulator promili
  document.getElementById('calcBac').addEventListener('click', calculateBAC);
  
  // Presety % alkoholu
  var presetBtns = document.querySelectorAll('.bac-preset');
  for (var i = 0; i < presetBtns.length; i++) {
    presetBtns[i].addEventListener('click', function() {
      document.getElementById('bacPercent').value = this.dataset.percent;
      
      var allBtns = document.querySelectorAll('.bac-preset');
      for (var j = 0; j < allBtns.length; j++) {
        allBtns[j].classList.remove('active');
      }
      this.classList.add('active');
      
      calculateBAC();
    });
  }
  
  // Auto-oblicz przy zmianie wartości
  var bacInputs = document.querySelectorAll('#bacWeight, #bacGender, #bacBeers, #bacMl, #bacPercent, #bacHours');
  for (var i = 0; i < bacInputs.length; i++) {
    bacInputs[i].addEventListener('change', calculateBAC);
    bacInputs[i].addEventListener('input', calculateBAC);
  }
}

function loadData() {
  chrome.runtime.sendMessage({ action: "getSettings" }, function(s) {
    settings = s || {};
    
    chrome.runtime.sendMessage({ action: "getAchievements" }, function(a) {
      achievements = a || {};
      
      chrome.runtime.sendMessage({ action: "getBeerData" }, function(history) {
        beerHistory = history || {};
        updateStats();
        updateWeeklyGoal();
        updateAchievements();
        updateComparison();
        renderCalendar();
      });
    });
  });
}

function updateStats() {
  var today = new Date();
  var todayStr = today.toISOString().split('T')[0];
  
  var yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  var yesterdayStr = yesterday.toISOString().split('T')[0];
  
  var todayCount = beerHistory[todayStr] || 0;
  document.getElementById('todayCount').textContent = todayCount;
  document.getElementById('yesterdayCount').textContent = beerHistory[yesterdayStr] || 0;
  
  var weekCount = 0;
  for (var i = 0; i < 7; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    weekCount += beerHistory[dateStr] || 0;
  }
  document.getElementById('weekCount').textContent = weekCount;
  document.getElementById('avgWeek').textContent = (weekCount / 7).toFixed(1);
  
  var monthCount = 0;
  for (var dateKey in beerHistory) {
    var d = new Date(dateKey);
    if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
      monthCount += beerHistory[dateKey];
    }
  }
  document.getElementById('monthCount').textContent = monthCount;
  
  var yearCount = 0;
  for (var dateKey in beerHistory) {
    var d = new Date(dateKey);
    if (d.getFullYear() === today.getFullYear()) {
      yearCount += beerHistory[dateKey];
    }
  }
  document.getElementById('yearCount').textContent = yearCount;
  
  var totalCount = 0;
  for (var dateKey in beerHistory) {
    totalCount += beerHistory[dateKey];
  }
  document.getElementById('totalCount').textContent = totalCount;
  
  var price = settings.beerPrice || 8;
  var calories = settings.beerCalories || 150;
  
  document.getElementById('weekCost').textContent = (weekCount * price) + ' zł';
  document.getElementById('monthCost').textContent = (monthCount * price) + ' zł';
  document.getElementById('yearCost').textContent = (yearCount * price) + ' zł';
  document.getElementById('monthCalories').textContent = (monthCount * calories) + ' kcal';
  
  updateFunStats(yearCount, price, calories);
  updateStreak(today);
}

function updateFunStats(yearCount, price, calories) {
  var yearMoney = yearCount * price;
  var yearCalories = yearCount * calories;
  
  var html = '';
  var randomComparisons = FUN_COMPARISONS.sort(function() { return 0.5 - Math.random(); }).slice(0, 3);
  
  for (var i = 0; i < randomComparisons.length; i++) {
    var comp = randomComparisons[i];
    var value;
    
    if (comp.name === 'km biegu (kalorie)') {
      value = Math.floor(yearCalories / comp.divisor);
    } else {
      value = Math.floor(yearMoney / comp.divisor);
    }
    
    html += '<div class="fun-stat-item">';
    html += '<span>' + comp.icon + '</span>';
    html += '<span>Za te pieniądze kupisz <strong>' + value + '</strong> ' + comp.name + '</span>';
    html += '</div>';
  }
  
  var ml = settings.beerMl || 500;
  var liters = (yearCount * ml / 1000).toFixed(1);
  html += '<div class="fun-stat-item">';
  html += '<span>🍺</span>';
  html += '<span>W tym roku wypiłeś <strong>' + liters + 'L</strong> piwa</span>';
  html += '</div>';
  
  document.getElementById('funStats').innerHTML = html;
}

function updateStreak(today) {
  var soberDays = 0;
  var drinkingDays = 0;
  
  for (var i = 1; i <= 365; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    if (beerHistory.hasOwnProperty(dateStr) && beerHistory[dateStr] === 0) {
      soberDays++;
    } else {
      break;
    }
  }
  
  for (var i = 1; i <= 365; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    var count = beerHistory[dateStr] || 0;
    if (count > 0) drinkingDays++;
    else break;
  }
  
  var streakInfo = document.getElementById('streakInfo');
  if (soberDays > 0) {
    streakInfo.innerHTML = '<span class="streak-good">🌟 ' + soberDays + ' dni bez alkoholu!</span>';
  } else if (drinkingDays > 3) {
    streakInfo.innerHTML = '<span class="streak-bad">⚠️ ' + drinkingDays + ' dni z rzędu z piwem</span>';
  } else {
    streakInfo.innerHTML = '';
  }
}

function updateWeeklyGoal() {
  var goal = settings.weeklyGoal || 10;
  var today = new Date();
  var dayOfWeek = today.getDay();
  if (dayOfWeek === 0) dayOfWeek = 7;
  
  var weekStart = new Date(today);
  weekStart.setDate(today.getDate() - dayOfWeek + 1);
  
  var weekData = [];
  var weekTotal = 0;
  var daysNames = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  
  for (var i = 0; i < 7; i++) {
    var date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    var dateStr = date.toISOString().split('T')[0];
    var count = beerHistory[dateStr] || 0;
    var isPast = date <= today;
    var isToday = dateStr === today.toISOString().split('T')[0];
    
    weekData.push({
      name: daysNames[i],
      count: count,
      isPast: isPast,
      isToday: isToday
    });
    
    if (isPast) weekTotal += count;
  }
  
  document.getElementById('goalDisplay').textContent = weekTotal + '/' + goal;
  
  var percent = Math.min((weekTotal / goal) * 100, 100);
  var progressEl = document.getElementById('goalProgress');
  progressEl.style.width = percent + '%';
  progressEl.textContent = Math.round(percent) + '%';
  
  progressEl.classList.remove('safe', 'warning', 'danger');
  if (percent < 70) {
    progressEl.classList.add('safe');
  } else if (percent < 100) {
    progressEl.classList.add('warning');
  } else {
    progressEl.classList.add('danger');
  }
  
  var daysHtml = '';
  for (var i = 0; i < weekData.length; i++) {
    var day = weekData[i];
    var valueClass = day.isPast ? 'filled' : 'empty';
    if (day.isToday) valueClass += ' today';
    
    daysHtml += '<div class="week-day">';
    daysHtml += '<div class="week-day-name">' + day.name + '</div>';
    daysHtml += '<div class="week-day-value ' + valueClass + '">' + (day.isPast ? day.count : '·') + '</div>';
    daysHtml += '</div>';
  }
  document.getElementById('weeklyDays').innerHTML = daysHtml;
  
  var tipEl = document.getElementById('goalTip');
  var remaining = goal - weekTotal;
  
  if (weekTotal >= goal) {
    tipEl.textContent = '⚠️ Przekroczyłeś cel tygodniowy!';
    tipEl.className = 'goal-tip danger';
  } else if (remaining <= 2) {
    tipEl.textContent = '⚠️ Zostało tylko ' + remaining + ' piw do limitu!';
    tipEl.className = 'goal-tip warning';
  } else {
    tipEl.textContent = '💡 Zostało ' + remaining + ' piw - świetnie ci idzie!';
    tipEl.className = 'goal-tip';
  }
}

function updateAchievements() {
  var today = new Date();
  var newAchievements = [];
  
  var totalDays = Object.keys(beerHistory).length;
  if (totalDays > 0 && !achievements.firstBeer) {
    achievements.firstBeer = true;
    newAchievements.push('firstBeer');
  }
  
  var soberStreak = 0;
  for (var i = 1; i <= 7; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    
    if (beerHistory.hasOwnProperty(dateStr)) {
      if (beerHistory[dateStr] === 0) {
        soberStreak++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  if (soberStreak >= 7 && !achievements.soberWeek) {
    achievements.soberWeek = true;
    newAchievements.push('soberWeek');
  }
  
  var moderateDays = 0;
  for (var i = 1; i <= 7; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    
    if (beerHistory.hasOwnProperty(dateStr)) {
      if (beerHistory[dateStr] <= 2) {
        moderateDays++;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  if (moderateDays >= 7 && !achievements.moderation) {
    achievements.moderation = true;
    newAchievements.push('moderation');
  }
  
  if (totalDays >= 30 && !achievements.streak30) {
    achievements.streak30 = true;
    newAchievements.push('streak30');
  }
  
  if (totalDays >= 100 && !achievements.century) {
    achievements.century = true;
    newAchievements.push('century');
  }
  
  if (newAchievements.length > 0) {
    chrome.runtime.sendMessage({ action: "saveAchievements", achievements: achievements });
    
    for (var i = 0; i < newAchievements.length; i++) {
      showAchievementToast(newAchievements[i]);
    }
  }
  
  renderAchievementsGrid();
}

function renderAchievementsGrid() {
  var html = '';
  var unlockedCount = 0;
  var lastUnlocked = null;
  
  for (var key in ACHIEVEMENTS_DATA) {
    var data = ACHIEVEMENTS_DATA[key];
    var isUnlocked = achievements[key];
    
    if (isUnlocked) {
      unlockedCount++;
      lastUnlocked = key;
    }
    
    html += '<div class="achievement ' + (isUnlocked ? 'unlocked' : 'locked') + '" data-key="' + key + '">';
    html += '<div class="achievement-icon">' + (isUnlocked ? data.icon : '🔒') + '</div>';
    html += '<div class="achievement-name">' + data.name + '</div>';
    html += '</div>';
  }
  
  document.getElementById('achievementsGrid').innerHTML = html;
  document.getElementById('achievementsCount').textContent = unlockedCount + '/5';
  
  if (lastUnlocked) {
    document.getElementById('lastAchievement').innerHTML = 
      '🎉 Ostatnie: ' + ACHIEVEMENTS_DATA[lastUnlocked].name;
  } else {
    document.getElementById('lastAchievement').innerHTML = '';
  }
}

function showAchievementToast(key) {
  var data = ACHIEVEMENTS_DATA[key];
  
  var toast = document.createElement('div');
  toast.className = 'achievement-toast';
  toast.innerHTML = 
    '<span class="achievement-toast-icon">' + data.icon + '</span>' +
    '<div class="achievement-toast-title">Nowe osiągnięcie!</div>' +
    '<div class="achievement-toast-desc">' + data.name + '</div>';
  
  document.body.appendChild(toast);
  
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 500);
  }, 3000);
}

function updateComparison() {
  var today = new Date();
  var thisMonth = today.getMonth();
  var thisYear = today.getFullYear();
  var prevMonth = thisMonth - 1;
  var prevYear = thisYear;
  if (prevMonth < 0) { prevMonth = 11; prevYear--; }
  
  var thisMonthBeers = 0;
  var thisMonthSober = 0;
  var prevMonthBeers = 0;
  var prevMonthSober = 0;
  
  var daysInThisMonth = new Date(thisYear, thisMonth + 1, 0).getDate();
  var daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();
  
  for (var day = 1; day <= daysInThisMonth; day++) {
    var dateStr = thisYear + '-' + String(thisMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    var count = beerHistory[dateStr] || 0;
    thisMonthBeers += count;
    if (count === 0) thisMonthSober++;
  }
  
  for (var day = 1; day <= daysInPrevMonth; day++) {
    var dateStr = prevYear + '-' + String(prevMonth + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    var count = beerHistory[dateStr] || 0;
    prevMonthBeers += count;
    if (count === 0) prevMonthSober++;
  }
  
  var price = settings.beerPrice || 8;
  
  document.getElementById('compBeers').textContent = thisMonthBeers;
  document.getElementById('compBeersPrev').textContent = prevMonthBeers;
  setChangeClass('compBeersChange', thisMonthBeers, prevMonthBeers, true);
  
  document.getElementById('compCost').textContent = (thisMonthBeers * price) + ' zł';
  document.getElementById('compCostPrev').textContent = (prevMonthBeers * price) + ' zł';
  setChangeClass('compCostChange', thisMonthBeers * price, prevMonthBeers * price, true);
  
  document.getElementById('compSober').textContent = thisMonthSober;
  document.getElementById('compSoberPrev').textContent = prevMonthSober;
  setChangeClass('compSoberChange', thisMonthSober, prevMonthSober, false);
}

function setChangeClass(elementId, current, previous, lowerIsBetter) {
  var el = document.getElementById(elementId);
  var change = previous > 0 ? Math.round(((current - previous) / previous) * 100) : 0;
  
  var isPositive = lowerIsBetter ? (change < 0) : (change > 0);
  
  el.textContent = (change >= 0 ? '+' : '') + change + '%';
  el.className = 'comparison-change ' + (isPositive ? 'positive' : 'negative');
}

// ========== KALKULATOR PROMILI ==========

function calculateBAC() {
  var weight = parseFloat(document.getElementById('bacWeight').value) || 80;
  var gender = document.getElementById('bacGender').value;
  var beers = parseFloat(document.getElementById('bacBeers').value) || 0;
  var ml = parseFloat(document.getElementById('bacMl').value) || 500;
  var percent = parseFloat(document.getElementById('bacPercent').value) || 5.0;
  var hours = parseFloat(document.getElementById('bacHours').value) || 0;
  
  // 1. Całkowita objętość piwa w ml
  var totalMl = beers * ml;
  
  // 2. Objętość czystego alkoholu w ml
  var alcoholMl = totalMl * (percent / 100);
  
  // 3. Masa alkoholu w gramach (gęstość alkoholu = 0.789 g/ml)
  var alcoholGrams = alcoholMl * 0.789;
  
  // 4. Współczynnik dystrybucji wody w organizmie
  // Mężczyźni: 0.7, Kobiety: 0.6
  var r = (gender === 'M') ? 0.7 : 0.6;
  
  // 5. Wzór Widmarka:
  // C (promile) = A / (m × r)
  // gdzie A = gramy alkoholu, m = masa ciała w kg, r = współczynnik
  var bac = alcoholGrams / (weight * r);
  
  // 6. Metabolizm: średnio 0.15‰ na godzinę
  var metabolized = hours * 0.15;
  var bacAfterTime = Math.max(0, bac - metabolized);
  
  // Zaokrąglij do 2 miejsc
  bac = Math.round(bac * 100) / 100;
  bacAfterTime = Math.round(bacAfterTime * 100) / 100;
  alcoholGrams = Math.round(alcoholGrams * 10) / 10;
  
  // Wyświetl wyniki
  var bacEl = document.getElementById('bacValue');
  var statusEl = document.getElementById('bacStatus');
  var resultEl = document.getElementById('bacResult');
  var gramsEl = document.getElementById('bacGrams');
  
  bacEl.textContent = bacAfterTime.toFixed(2) + ' ‰';
  gramsEl.textContent = alcoholGrams + 'g';
  
  resultEl.classList.remove('safe', 'warning', 'danger');
  
  if (bacAfterTime < 0.2) {
    resultEl.classList.add('safe');
    statusEl.textContent = '✅ Trzeźwy - możesz jechać';
  } else if (bacAfterTime < 0.5) {
    resultEl.classList.add('warning');
    statusEl.textContent = '⚠️ Stan po spożyciu - NIE JEDŹ!';
  } else {
    resultEl.classList.add('danger');
    statusEl.textContent = '🚫 Stan nietrzeźwości - NIE JEDŹ!';
  }
  
  // Czas do możliwości jazdy (poniżej 0.2‰)
  var hoursToDrive = 0;
  if (bacAfterTime >= 0.2) {
    hoursToDrive = (bacAfterTime - 0.19) / 0.15;
  }
  
  // Czas do pełnej trzeźwości
  var hoursToSober = bacAfterTime / 0.15;
  
  // Formatuj czas jazdy
  if (hoursToDrive > 0) {
    var driveH = Math.floor(hoursToDrive);
    var driveM = Math.round((hoursToDrive - driveH) * 60);
    document.getElementById('bacDriveTime').textContent = driveH + 'h ' + driveM + 'min';
  } else {
    document.getElementById('bacDriveTime').textContent = 'Teraz ✓';
  }
  
  // Oblicz godzinę trzeźwości
  if (bacAfterTime > 0.01) {
    var soberTime = new Date();
    soberTime.setMinutes(soberTime.getMinutes() + Math.round(hoursToSober * 60));
    document.getElementById('bacSoberTime').textContent = 
      soberTime.getHours().toString().padStart(2, '0') + ':' + 
      soberTime.getMinutes().toString().padStart(2, '0');
  } else {
    document.getElementById('bacSoberTime').textContent = 'Teraz ✓';
  }
  
  // Szczegóły obliczeń
  var breakdownHtml = '<div class="bac-breakdown-title">📊 Szczegóły obliczeń:</div>';
  
  breakdownHtml += '<div class="bac-breakdown-row">';
  breakdownHtml += '<span>Wypite piwo:</span>';
  breakdownHtml += '<span>' + beers + ' × ' + ml + 'ml = ' + totalMl + 'ml</span>';
  breakdownHtml += '</div>';
  
  breakdownHtml += '<div class="bac-breakdown-row">';
  breakdownHtml += '<span>Czysty alkohol (' + percent + '%):</span>';
  breakdownHtml += '<span>' + alcoholMl.toFixed(1) + 'ml = ' + alcoholGrams + 'g</span>';
  breakdownHtml += '</div>';
  
  breakdownHtml += '<div class="bac-breakdown-row">';
  breakdownHtml += '<span>Promile (zaraz po wypiciu):</span>';
  breakdownHtml += '<span>' + bac.toFixed(2) + '‰</span>';
  breakdownHtml += '</div>';
  
  if (hours > 0) {
    breakdownHtml += '<div class="bac-breakdown-row">';
    breakdownHtml += '<span>Spalono przez ' + hours + 'h:</span>';
    breakdownHtml += '<span>−' + metabolized.toFixed(2) + '‰</span>';
    breakdownHtml += '</div>';
  }
  
  breakdownHtml += '<div class="bac-breakdown-row highlight">';
  breakdownHtml += '<span>Aktualne promile:</span>';
  breakdownHtml += '<span>' + bacAfterTime.toFixed(2) + '‰</span>';
  breakdownHtml += '</div>';
  
  document.getElementById('bacBreakdown').innerHTML = breakdownHtml;
  
  // Losowy tip
  document.getElementById('bacTip').textContent = 
    BAC_TIPS[Math.floor(Math.random() * BAC_TIPS.length)];
}

function loadBacSettings() {
  document.getElementById('bacWeight').value = settings.weight || 80;
  document.getElementById('bacGender').value = settings.gender || 'M';
  document.getElementById('bacMl').value = settings.beerMl || 500;
  
  // Ustaw dzisiejszą liczbę piw jeśli są
  var today = new Date().toISOString().split('T')[0];
  var todayBeers = beerHistory[today] || 0;
  if (todayBeers > 0) {
    document.getElementById('bacBeers').value = todayBeers;
  }
  
  // Oblicz od razu
  calculateBAC();
}

// ========== WYKRESY ==========

function renderAllCharts() {
  renderWeekChart();
  renderMonthChart();
  renderWeekdayChart();
  renderCostChart();
  updateChartStats();
}

function renderWeekChart() {
  var container = document.getElementById('weekChart');
  var today = new Date();
  var data = [];
  var labels = [];
  var maxVal = 1;
  
  for (var i = 6; i >= 0; i--) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    var count = beerHistory[dateStr] || 0;
    var dayName = date.toLocaleDateString('pl-PL', { weekday: 'short' });
    
    labels.push(dayName);
    data.push(count);
    if (count > maxVal) maxVal = count;
  }
  
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var height = Math.max((data[i] / maxVal) * 100, 5);
    var colorClass = getBarColor(data[i]);
    html += '<div class="bar-item">';
    html += '<div class="bar-value">' + data[i] + '</div>';
    html += '<div class="bar ' + colorClass + '" style="height:' + height + '%"></div>';
    html += '<div class="bar-label">' + labels[i] + '</div>';
    html += '</div>';
  }
  container.innerHTML = html;
}

function renderMonthChart() {
  var container = document.getElementById('monthChart');
  var today = new Date();
  var data = [];
  var maxVal = 1;
  
  for (var i = 29; i >= 0; i--) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    var count = beerHistory[dateStr] || 0;
    data.push({ day: date.getDate(), count: count });
    if (count > maxVal) maxVal = count;
  }
  
  var html = '<div class="line-bars">';
  for (var i = 0; i < data.length; i++) {
    var height = Math.max((data[i].count / maxVal) * 100, 2);
    html += '<div class="line-bar" style="height:' + height + '%" title="' + data[i].day + ': ' + data[i].count + '"></div>';
  }
  html += '</div>';
  html += '<div class="line-labels"><span>30 dni temu</span><span>Dziś</span></div>';
  container.innerHTML = html;
}

function renderWeekdayChart() {
  var container = document.getElementById('weekdayChart');
  var weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  var totals = [0, 0, 0, 0, 0, 0, 0];
  var counts = [0, 0, 0, 0, 0, 0, 0];
  
  for (var dateStr in beerHistory) {
    var date = new Date(dateStr);
    var dayIndex = date.getDay() - 1;
    if (dayIndex < 0) dayIndex = 6;
    totals[dayIndex] += beerHistory[dateStr];
    counts[dayIndex]++;
  }
  
  var averages = [];
  var maxVal = 1;
  for (var i = 0; i < 7; i++) {
    var avg = counts[i] > 0 ? (totals[i] / counts[i]) : 0;
    averages.push(parseFloat(avg.toFixed(1)));
    if (avg > maxVal) maxVal = avg;
  }
  
  var html = '';
  for (var i = 0; i < 7; i++) {
    var height = Math.max((averages[i] / maxVal) * 100, 5);
    var colorClass = i >= 4 ? 'bar-weekend' : 'bar-weekday';
    html += '<div class="bar-item">';
    html += '<div class="bar-value">' + averages[i] + '</div>';
    html += '<div class="bar ' + colorClass + '" style="height:' + height + '%"></div>';
    html += '<div class="bar-label">' + weekdays[i] + '</div>';
    html += '</div>';
  }
  container.innerHTML = html;
}

function renderCostChart() {
  var container = document.getElementById('costChart');
  var today = new Date();
  var price = settings.beerPrice || 8;
  var data = [];
  var labels = [];
  var maxVal = 1;
  
  for (var i = 5; i >= 0; i--) {
    var date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    var monthName = date.toLocaleDateString('pl-PL', { month: 'short' });
    labels.push(monthName);
    
    var monthTotal = 0;
    for (var dateStr in beerHistory) {
      var d = new Date(dateStr);
      if (d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) {
        monthTotal += beerHistory[dateStr];
      }
    }
    var cost = monthTotal * price;
    data.push(cost);
    if (cost > maxVal) maxVal = cost;
  }
  
  var html = '';
  for (var i = 0; i < data.length; i++) {
    var height = Math.max((data[i] / maxVal) * 100, 5);
    html += '<div class="bar-item">';
    html += '<div class="bar-value">' + data[i] + '</div>';
    html += '<div class="bar bar-cost" style="height:' + height + '%"></div>';
    html += '<div class="bar-label">' + labels[i] + '</div>';
    html += '</div>';
  }
  container.innerHTML = html;
}

function getBarColor(count) {
  if (count === 0) return 'bar-green';
  if (count <= 2) return 'bar-yellow';
  if (count <= 4) return 'bar-orange';
  return 'bar-red';
}

function updateChartStats() {
  var today = new Date();
  var maxDay = 0;
  var sum30 = 0;
  var daysWithBeer = 0;
  
  for (var i = 0; i < 30; i++) {
    var date = new Date(today);
    date.setDate(date.getDate() - i);
    var dateStr = date.toISOString().split('T')[0];
    var count = beerHistory[dateStr] || 0;
    if (count > maxDay) maxDay = count;
    sum30 += count;
    if (count > 0) daysWithBeer++;
  }
  
  document.getElementById('maxDay').textContent = maxDay;
  document.getElementById('avgMonth').textContent = (sum30 / 30).toFixed(1);
  document.getElementById('drinkingDays').textContent = Math.round((daysWithBeer / 30) * 100) + '%';
}

// ========== KALENDARZ ==========

function renderCalendar() {
  var monthLabel = document.getElementById('monthLabel');
  var calendarDays = document.getElementById('calendarDays');
  var monthSummary = document.getElementById('monthSummary');
  
  var monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  
  monthLabel.textContent = monthNames[currentMonth] + ' ' + currentYear;
  
  var firstDay = new Date(currentYear, currentMonth, 1);
  var startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  
  var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  var html = '';
  var monthTotal = 0;
  var daysWithBeer = 0;
  
  for (var i = 0; i < startDay; i++) {
    html += '<div class="cal-day empty"></div>';
  }
  
  var todayStr = new Date().toISOString().split('T')[0];
  var price = settings.beerPrice || 8;
  
  for (var day = 1; day <= daysInMonth; day++) {
    var mm = String(currentMonth + 1).padStart(2, '0');
    var dd = String(day).padStart(2, '0');
    var dateStr = currentYear + '-' + mm + '-' + dd;
    var count = beerHistory[dateStr] || 0;
    
    monthTotal += count;
    if (count > 0) daysWithBeer++;
    
    var levelClass = 'l0';
    if (count >= 1 && count <= 2) levelClass = 'l1';
    else if (count >= 3 && count <= 4) levelClass = 'l2';
    else if (count >= 5 && count <= 6) levelClass = 'l3';
    else if (count >= 7) levelClass = 'l4';
    
    var todayClass = dateStr === todayStr ? ' today' : '';
    
    html += '<div class="cal-day ' + levelClass + todayClass + '" data-date="' + dateStr + '" title="' + count + ' piw">';
    html += '<span class="cal-num">' + day + '</span>';
    if (count > 0) html += '<span class="cal-count">' + count + '</span>';
    html += '</div>';
  }
  
  calendarDays.innerHTML = html;
  
  var calDays = calendarDays.querySelectorAll('.cal-day:not(.empty)');
  for (var i = 0; i < calDays.length; i++) {
    calDays[i].addEventListener('click', function() {
      var date = this.dataset.date;
      document.getElementById('manualDate').value = date;
      document.getElementById('manualCount').value = beerHistory[date] || 0;
      document.getElementById('manualCount').focus();
    });
  }
  
  var avg = (monthTotal / daysInMonth).toFixed(1);
  monthSummary.innerHTML = 
    '<p>🍺 Razem: <b>' + monthTotal + '</b> | ' +
    '📅 Dni z piwem: <b>' + daysWithBeer + '</b>/' + daysInMonth + ' | ' +
    '💰 <b>' + (monthTotal * price) + ' zł</b></p>';
}

// ========== USTAWIENIA ==========

function loadSettingsForm() {
  document.getElementById('settingWeeklyGoal').value = settings.weeklyGoal || 10;
  document.getElementById('settingPrice').value = settings.beerPrice || 8;
  document.getElementById('settingMl').value = settings.beerMl || 500;
  document.getElementById('settingCalories').value = settings.beerCalories || 150;
  document.getElementById('settingWeight').value = settings.weight || 80;
  document.getElementById('settingGender').value = settings.gender || 'M';
  document.getElementById('settingDailyLimit').value = settings.dailyLimit || 4;
  document.getElementById('settingWeeklyLimit').value = settings.weeklyLimit || 14;
}

function saveSettings() {
  var newSettings = {
    weeklyGoal: parseInt(document.getElementById('settingWeeklyGoal').value) || 10,
    beerPrice: parseFloat(document.getElementById('settingPrice').value) || 8,
    beerMl: parseInt(document.getElementById('settingMl').value) || 500,
    beerCalories: parseInt(document.getElementById('settingCalories').value) || 150,
    weight: parseInt(document.getElementById('settingWeight').value) || 80,
    gender: document.getElementById('settingGender').value || 'M',
    dailyLimit: parseInt(document.getElementById('settingDailyLimit').value) || 4,
    weeklyLimit: parseInt(document.getElementById('settingWeeklyLimit').value) || 14
  };
  
  chrome.runtime.sendMessage({ action: "saveSettings", settings: newSettings }, function() {
    settings = newSettings;
    showToast('Zapisano! ✓');
    loadData();
  });
}

// ========== EKSPORT CSV ==========

function exportToCSV() {
  var price = settings.beerPrice || 8;
  var calories = settings.beerCalories || 150;
  
  var csv = 'Data,Piwa,Koszt,Kalorie\n';
  var dates = Object.keys(beerHistory).sort();
  
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i];
    var c = beerHistory[d];
    csv += d + ',' + c + ',' + (c * price) + ',' + (c * calories) + '\n';
  }
  
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var link = document.createElement('a');
  link.href = url;
  link.download = 'piwa_' + new Date().toISOString().split('T')[0] + '.csv';
  link.click();
  showToast('Eksport CSV! 📊');
}

// ========== TOAST ==========

function showToast(msg) {
  var old = document.querySelector('.toast');
  if (old) old.remove();
  
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  
  setTimeout(function() { toast.classList.add('show'); }, 10);
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() { toast.remove(); }, 300);
  }, 2000);
}