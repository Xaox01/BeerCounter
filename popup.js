let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let beerHistory = {};
let settings = {};
let charts = {};

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  setupTabs();
  setupEventListeners();
});

function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      
      tab.classList.add('active');
      document.getElementById(tab.dataset.tab).classList.add('active');
      
      if (tab.dataset.tab === 'calendar') {
        renderCalendar();
      }
      if (tab.dataset.tab === 'charts') {
        setTimeout(renderCharts, 100);
      }
      if (tab.dataset.tab === 'settings') {
        loadSettingsForm();
      }
    });
  });
}

function setupEventListeners() {
  // Dodawanie piw
  document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const count = parseInt(btn.dataset.count);
      chrome.runtime.sendMessage({ action: "addBeers", count: count }, () => {
        loadData();
        showToast(`Dodano ${count} 🍺`);
      });
    });
  });
  
  // Ręczne dodawanie
  document.getElementById('manualDate').valueAsDate = new Date();
  document.getElementById('manualSave').addEventListener('click', () => {
    const date = document.getElementById('manualDate').value;
    const count = parseInt(document.getElementById('manualCount').value) || 0;
    
    if (date) {
      chrome.runtime.sendMessage({ 
        action: "setBeersForDate", 
        date: date, 
        count: count 
      }, () => {
        loadData();
        showToast(`Zapisano ${count} 🍺`);
      });
    }
  });
  
  // Nawigacja kalendarza
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });
  
  // Ustawienia
  document.getElementById('saveSettings').addEventListener('click', saveSettings);
  
  // Eksport
  document.getElementById('exportCSV').addEventListener('click', exportToCSV);
  
  // Usuń dane
  document.getElementById('clearAll').addEventListener('click', () => {
    if (confirm('NA PEWNO usunąć WSZYSTKIE dane? Tej operacji nie można cofnąć!')) {
      chrome.runtime.sendMessage({ action: "clearAllData" }, () => {
        loadData();
        showToast('Dane usunięte');
      });
    }
  });
}

function loadData() {
  chrome.runtime.sendMessage({ action: "getSettings" }, (s) => {
    settings = s;
    
    chrome.runtime.sendMessage({ action: "getBeerData" }, (history) => {
      beerHistory = history || {};
      updateStats();
      renderCalendar();
    });
  });
}

function updateStats() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Dzisiaj
  const todayCount = beerHistory[todayStr] || 0;
  document.getElementById('todayCount').textContent = todayCount;
  
  // Wczoraj
  document.getElementById('yesterdayCount').textContent = beerHistory[yesterdayStr] || 0;
  
  // Ten tydzień
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    weekCount += beerHistory[dateStr] || 0;
  }
  document.getElementById('weekCount').textContent = weekCount;
  document.getElementById('avgWeek').textContent = (weekCount / 7).toFixed(1);
  
  // Ten miesiąc
  let monthCount = 0;
  for (const [date, count] of Object.entries(beerHistory)) {
    const d = new Date(date);
    if (d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()) {
      monthCount += count;
    }
  }
  document.getElementById('monthCount').textContent = monthCount;
  
  // Ten rok
  let yearCount = 0;
  for (const [date, count] of Object.entries(beerHistory)) {
    const d = new Date(date);
    if (d.getFullYear() === today.getFullYear()) {
      yearCount += count;
    }
  }
  document.getElementById('yearCount').textContent = yearCount;
  
  // Łącznie
  let totalCount = 0;
  for (const count of Object.values(beerHistory)) {
    totalCount += count;
  }
  document.getElementById('totalCount').textContent = totalCount;
  
  // KOSZTY
  const price = settings.beerPrice || 8;
  const calories = settings.beerCalories || 150;
  
  document.getElementById('weekCost').textContent = `${weekCount * price} zł`;
  document.getElementById('monthCost').textContent = `${monthCount * price} zł`;
  document.getElementById('yearCost').textContent = `${yearCount * price} zł`;
  document.getElementById('monthCalories').textContent = `${monthCount * calories} kcal`;
  
  // Ciekawe statystyki
  updateFunStats(monthCount, yearCount, price, calories);
  
  // Streak
  updateStreak(today);
}

function updateFunStats(monthCount, yearCount, price, calories) {
  const funStat1 = document.getElementById('funStat1');
  const funStat2 = document.getElementById('funStat2');
  
  // Litry
  const ml = settings.beerMl || 500;
  const yearLiters = (yearCount * ml / 1000).toFixed(1);
  funStat1.innerHTML = `🍺 W tym roku: <strong>${yearLiters}L</strong> piwa`;
  
  // Co można kupić za te pieniądze
  const yearMoney = yearCount * price;
  let comparison = '';
  if (yearMoney >= 5000) {
    comparison = `💻 Laptop za ${yearMoney} zł`;
  } else if (yearMoney >= 2000) {
    comparison = `📱 Telefon za ${yearMoney} zł`;
  } else if (yearMoney >= 500) {
    comparison = `👟 Buty za ${yearMoney} zł`;
  } else if (yearMoney >= 100) {
    comparison = `🍕 ${Math.floor(yearMoney / 40)} pizz`;
  } else {
    comparison = `☕ ${Math.floor(yearMoney / 15)} kaw`;
  }
  funStat2.innerHTML = `💸 Mogłeś kupić: <strong>${comparison}</strong>`;
}

