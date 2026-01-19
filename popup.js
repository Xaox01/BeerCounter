let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let beerHistory = {};

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
        showToast(`Zapisano ${count} 🍺 dla ${date}`);
      });
    }
  });
  
  // Nawigacja kalendarza
  document.getElementById('prevMonth').addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    renderCalendar();
  });
  
  document.getElementById('nextMonth').addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    renderCalendar();
  });
  
  // Reset
  document.getElementById('resetToday').addEventListener('click', () => {
    if (confirm('Na pewno zresetować dzisiejszy licznik?')) {
      chrome.runtime.sendMessage({ action: "resetToday" }, () => {
        loadData();
        showToast('Zresetowano!');
      });
    }
  });
  
  // Eksport CSV
  document.getElementById('exportCSV').addEventListener('click', exportToCSV);
}

function loadData() {
  chrome.runtime.sendMessage({ action: "getBeerData" }, (history) => {
    beerHistory = history || {};
    updateStats();
    renderCalendar();
  });
}

function updateStats() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  // Dzisiaj
  document.getElementById('todayCount').textContent = beerHistory[todayStr] || 0;
  
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
  
  // Średnia tygodniowa
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
  
  // Streak (dni bez picia)
  updateStreak(today);
}

function updateStreak(today) {
  let soberDays = 0;
  let drinkingDays = 0;
  
  // Licz dni bez picia (od wczoraj wstecz)
  for (let i = 1; i <= 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = beerHistory[dateStr] || 0;
    
    if (count === 0) {
      soberDays++;
    } else {
      break;
    }
  }
  
  // Licz dni picia z rzędu
  for (let i = 1; i <= 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const count = beerHistory[dateStr] || 0;
    
    if (count > 0) {
      drinkingDays++;
    } else {
      break;
    }
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

function renderCalendar() {
  const monthLabel = document.getElementById('monthLabel');
  const calendarDays = document.getElementById('calendarDays');
  const monthSummary = document.getElementById('monthSummary');
  
  const monthNames = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
                      'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];
  
  monthLabel.textContent = `${monthNames[currentMonth]} ${currentYear}`;
  
  // Pierwszy dzień miesiąca
  const firstDay = new Date(currentYear, currentMonth, 1);
  let startDay = firstDay.getDay() - 1; // Poniedziałek = 0
  if (startDay < 0) startDay = 6;
  
  // Ile dni w miesiącu
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  
  // Generuj dni
  let html = '';
  let monthTotal = 0;
  let daysWithBeer = 0;
  
  // Puste komórki na początku
  for (let i = 0; i < startDay; i++) {
    html += '<div class="calendar-day empty"></div>';
  }
  
  // Dni miesiąca
  const today = new Date().toISOString().split('T')[0];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = beerHistory[dateStr] || 0;
    
    monthTotal += count;
    if (count > 0) daysWithBeer++;
    
    let levelClass = 'level-0';
    if (count >= 1 && count <= 2) levelClass = 'level-1';
    else if (count >= 3 && count <= 4) levelClass = 'level-2';
    else if (count >= 5 && count <= 6) levelClass = 'level-3';
    else if (count >= 7) levelClass = 'level-4';
    
    const isToday = dateStr === today ? 'today' : '';
    
    html += `
      <div class="calendar-day ${levelClass} ${isToday}" title="${dateStr}: ${count} piw">
        <span class="day-number">${day}</span>
        ${count > 0 ? `<span class="day-count">${count}</span>` : ''}
      </div>
    `;
  }
  
  calendarDays.innerHTML = html;
  
  // Podsumowanie miesiąca
  const avgPerDay = daysWithBeer > 0 ? (monthTotal / daysInMonth).toFixed(1) : 0;
  monthSummary.innerHTML = `
    <p>Łącznie: <strong>${monthTotal} 🍺</strong></p>
    <p>Dni z piwem: <strong>${daysWithBeer}</strong> / ${daysInMonth}</p>
    <p>Średnio dziennie: <strong>${avgPerDay}</strong></p>
  `;
}

function exportToCSV() {
  let csv = 'Data,Ilość piw\n';
  
  // Sortuj daty
  const sortedDates = Object.keys(beerHistory).sort();
  
  for (const date of sortedDates) {
    csv += `${date},${beerHistory[date]}\n`;
  }
  
  // Pobierz plik
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `piwa_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  
  showToast('Eksportowano do CSV!');
}

function showToast(message) {
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