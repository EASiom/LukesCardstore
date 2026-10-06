const calendarGrid = document.getElementById('calendarGrid');
const monthLabel = document.getElementById('monthLabel');
const eventList = document.getElementById('eventList');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

const events = Array.isArray(window.specialEvents) ? window.specialEvents : [];
let currentDate = new Date();
currentDate.setDate(1);

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getEventsForDate(dateKey) {
  return events.filter((event) => event.date === dateKey);
}

function renderEvents(dateKey) {
  const items = getEventsForDate(dateKey);

  if (!items.length) {
    eventList.innerHTML = `
      <li class="event-empty">Keine besonderen Events an diesem Tag.</li>
    `;
    return;
  }

  eventList.innerHTML = items
    .map(
      (event) => `
        <li class="event-item ${event.kind || 'special'}">
          <strong>${event.title}</strong>
          <span>${event.description}</span>
        </li>
      `
    )
    .join('');
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthLabel.textContent = new Intl.DateTimeFormat('de-DE', {
    month: 'long',
    year: 'numeric'
  }).format(new Date(year, month, 1));

  calendarGrid.innerHTML = '';

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startWeekday = firstDay.getDay();
  const leadingEmpty = (startWeekday + 6) % 7;
  const totalDays = lastDay.getDate();

  for (let i = 0; i < leadingEmpty; i += 1) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day empty';
    calendarGrid.appendChild(emptyCell);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    const cell = document.createElement('button');
    const date = new Date(year, month, day);
    const dateKey = formatDateKey(date);
    const dayItems = getEventsForDate(dateKey);

    cell.type = 'button';
    cell.className = 'calendar-day';
    cell.dataset.date = dateKey;
    cell.innerHTML = `
      <span class="day-number">${day}</span>
      ${dayItems.length ? '<span class="day-dot" aria-label="Event"></span>' : ''}
    `;

    if (dayItems.length) {
      cell.classList.add('has-event');
    }

    const isToday = formatDateKey(new Date()) === dateKey;
    if (isToday) {
      cell.classList.add('today');
    }

    cell.addEventListener('click', () => {
      document.querySelectorAll('.calendar-day').forEach((d) => d.classList.remove('selected'));
      cell.classList.add('selected');
      renderEvents(dateKey);
    });

    calendarGrid.appendChild(cell);
  }

  const firstVisibleKey = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const firstEventDate = getEventsForDate(firstVisibleKey);

  if (firstEventDate.length) {
    const firstDate = firstEventDate[0].date;
    renderEvents(firstDate);
  } else {
    const todayKey = formatDateKey(new Date(year, month, 1));
    renderEvents(todayKey);
  }
}

prevMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

renderCalendar();