function updateStreak(today) {
  let soberDays = 0;
  let drinkingDays = 0;
  
  for (let i = 1; i <= 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = beerHistory[dateStr] || 0;
    
    if (count === 0) soberDays++;
    else break;
  }
  
  for (let i = 1; i <= 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = beerHistory[dateStr] || 0;
    
    if (count > 0) drinkingDays++;
    else break;
  }
  
  const streakInfo = document.getElementById('streakInfo');
  if (soberDays > 0) {
    streakInfo.innerHTML = `<span class="streak-good">🌟 ${soberDays} dni bez alkoholu!</span>`;
  } else if (drinkingDays > 3) {
    streakInfo.innerHTML = `<span class="streak-bad">⚠️ ${drinkingDays} dni z rzędu z piwem</span>`;
  } else {
    streakInfo.innerHTML = '';
  }
}

// ===== WYKRESY =====
function renderCharts() {
  renderWeekChart();
  renderMonthChart();
  renderWeekdayChart();
  renderCostChart();
  updateChartStats();
}

function renderWeekChart() {
  const ctx = document.getElementById('weekChart').getContext('2d');
  const labels = [];
  const data = [];
  const today = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    labels.push(date.toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric' }));
    data.push(beerHistory[dateStr] || 0);
  }
  
  if (charts.week) charts.week.destroy();
  
  charts.week = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Piwa',
        data: data,
        backgroundColor: data.map(v => {
          if (v === 0) return 'rgba(74, 222, 128, 0.6)';
          if (v <= 2) return 'rgba(250, 204, 21, 0.6)';
          if (v <= 4) return 'rgba(251, 146, 60, 0.6)';
          return 'rgba(239, 68, 68, 0.6)';
        }),
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { ticks: { color: '#888' }, grid: { display: false } }
      }
    }
  });
}

function renderMonthChart() {
  const ctx = document.getElementById('monthChart').getContext('2d');
  const labels = [];
  const data = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    labels.push(date.getDate());
    data.push(beerHistory[dateStr] || 0);
  }
  
  if (charts.month) charts.month.destroy();
  
  charts.month = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Piwa',
        data: data,
        borderColor: '#ffa500',
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 3,
        pointBackgroundColor: '#ffa500'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { stepSize: 1, color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { ticks: { color: '#888', maxTicksLimit: 10 }, grid: { display: false } }
      }
    }
  });
}

function renderWeekdayChart() {
  const ctx = document.getElementById('weekdayChart').getContext('2d');
  const weekdays = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
  const totals = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  
  for (const [dateStr, count] of Object.entries(beerHistory)) {
    const date = new Date(dateStr);
    let dayIndex = date.getDay() - 1;
    if (dayIndex < 0) dayIndex = 6;
    totals[dayIndex] += count;
    counts[dayIndex]++;
  }
  
  const averages = totals.map((total, i) => counts[i] > 0 ? (total / counts[i]).toFixed(1) : 0);
  
  if (charts.weekday) charts.weekday.destroy();
  
  charts.weekday = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: weekdays,
      datasets: [{
        label: 'Średnia',
        data: averages,
        backgroundColor: [
          'rgba(100, 149, 237, 0.6)',
          'rgba(100, 149, 237, 0.6)',
          'rgba(100, 149, 237, 0.6)',
          'rgba(100, 149, 237, 0.6)',
          'rgba(255, 165, 0, 0.6)',
          'rgba(239, 68, 68, 0.6)',
          'rgba(239, 68, 68, 0.6)'
        ],
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#888' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { ticks: { color: '#888' }, grid: { display: false } }
      }
    }
  });
}

function renderCostChart() {
  const ctx = document.getElementById('costChart').getContext('2d');
  const labels = [];
  const data = [];
  const today = new Date();
  const price = settings.beerPrice || 8;
  
  // Ostatnie 6 miesięcy
  for (let i = 5; i >= 0; i--) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const monthName = date.toLocaleDateString('pl-PL', { month: 'short' });
    labels.push(monthName);
    
    let monthTotal = 0;
    for (const [dateStr, count] of Object.entries(beerHistory)) {
      const d = new Date(dateStr);
      if (d.getMonth() === date.getMonth() && d.getFullYear() === date.getFullYear()) {
        monthTotal += count;
      }
    }
    data.push(monthTotal * price);
  }
  
  if (charts.cost) charts.cost.destroy();
  
  charts.cost = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Koszt (zł)',
        data: data,
        backgroundColor: 'rgba(74, 222, 128, 0.6)',
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, ticks: { color: '#888', callback: v => v + ' zł' }, grid: { color: 'rgba(255,255,255,0.1)' } },
        x: { ticks: { color: '#888' }, grid: { display: false } }
      }
    }
  });
}

