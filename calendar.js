const calendarGrid = document.getElementById('calendarGrid');
const monthLabel = document.getElementById('monthLabel');
const eventList = document.getElementById('eventList');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const detailModal = document.getElementById('eventDetailModal');
const detailModalTitle = document.getElementById('eventDetailTitle');
const detailModalBody = document.getElementById('eventDetailBody');
const detailModalClose = document.getElementById('eventDetailClose');

const events = Array.isArray(window.specialEvents) ? window.specialEvents : [];
let currentDate = new Date();
currentDate.setDate(1);
let selectedDateKey = null;

function getEventText(event, field) {
  return window.getLocalizedEventText
    ? window.getLocalizedEventText(event, field)
    : event[field];
}

function escapeCalendarText(value) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function formatCalendarDate(date) {
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
}

function createCalendarFile(upcomingEvents) {
  const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const calendarEvents = upcomingEvents.map((event) => {
    const startDate = new Date(`${event.date}T00:00:00`);
    const uid = `${event.date}-${encodeURIComponent(event.title || 'event')}@lukes-cardshop.com`;
    const timeMatch = String(event.time || '').match(/(\d{1,2}):(\d{2})\s*-\s*(\d{1,2}):(\d{2})/);
    let dateLines;

    if (timeMatch) {
      const [, startHour, startMinute, endHour, endMinute] = timeMatch;
      dateLines = [
        `DTSTART:${formatCalendarDate(startDate)}T${startHour.padStart(2, '0')}${startMinute}00`,
        `DTEND:${formatCalendarDate(startDate)}T${endHour.padStart(2, '0')}${endMinute}00`
      ];
    } else {
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 1);
      dateLines = [
        `DTSTART;VALUE=DATE:${formatCalendarDate(startDate)}`,
        `DTEND;VALUE=DATE:${formatCalendarDate(endDate)}`
      ];
    }

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      ...dateLines,
      `SUMMARY:${escapeCalendarText(getEventText(event, 'title'))}`,
      `DESCRIPTION:${escapeCalendarText(getEventText(event, 'description'))}`,
      `LOCATION:${escapeCalendarText(getEventText(event, 'location'))}`,
      'END:VEVENT'
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Luke Cardshop//Event Calendar//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    ...calendarEvents,
    'END:VCALENDAR',
    ''
  ].join('\r\n');
}

function downloadCalendar(event) {
  const calendarFile = new Blob([createCalendarFile([event])], {
    type: 'text/calendar;charset=utf-8'
  });
  const downloadLink = document.createElement('a');
  downloadLink.href = URL.createObjectURL(calendarFile);
  const safeTitle = String(event.title || 'event')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-|-$/g, '');
  downloadLink.download = `${event.date}-${safeTitle || 'event'}.ics`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  setTimeout(() => URL.revokeObjectURL(downloadLink.href), 1000);
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function normalizeCategory(kind) {
  const value = String(kind || 'special').trim().toLowerCase();
  if (value === 'turnier' || value === 'tournament') return 'turnier';
  if (value === 'sale' || value === 'angebot') return 'sale';
  return 'special';
}

function getCategoryLabel(kind) {
  const category = normalizeCategory(kind);
  const labelMap = {
    special: window.t('calendar.special'),
    turnier: window.t('calendar.tournament'),
    sale: window.t('calendar.sale')
  };
  return labelMap[category] || window.t('calendar.event');
}

function getEventsForDate(dateKey) {
  return events.filter((event) => event.date === dateKey);
}

function openDetailModal(dateKey) {
  const items = getEventsForDate(dateKey);
  if (!items.length || !detailModal) return;
  selectedDateKey = dateKey;

  const formattedDate = new Date(`${dateKey}T00:00:00`);
  const locale = window.siteLanguage === 'en' ? 'en-GB' : 'de-DE';
  detailModalTitle.textContent = new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(formattedDate);

  detailModalBody.innerHTML = items
    .map((event) => {
      const category = normalizeCategory(event.category || event.kind || 'special');
      const eventIndex = events.indexOf(event);
      const location = getEventText(event, 'location')
        ? `<p><strong>${window.t('calendar.location')}</strong> ${getEventText(event, 'location')}</p>`
        : '';
      const time = event.time
        ? `<p><strong>${window.t('calendar.time')}</strong> ${event.time}</p>`
        : '';
      return `
        <article class="event-detail-item category-${category}">
          <span class="event-badge category-${category}">${getCategoryLabel(event.category || event.kind || 'special')}</span>
          <h4>${getEventText(event, 'title')}</h4>
          ${time}
          ${location}
          <p>${getEventText(event, 'description')}</p>
          <button class="btn calendar-download" type="button" data-event-index="${eventIndex}">${window.t('calendar.downloadEvent')}</button>
        </article>
      `;
    })
    .join('');

  detailModal.hidden = false;
}

function closeDetailModal() {
  if (detailModal) detailModal.hidden = true;
}

function renderEvents(dateKey) {
  const items = getEventsForDate(dateKey);

  if (!items.length) {
    eventList.innerHTML = `
      <li class="event-empty">${window.t('calendar.empty')}</li>
    `;
    return;
  }

  eventList.innerHTML = items
    .map((event) => {
      const category = normalizeCategory(event.category || event.kind || 'special');
      const timeMarkup = event.time ? `<span class="event-time">${event.time}</span>` : '';
      return `
        <li class="event-item category-${category}">
          <div class="event-item-head">
            <strong>${getEventText(event, 'title')}</strong>
            <span class="event-badge category-${category}">${getCategoryLabel(event.category || event.kind || 'special')}</span>
          </div>
          ${timeMarkup}
          <span>${getEventText(event, 'description')}</span>
        </li>
      `;
    })
    .join('');
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  monthLabel.textContent = new Intl.DateTimeFormat(window.siteLanguage === 'en' ? 'en-GB' : 'de-DE', {
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
      ${dayItems.length ? `<span class="day-dot" aria-label="${window.t('calendar.event')}"></span>` : ''}
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
      openDetailModal(dateKey);
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

if (prevMonthBtn) {
  prevMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendar();
  });
}

if (nextMonthBtn) {
  nextMonthBtn.addEventListener('click', () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendar();
  });
}

if (detailModalClose) {
  detailModalClose.addEventListener('click', closeDetailModal);
}

if (detailModalBody) {
  detailModalBody.addEventListener('click', (event) => {
    const downloadButton = event.target.closest('.calendar-download');
    if (!downloadButton) return;

    const eventIndex = Number(downloadButton.dataset.eventIndex);
    const selectedEvent = events[eventIndex];
    if (selectedEvent) downloadCalendar(selectedEvent);
  });
}

if (detailModal) {
  detailModal.addEventListener('click', (event) => {
    if (event.target === detailModal) closeDetailModal();
  });
}

document.addEventListener('languagechange', () => {
  renderCalendar();
  if (selectedDateKey && detailModal && !detailModal.hidden) {
    openDetailModal(selectedDateKey);
  }
});

renderCalendar();