function updateChartStats() {
  const today = new Date();
  let maxDay = 0;
  let sum30 = 0;
  let daysWithBeer = 0;
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = beerHistory[dateStr] || 0;
    
    if (count > maxDay) maxDay = count;
    sum30 += count;
    if (count > 0) daysWithBeer++;
  }
  
  document.getElementById('maxDay').textContent = maxDay;
  document.getElementById('avgMonth').textContent = (sum30 / 30).toFixed(1);
  document.getElementById('drinkingDays').textContent = Math.round((daysWithBeer / 30) * 100) + '%';
}

// ===== KALENDARZ =====
function renderCalendar() {
  const monthLabel = document.getElementById('monthLabel');
  const calendarDays = document.getElementById('calendarDays');
  const monthSummary = document.getElementById('monthSummary');
  
  const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  
  monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  
  const firstDay = new Date(currentYear, currentMonth, 1);
  let startDay = firstDay.getDay() - 1;
  if (startDay < 0) startDay = 6;
  
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  let html = '';
  let monthTotal = 0;
  let daysWithBeer = 0;
  let monthCost = 0;
  
  for (let i = 0; i < startDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  const todayStr = new Date().toISOString().split('T')[0];
  const price = settings.beerPrice || 8;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = beerHistory[dateStr] || 0;
    
    monthTotal += count;
    monthCost += count * price;
    if (count > 0) daysWithBeer++;
    
    let levelClass = 'level-0';
    if (count >= 1 && count <= 2) levelClass = 'level-1';
    else if (count >= 3 && count <= 4) levelClass = 'level-2';
    else if (count >= 5 && count <= 6) levelClass = 'level-3';
    else if (count >= 7) levelClass = 'level-4';
    
    const isToday = dateStr === todayStr ? 'today' : '';
    
    html += `
      <div class="calendar-day ${levelClass} ${isToday}" title="${dateStr}: ${count} piw" data-date="${dateStr}">
        <span class="day-number">${day}</span>
        ${count > 0 ? `<span class="day-count">${count}</span>` : ''}
      </div>
    `;
  }
  
  calendarDays.innerHTML = html;
  
  // Kliknięcie na dzień - wypełnij formularz
  calendarDays.querySelectorAll('.calendar-day:not(.empty)').forEach(dayEl => {
    dayEl.addEventListener('click', () => {
      const date = dayEl.dataset.date;
      document.getElementById('manualDate').value = date;
      document.getElementById('manualCount').value = beerHistory[date] || 0;
      document.getElementById('manualCount').focus();
    });
  });
  
  const avgPerDay = (monthTotal / daysInMonth).toFixed(1);
  monthSummary.innerHTML = `
    <p>🍺 Łącznie: <strong>${monthTotal}</strong> piw</p>
    <p>📅 Dni z piwem: <strong>${daysWithBeer}</strong> / ${daysInMonth}</p>
    <p>📊 Średnio: <strong>${avgPerDay}</strong> / dzień</p>
    <p>💰 Koszt: <strong>${monthCost} zł</strong></p>
  `;
}

// ===== USTAWIENIA =====
function loadSettingsForm() {
  document.getElementById('settingPrice').value = settings.beerPrice || 8;
  document.getElementById('settingMl').value = settings.beerMl || 500;
  document.getElementById('settingCalories').value = settings.beerCalories || 150;
  document.getElementById('settingDailyLimit').value = settings.dailyLimit || 4;
  document.getElementById('settingWeeklyLimit').value = settings.weeklyLimit || 14;
  document.getElementById('settingAlerts').checked = settings.alertsEnabled !== false;
}

function saveSettings() {
  const newSettings = {
    beerPrice: parseFloat(document.getElementById('settingPrice').value) || 8,
    beerMl: parseInt(document.getElementById('settingMl').value) || 500,
    beerCalories: parseInt(document.getElementById('settingCalories').value) || 150,
    dailyLimit: parseInt(document.getElementById('settingDailyLimit').value) || 4,
    weeklyLimit: parseInt(document.getElementById('settingWeeklyLimit').value) || 14,
    alertsEnabled: document.getElementById('settingAlerts').checked
  };
  
  chrome.runtime.sendMessage({ action: "saveSettings", settings: newSettings }, () => {
    settings = newSettings;
    showToast('Ustawienia zapisane! ✓');
    updateStats();
  });
}

// ===== EKSPORT =====
function exportToCSV() {
  const price = settings.beerPrice || 8;
  const calories = settings.beerCalories || 150;
  
  let csv = 'Data,Piwa,Koszt (zł),Kalorie\n';
  
  const sortedDates = Object.keys(beerHistory).sort();
  
  for (const date of sortedDates) {
    const count = beerHistory[date];
    csv += `${date},${count},${count * price},${count * calories}\n`;
  }
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `piwa_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showToast('Eksportowano CSV! 📊');
}

// ===== TOAST =====
function showToast(message) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add('show'), 10);
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}