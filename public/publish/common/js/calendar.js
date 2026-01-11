
// Configuration
const APP_SETTINGS_KEY = '__p_calendar_settings__';
const APP_SCHEDULES_KEY = '__p_calendar_schedules__';
const OPENAI_API_KEY_STORAGE = '__p_calendar_openai_api_key__';
const RECENT_SCHEDULE_NAMES_KEY = '__p_calendar_recent_schedule_names__';
const UNDATED_DATE_KEY = '__undated__';

function readAppSettings() {
    try {
        return JSON.parse(localStorage.getItem(APP_SETTINGS_KEY) || '{}') || {};
    } catch {
        return {};
    }
}

const APP_SETTINGS = readAppSettings();
const WEEK_START = APP_SETTINGS?.calendar?.weekStart === 'SUN' ? 'SUN' : 'MON';
const SHOW_WEATHER = APP_SETTINGS?.calendar?.showWeather !== false;
const CURRENT_DATE = new Date();
CURRENT_DATE.setHours(0, 0, 0, 0);

function loadSchedulesFromStorage() {
    try {
        const raw = localStorage.getItem(APP_SCHEDULES_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return;

        let maxId = 0;

        Object.keys(parsed).forEach((dateKey) => {
            const list = parsed[dateKey];
            if (!Array.isArray(list)) return;
            const prepared = ensureScheduleMeta(dateKey, list);
            scheduleByDate.set(dateKey, prepared);

            prepared.forEach((s) => {
                const m = String(s?.id || '').match(/^s(\d+)$/);
                if (m) {
                    const n = parseInt(m[1], 10);
                    if (!Number.isNaN(n)) maxId = Math.max(maxId, n);
                }
            });
        });

        if (maxId > 0) scheduleSequence = Math.max(scheduleSequence, maxId + 1);
    } catch {
        // ignore corrupted storage
    }
}

function saveSchedulesToStorage() {
    try {
        const obj = {};
        for (const [dateKey, list] of scheduleByDate.entries()) {
            if (!dateKey) continue;
            if (!Array.isArray(list) || !list.length) continue;
            obj[dateKey] = list;
        }
        localStorage.setItem(APP_SCHEDULES_KEY, JSON.stringify(obj));
    } catch {
        // ignore quota / storage errors
    }
}

// Cache for stable per-day content
const scheduleByDate = new Map();
const weatherByDate = new Map();

let scheduleSequence = 1;

function pad2(n) {
    return String(n ?? '').padStart(2, '0');
}

function dateKeyToISO(dateKey) {
    const d = parseDateKey(dateKey);
    if (!d) return '';
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function isoToDateKey(iso) {
    const parts = String(iso || '').split('-').map((v) => parseInt(v, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setHours(0, 0, 0, 0);
    return getDateKey(d);
}

function hourToTimeInput(hourValue) {
    const h = toHour(hourValue);
    return h == null ? '' : `${pad2(h)}:00`;
}

function timeInputToHourString(value) {
    const h = toHour(value);
    return h == null ? '' : pad2(h);
}

function normalizeTemplateName(value) {
    return String(value || '').trim();
}

const ADD_SCHEDULE_TEMPLATES = [
    {
        name: '청창사 지원',
        // 임시 데이터: 2/9 18:00
        deadline: { month: 2, day: 9, hour: 18, minute: 0 },
        tasks: [
            { title: '사업계획서 요약본 작성', due: '2/6 18:00' },
            { title: '예산표/비용 산정', due: '2/7 18:00' },
            { title: '제출 서류 체크리스트 점검', due: '2/8 18:00' },
            { title: '온라인 제출/최종 검수', due: '2/9 17:30' },
            { title: '접수번호/확인메일 저장', due: '' },
        ],
    },
    {
        name: '창성기 지원',
        // 임시 데이터: 1/23 18:00
        deadline: { month: 1, day: 23, hour: 18, minute: 0 },
        tasks: [
            { title: '아이템/시장 조사 정리', due: '1/20 18:00' },
            { title: '발표자료(피치덱) 초안', due: '1/21 18:00' },
            { title: '서류 양식 작성/첨부 준비', due: '1/22 18:00' },
            { title: '최종 제출/검수', due: '1/23 17:30' },
            { title: '심사 일정 캘린더 등록', due: '' },
        ],
    },
];

// Default related-task suggestions were removed to avoid showing dummy values.
const ADD_SCHEDULE_DEFAULT_TASKS = [];

function getTemplateByName(value) {
    const name = normalizeTemplateName(value);
    return ADD_SCHEDULE_TEMPLATES.find((t) => t.name === name) || null;
}

function templateDeadlineToISO(template) {
    const year = CURRENT_DATE.getFullYear();
    const iso = `${year}-${pad2(template.deadline.month)}-${pad2(template.deadline.day)}`;
    const end = `${pad2(template.deadline.hour)}:${pad2(template.deadline.minute)}`;
    const startHour = Math.max(0, template.deadline.hour - 1);
    const start = `${pad2(startHour)}:${pad2(template.deadline.minute)}`;
    return { iso, start, end };
}

function buildRelatedTasksRows(tasks) {
    const safeTasks = (tasks || []).slice(0, 12);
    return safeTasks
        .map((t, idx) => {
            const title = String(t?.title ?? '').trim();
            const due = String(t?.due ?? '').trim();
            return `
                <tr>
                    <td class="col-check"><input type="checkbox" data-task-index="${idx}" /></td>
                    <td>${title}</td>
                    <td class="col-due">${due || '-'}</td>
                </tr>
            `;
        })
        .join('');
}

function buildPlainTasksRows(tasks) {
    const safeTasks = (tasks || []).slice(0, 12);
    return safeTasks
        .map((t) => {
            const title = String(t?.title ?? '').trim();
            const due = String(t?.due ?? '').trim();
            return `
                <tr>
                    <td>${title}</td>
                    <td class="col-due">${due || '-'}</td>
                </tr>
            `;
        })
        .join('');
}

function parseTaskDueToDateKeyAndTime(dueString, baseDateKey) {
    const s = String(dueString || '').trim();
    if (!s) return null;

    const baseDate = baseDateKey && baseDateKey !== UNDATED_DATE_KEY ? parseDateKey(baseDateKey) : null;

    const rel = s.match(/^D\s*(?:([+-])\s*)?(\d+)(?:\s+(\d{1,2})\s*:\s*(\d{2}))?$/i);
    if (rel && baseDate) {
        const sign = rel[1] === '-' ? -1 : 1;
        const days = parseInt(rel[2], 10);
        const hour = rel[3] != null ? parseInt(rel[3], 10) : 9;
        const minute = rel[4] != null ? parseInt(rel[4], 10) : 0;
        if ([days, hour, minute].some((n) => Number.isNaN(n))) return null;
        if (hour < 0 || hour > 23) return null;
        if (minute < 0 || minute > 59) return null;

        const date = new Date(baseDate);
        date.setDate(date.getDate() + sign * days);
        date.setHours(0, 0, 0, 0);

        let endHour = hour + (minute > 0 ? 1 : 0);
        endHour = Math.max(0, Math.min(endHour, 24));
        const startHour = Math.max(0, endHour - 1);

        return {
            dateKey: getDateKey(date),
            start: pad2(startHour),
            end: pad2(endHour),
        };
    }

    // Accept formats like: "2/6 18:00", "02/06 18:00", "2/6", "2/6 9:30"
    const m = s.match(/^(\d{1,2})\s*\/\s*(\d{1,2})(?:\s+(\d{1,2})\s*:\s*(\d{2}))?$/);
    if (!m) return null;

    const month = parseInt(m[1], 10);
    const day = parseInt(m[2], 10);
    const hour = m[3] != null ? parseInt(m[3], 10) : 9;
    const minute = m[4] != null ? parseInt(m[4], 10) : 0;

    if ([month, day, hour, minute].some((n) => Number.isNaN(n))) return null;
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (hour < 0 || hour > 23) return null;
    if (minute < 0 || minute > 59) return null;

    const year = baseDate ? baseDate.getFullYear() : CURRENT_DATE.getFullYear();
    const date = new Date(year, month - 1, day);
    if (date.getMonth() !== month - 1 || date.getDate() !== day) return null;
    date.setHours(0, 0, 0, 0);

    // Calendar renders in hour-granularity. If minutes exist, round the end hour up.
    let endHour = hour + (minute > 0 ? 1 : 0);
    endHour = Math.max(0, Math.min(endHour, 24));
    const startHour = Math.max(0, endHour - 1);

    return {
        dateKey: getDateKey(date),
        start: pad2(startHour),
        end: pad2(endHour),
    };
}

function resolveTaskDueString(dueString, baseDateKey) {
    const s = String(dueString || '').trim();
    if (!s) return '';

    // If already absolute M/D, keep it as-is.
    if (/^\d{1,2}\s*\/\s*\d{1,2}/.test(s)) return s;

    // Resolve D-day relative due to absolute "M/D HH:MM" for display/storage.
    const parsed = parseTaskDueToDateKeyAndTime(s, baseDateKey);
    if (!parsed?.dateKey) return '';

    const d = parseDateKey(parsed.dateKey);
    if (!d) return '';

    const endHour = parseInt(String(parsed.end || ''), 10);
    const hh = Number.isNaN(endHour) ? 9 : Math.max(0, Math.min(endHour, 24));

    return `${d.getMonth() + 1}/${d.getDate()} ${pad2(Math.min(23, hh))}:00`;
}

function ensureScheduleMeta(dateKey, schedules) {
    (schedules || []).forEach((s) => {
        if (!s) return;
        if (!s.id) s.id = `s${scheduleSequence++}`;
        s.dateKey = dateKey;
    });
    return schedules;
}

function findScheduleById(dateKey, scheduleId) {
    if (!dateKey || !scheduleId) return null;
    const list = scheduleByDate.get(dateKey) || [];
    return list.find((s) => String(s?.id) === String(scheduleId)) || null;
}

function updateCalendarCellPlan(dateKey) {
    const container = document.getElementById('calendarContainer');
    if (!container || !dateKey) return;
    const cell = container.querySelector(`.calSell[data-date="${dateKey}"]`);
    if (!cell) return;

    const schedules = scheduleByDate.get(dateKey) || [];
    const planHTML = createPlanHTML(dateKey, schedules);
    const existingPlan = cell.querySelector('.plan');
    if (existingPlan) {
        existingPlan.outerHTML = planHTML;
    } else {
        cell.insertAdjacentHTML('beforeend', planHTML);
    }
}

function getDateKey(date) {
    return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function parseDateKey(key) {
    const parts = String(key || '').split('-').map((v) => parseInt(v, 10));
    if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setHours(0, 0, 0, 0);
    return d;
}

function isHoliday(date) {
    const day = date.getDay();
    if (WEEK_START === 'MON') return day === 0 || day === 6;
    return day === 0 || day === 6;
}

function getDayCellClass(date) {
    let className = 'calSell' + (isHoliday(date) ? ' type-holi' : '');

    if (date.toDateString() === CURRENT_DATE.toDateString()) {
        className += ' type-today';
    } else if (date < CURRENT_DATE) {
        className += ' type-back';
    } else {
        className += ' type-yet';
    }

    return className;
}

const DETAIL_START_HOUR = 0;
const DETAIL_END_HOUR = 24;
const DETAIL_ROW_HEIGHT = 22;

function parseTimeHHMM(value, fallback) {
    const s = String(value || '').trim();
    const m = s.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) return fallback;
    const h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    if (Number.isNaN(h) || Number.isNaN(min)) return fallback;
    if (h < 0 || h > 23) return fallback;
    if (min < 0 || min > 59) return fallback;
    return { h, min };
}

function getSleepSettingForDateKey(dateKey) {
    const date = parseDateKey(dateKey);
    const isWeekend = date ? date.getDay() === 0 || date.getDay() === 6 : false;

    const defaults = {
        weekday: { wake: '07:00', sleep: '23:00' },
        weekendEnabled: false,
        weekend: { wake: '09:00', sleep: '00:00' },
    };

    const raw = APP_SETTINGS?.sleep || {};
    const weekendEnabled = typeof raw.weekendEnabled === 'boolean' ? raw.weekendEnabled : defaults.weekendEnabled;
    const useWeekend = !!weekendEnabled && isWeekend;
    const src = useWeekend ? (raw.weekend || {}) : (raw.weekday || {});
    const base = useWeekend ? defaults.weekend : defaults.weekday;

    const wake = typeof src.wake === 'string' ? src.wake : base.wake;
    const sleep = typeof src.sleep === 'string' ? src.sleep : base.sleep;

    const wakeHM = parseTimeHHMM(wake, { h: 7, min: 0 });
    const sleepHM = parseTimeHHMM(sleep, { h: 23, min: 0 });
    return { wakeHM, sleepHM };
}

function isSleepHourForDateKey(hourValue, dateKey) {
    const { wakeHM, sleepHM } = getSleepSettingForDateKey(dateKey);
    const hour = ((Number(hourValue) || 0) % 24 + 24) % 24;
    const wakeH = wakeHM.h;
    const sleepH = sleepHM.h;

    if (sleepH > wakeH) {
        // Sleep: [0, wake) U [sleep, 24)
        return hour < wakeH || hour >= sleepH;
    }

    // Sleep crosses midnight: sleep is [sleep, wake)
    return hour >= sleepH && hour < wakeH;
}

function toHour(value) {
    const s = String(value || '').trim();
    if (!s) return null;
    const m = s.match(/\d{1,2}/);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    return Number.isNaN(n) ? null : n;
}

function buildTimetableHTML(dateKey) {
    let html = '<div class="timetable">';
    for (let h = DETAIL_START_HOUR; h <= DETAIL_END_HOUR; h++) {
        const sleepClass = dateKey && isSleepHourForDateKey(h, dateKey) ? ' is-sleep' : '';
        html += `<div class="time${sleepClass}" data-hour="${h}">${h}:00</div>`;
    }
    html += '</div>';
    return html;
}

function buildScheduleGridHTML(schedules, dateKey) {
    const prepared = (schedules || [])
        .map((s) => {
            const startHour = toHour(s?.time?.start);
            const endHourRaw = toHour(s?.time?.end);
            if (startHour == null || endHourRaw == null) return null;

            // normalize to [start, end)
            let endHour = endHourRaw;
            if (endHour <= startHour) endHour = startHour + 1;

            // clamp to the visible range
            const clampedStart = Math.max(DETAIL_START_HOUR, Math.min(startHour, DETAIL_END_HOUR));
            const clampedEnd = Math.max(clampedStart + 1, Math.min(endHour, DETAIL_END_HOUR + 1));
            if (clampedStart > DETAIL_END_HOUR) return null;

            return {
                raw: s,
                startHour: clampedStart,
                endHour: clampedEnd,
                lane: 0,
            };
        })
        .filter(Boolean)
        .sort((a, b) => {
            if (a.startHour !== b.startHour) return a.startHour - b.startHour;
            return b.endHour - a.endHour;
        });

    // Lane allocation for overlaps
    const lanesEnd = [];

    prepared.forEach((item) => {
        let assignedLane = -1;
        for (let i = 0; i < lanesEnd.length; i++) {
            if (lanesEnd[i] <= item.startHour) {
                assignedLane = i;
                break;
            }
        }
        if (assignedLane === -1) {
            assignedLane = lanesEnd.length;
            lanesEnd.push(item.endHour);
        } else {
            lanesEnd[assignedLane] = item.endHour;
        }
        item.lane = assignedLane;
    });

    const rows = DETAIL_END_HOUR - DETAIL_START_HOUR + 1;
    const MORE_WIDTH = 40;
    const MAX_VISIBLE_LANES = 1;
    let html = `<div class="scheduleGrid" style="--row-h:${DETAIL_ROW_HEIGHT}px; --rows:${rows}; --more-w:${MORE_WIDTH}px; --max-visible-lanes:${MAX_VISIBLE_LANES}">`;

    // grid lines
    for (let h = DETAIL_START_HOUR; h <= DETAIL_END_HOUR; h++) {
        const sleepClass = dateKey && isSleepHourForDateKey(h, dateKey) ? ' is-sleep' : '';
        html += `<div class="gridRow${sleepClass}" data-hour="${h}"></div>`;
    }

    // blocks
    prepared.forEach((item) => {
        if (item.lane >= MAX_VISIBLE_LANES) return;
        const schedule = item.raw;
        const doneClass = schedule.isDone ? ' type-done' : '';
        const start = String(schedule?.time?.start ?? '').padStart(2, '0');
        const end = String(schedule?.time?.end ?? '').padStart(2, '0');
        const title = String(schedule?.type ?? '').trim();

        const top = (item.startHour - DETAIL_START_HOUR) * DETAIL_ROW_HEIGHT;
        const height = Math.max(DETAIL_ROW_HEIGHT, (item.endHour - item.startHour) * DETAIL_ROW_HEIGHT);

        html += `
            <div class="planItem detailItem timelineItem${doneClass}" style="--top:${top}px; --height:${height}px; --lane:${item.lane}" data-date="${dateKey || ''}" data-id="${schedule?.id || ''}" data-start="${start}" data-end="${end}">
                <div class="info">
                    <h6>${title}</h6>
                    <p class="meta">${start}~${end}</p>
                </div>
            </div>
        `;
    });

    // +more blocks: merge consecutive rows where overlaps exceed MAX_VISIBLE_LANES
    const overflowByHour = [];
    for (let h = DETAIL_START_HOUR; h <= DETAIL_END_HOUR; h++) {
        let concurrent = 0;
        for (const item of prepared) {
            if (item.startHour <= h && item.endHour > h) concurrent++;
        }
        overflowByHour.push({ h, overflow: Math.max(0, concurrent - MAX_VISIBLE_LANES) });
    }

    const segments = [];
    let current = null;
    for (const row of overflowByHour) {
        if (row.overflow > 0) {
            if (!current) {
                current = { startHour: row.h, endHour: row.h + 1, maxOverflow: row.overflow };
            } else {
                current.endHour = row.h + 1;
                current.maxOverflow = Math.max(current.maxOverflow, row.overflow);
            }
        } else if (current) {
            segments.push(current);
            current = null;
        }
    }
    if (current) segments.push(current);

    segments.forEach((seg) => {
        const top = (seg.startHour - DETAIL_START_HOUR) * DETAIL_ROW_HEIGHT;
        const height = Math.max(DETAIL_ROW_HEIGHT, (seg.endHour - seg.startHour) * DETAIL_ROW_HEIGHT);
        const label = seg.maxOverflow > 1 ? `+${seg.maxOverflow}` : '+';
        html += `
            <div class="moreBlock" style="--top:${top}px; --height:${height}px" title="더보기" data-date="${dateKey || ''}" data-start-hour="${seg.startHour}" data-end-hour="${seg.endHour}">
                <span class="plus">${label}</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function buildAllDayListHTML(schedules, dateKey) {
    const items = (schedules || [])
        .filter((s) => {
            const startHour = toHour(s?.time?.start);
            const endHour = toHour(s?.time?.end);
            return startHour == null || endHour == null;
        })
        .map((s) => ({
            id: s?.id,
            title: String(s?.type ?? '').trim(),
            isDone: !!s?.isDone,
        }))
        .filter((s) => s.id && s.title);

    const listHTML = items.length
        ? items
              .map((s) => {
                  const doneClass = s.isDone ? ' type-done' : '';
                  return `
                    <button type="button" class="planItem allDayItem${doneClass}" data-date="${dateKey || ''}" data-id="${s.id}">
                        <div class="info">
                            <h6>${s.title}</h6>
                        </div>
                    </button>
                  `;
              })
              .join('')
        : '';
        // : '<div class="allDayEmpty">시간 미지정 일정이 없어요</div>';

    return `
        <div class="allDayPanel">
            <div class="allDayHeader">
                <h6>당일 일정</h6>
            </div>
            <div class="allDayList">${listHTML}</div>
        </div>
    `;
}

function buildUndatedListHTML() {
    const schedules = scheduleByDate.get(UNDATED_DATE_KEY) || [];
    const items = (schedules || [])
        .map((s) => ({
            id: s?.id,
            title: String(s?.type ?? '').trim(),
            isDone: !!s?.isDone,
        }))
        .filter((s) => s.id && s.title);

    const listHTML = items.length
        ? items
              .map((s) => {
                  const doneClass = s.isDone ? ' type-done' : '';
                  return `
                    <button type="button" class="planItem allDayItem${doneClass}" data-date="${UNDATED_DATE_KEY}" data-id="${s.id}">
                        <div class="info">
                            <h6>${s.title}</h6>
                        </div>
                    </button>
                  `;
              })
              .join('')
        : '';

    return `
        <div class="allDayPanel" id="undatedPanel">
            <div class="allDayHeader">
                <h6>날짜 미정</h6>
            </div>
            <div class="allDayList">${listHTML}</div>
        </div>
    `;
}

function renderUndatedPanel() {
    const host = document.getElementById('undatedPanelHost');
    if (!host) return;
    host.innerHTML = buildUndatedListHTML();
}

function renderDetailForDate(dateKey) {
    const detail = document.querySelector('.calendar + .detail') || document.querySelector('.detail');
    if (!detail) return;

    const date = parseDateKey(dateKey);
    if (!date) return;

    const schedules = scheduleByDate.get(dateKey) || [];

    const timetableHTML = buildTimetableHTML(dateKey);
    const gridHTML = buildScheduleGridHTML(schedules, dateKey);
    const allDayHTML = buildAllDayListHTML(schedules, dateKey);
    const undatedHTML = buildUndatedListHTML();

    const emptyHTML = schedules.length
        ? ''
        : '';
        // : '<div class="planEmpty"><h6>일정이 없어요</h6></div>';

    detail.innerHTML = `
        <div class="detailGrid" data-date="${dateKey}">
            ${timetableHTML}
            <div class="detailBody">
                ${gridHTML}
                ${allDayHTML}
                <div id="undatedPanelHost">${undatedHTML}</div>
            </div>
        </div>
        ${emptyHTML}
    `;
}

                // <div class="topic">
                //     <h5>${date.getDate()}</h5>
                //     <h6 class="cont-weather">${weather}</h6>
                // </div>
function selectCalendarCell(dateKey) {
    const container = document.getElementById('calendarContainer');
    if (!container) return;

    container.querySelectorAll('.calSell.is-selected').forEach((el) => el.classList.remove('is-selected'));
    const target = container.querySelector(`[data-date="${dateKey}"]`);
    if (target) target.classList.add('is-selected');
}

function setupDetailInteractions() {
    const container = document.getElementById('calendarContainer');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const cell = e.target.closest('.calSell[data-date]');
        if (!cell || !container.contains(cell)) return;

        const dateKey = cell.getAttribute('data-date');
        if (!dateKey) return;

        selectCalendarCell(dateKey);
        renderDetailForDate(dateKey);
    });
}

// Generate calendar
function generateCalendar() {
const container = document.getElementById('calendarContainer');
const startDate = new Date(CURRENT_DATE);
startDate.setMonth(CURRENT_DATE.getMonth() - 2);
const startMonth = startDate.getMonth();
const startYear = startDate.getFullYear();
const monthsToGenerate = 6; // Oct, Nov, Dec 2025 + Jan, Feb, Mar 2026

// Header row
const headerRow = createHeaderRow();
container.appendChild(headerRow);

// Generate calendar rows
let currentRow = null;
let cellCount = 0;

for (let m = 0; m < monthsToGenerate; m++) {
const month = (startMonth + m) % 12;
const year = startYear + Math.floor((startMonth + m) / 12);

// Add month title
const monthTitle = document.createElement('div');
monthTitle.className = 'calRow type-month-title';
monthTitle.innerHTML = `<h4>${year}년 ${month + 1}월</h4>`;
monthTitle.setAttribute('data-month', `${year}-${month + 1}`);
// container.appendChild(monthTitle);

const result = generateMonthRows(container, year, month, currentRow, cellCount);
currentRow = result.currentRow;
cellCount = result.cellCount;
}

// Append remaining row if exists and fill to 7 cells
if (currentRow && cellCount > 0) {
while (cellCount < 7) {
const emptyCell = document.createElement('div');
emptyCell.className = 'calSell';
currentRow.appendChild(emptyCell);
cellCount++;
}
container.appendChild(currentRow);
}

// Scroll to current week
scrollToCurrentWeek();
// Setup sticky header
setupStickyHeader();

// Detail default: today
const todayKey = getDateKey(CURRENT_DATE);
selectCalendarCell(todayKey);
renderDetailForDate(todayKey);
setupDetailInteractions();
}

function createHeaderRow() {
const row = document.createElement('div');
row.className = 'calRow type-head';

const days = WEEK_START === 'MON' 
? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const korDays = WEEK_START === 'MON'
? ['월', '화', '수', '목', '금', '토', '일']
: ['일', '월', '화', '수', '목', '금', '토'];

days.forEach((day, idx) => {
const cell = document.createElement('div');
cell.className = 'calSell' + (idx >= 5 ? ' type-holi' : '');
cell.innerHTML = `
<div class="topic">
<h5>${day}</h5>
<h6>${korDays[idx]}</h6>
</div>
`;
row.appendChild(cell);
});

return row;
}

// NOTE: This app used to generate random demo schedules/weather.
// We now render only persisted schedules (localStorage) to avoid showing dummy values.

function createPlanHTML(dateKeyOrSchedules, maybeSchedules) {
    const dateKey = Array.isArray(dateKeyOrSchedules) ? '' : (dateKeyOrSchedules || '');
    const schedules = Array.isArray(dateKeyOrSchedules) ? dateKeyOrSchedules : (maybeSchedules || []);
    let html = '';
    (schedules || []).forEach((schedule) => {
        const doneClass = schedule.isDone ? ' type-done' : '';
        const startRaw = schedule?.time?.start;
        const endRaw = schedule?.time?.end;
        const hasTime = toHour(startRaw) != null && toHour(endRaw) != null;
        // Calendar cells should not show time-unset items ("미지정").
        // Those are rendered separately in the detail panel's "당일 일정" list.
        if (!hasTime) return;
        const start = hasTime ? String(startRaw).padStart(2, '0') : '';
        const end = hasTime ? String(endRaw).padStart(2, '0') : '';
        const title = String(schedule?.type ?? '').trim();

        const timeHTML = hasTime
            ? `<span>${start}<br>~${end}</span>`
            : `<span>미지정</span>`;
        html += `
        <div class="planItem${doneClass}" data-date="${dateKey || ''}" data-id="${schedule?.id || ''}">
            <div class="time">
                ${timeHTML}
            </div>
            <div class="info">
                <h6>${title}</h6>
            </div>
        </div>
        `;
    });
    return `<div class="plan">${html}</div>`;
}

// generateMonthRows 함수 수정
function generateMonthRows(container, year, month, currentRow, cellCount) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startOffset = WEEK_START === 'MON' 
    ? firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
    : firstDay.getDay();
    
    let dayCounter = 1;
    
    // Create new row only if no existing row
    if (!currentRow || cellCount === 0) {
    currentRow = document.createElement('div');
    currentRow.className = 'calRow type-body';
    currentRow.setAttribute('data-month', `${year}-${month + 1}`);
    cellCount = 0;
    }
    
    // Add padding for first week only if starting new row
    if (cellCount === 0) {
    for (let i = 0; i < startOffset; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calSell';
    currentRow.appendChild(emptyCell);
    cellCount++;
    }
    }
    
    // Add days of month
    for (let day = 1; day <= lastDay.getDate(); day++) {
    if (cellCount === 7) {
    container.appendChild(currentRow);
    currentRow = document.createElement('div');
    currentRow.className = 'calRow type-body';
    currentRow.setAttribute('data-month', `${year}-${month + 1}`);
    cellCount = 0;
    }
    
    const cell = document.createElement('div');
    const dayOfWeek = (startOffset + day - 1) % 7;
    const isHoliday = WEEK_START === 'MON' ? dayOfWeek >= 5 : dayOfWeek === 0 || dayOfWeek === 6;
    
    const cellDate = new Date(year, month, day);
    let className = 'calSell' + (isHoliday ? ' type-holi' : '');
    
    if (cellDate.toDateString() === CURRENT_DATE.toDateString()) {
    className += ' type-today';
    } else if (cellDate < CURRENT_DATE) {
    className += ' type-back';
    } else if (cellDate > CURRENT_DATE) {
    className += ' type-yet';
    }
    
    cell.className = className;
    const dateKey = `${year}-${month + 1}-${day}`;
    cell.setAttribute('data-date', dateKey);
    
    let schedules = scheduleByDate.get(dateKey);
    if (!Array.isArray(schedules)) {
        schedules = ensureScheduleMeta(dateKey, []);
        scheduleByDate.set(dateKey, schedules);
    } else {
        schedules = ensureScheduleMeta(dateKey, schedules);
        scheduleByDate.set(dateKey, schedules);
    }
    const planHTML = createPlanHTML(dateKey, schedules);
    // Weather is not loaded yet; avoid dummy values.
    const weatherHTML = '';
    
    cell.innerHTML = `
    <div class="topic">
    <h5>${day}</h5>
    ${weatherHTML}
    </div>
    ${planHTML}
    `;
    
    currentRow.appendChild(cell);
    cellCount++;
    }
    
    return { currentRow, cellCount };
}

function scrollToCurrentWeek() {
const dateStr = `${CURRENT_DATE.getFullYear()}-${CURRENT_DATE.getMonth() + 1}-${CURRENT_DATE.getDate()}`;
const targetCell = document.querySelector(`[data-date="${dateStr}"]`);

if (targetCell) {
const container = document.querySelector('.content');
const row = targetCell.closest('.calRow');
const offset = row.offsetTop - container.offsetTop - 118;
container.scrollTop = offset;
}
}

function setupStickyHeader() {
const contentDiv = document.querySelector('.content');
const headerRow = document.querySelector('.calRow.type-head');
const today = new Date();
const todayCell = document.querySelector(`[data-date="${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}"]`);
if (todayCell) {
    const dayOfWeek = todayCell.closest('.calRow').querySelector('.calSell').parentElement.children[Array.from(todayCell.parentElement.children).indexOf(todayCell)];
    const headerCells = document.querySelectorAll('.calRow.type-head .calSell');
    const todayDayOfWeek = today.getDay();
    const adjustedIndex = WEEK_START === 'MON' ? (todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1) : todayDayOfWeek;
    headerCells[adjustedIndex].classList.add('type-today');
}
const stickyContainer = document.createElement('div');
stickyContainer.className = 'sticky-header calendar';
stickyContainer.style.cssText = 'position: sticky; top: 0; background: white; z-index: 10; display: none;';

const stickyMonth = document.createElement('div');
stickyMonth.className = 'calRow type-month-title';
stickyMonth.innerHTML = '<h4>2025년 10월</h4>';

const stickyHeader = headerRow.cloneNode(true);
stickyHeader.className = 'calRow type-head';

stickyContainer.appendChild(stickyMonth);
stickyContainer.appendChild(stickyHeader);
contentDiv.insertBefore(stickyContainer, contentDiv.firstChild);

contentDiv.addEventListener('scroll', () => {
const offset = 100;
const rows = Array.from(document.querySelectorAll('.calRow.type-body'));

let currentMonth = '2025-10';
for (let row of rows) {
const rowTop = row.offsetTop - contentDiv.offsetTop;
if (rowTop >= contentDiv.scrollTop + offset) {
break;
}
currentMonth = row.getAttribute('data-month');
}

stickyMonth.innerHTML = `<h4>${currentMonth.split('-')[0]}년 ${currentMonth.split('-')[1]}월</h4>`;
stickyContainer.style.display = 'block';
});
}

function setupPopupToggles() {
    const openPopup = (popupId) => {
        const overlay = document.getElementById(popupId);
        if (!overlay) return;
        overlay.classList.remove('is-suspended');
        overlay.classList.add('is-open');
    };

    const closePopup = (overlay) => {
        if (!overlay) return;
        overlay.classList.remove('is-open');

        // If we opened detail from overlap list, restore it when detail closes
        if (overlay === detailOverlay && overlapOverlay && overlapOverlay.classList.contains('is-open')) {
            overlapOverlay.classList.remove('is-suspended');
        }
    };

    const planAddBtn = document.getElementById('planADD');
    if (planAddBtn) {
        planAddBtn.addEventListener('click', () => openPopup('addSchedulePopup'));
    }

    const addOverlay = document.getElementById('addSchedulePopup');
    const detailOverlay = document.getElementById('detailSchedulePopup');
    const deleteOverlay = document.getElementById('deleteConfirmPopup');
    const overlapOverlay = document.getElementById('overlapListPopup');

    const addName = document.getElementById('scheduleName');
    const addDate = document.getElementById('scheduleDate');
    const addStart = document.getElementById('scheduleStart');
    const addEnd = document.getElementById('scheduleEnd');
    const addAllDay = document.getElementById('scheduleAllDay');
    const addDateUnset = document.getElementById('scheduleDateUnset');

    const addNameOptions = document.getElementById('scheduleNameOptions');
    const relatedTasksTable = document.getElementById('relatedTasksTable');
    const taskSuggestBtn = document.getElementById('taskSuggestBtn');
    const taskSuggestBox = addOverlay ? addOverlay.querySelector('.taskSuggest') : null;

    const detailTaskSuggestBox = detailOverlay ? detailOverlay.querySelector('#detailTaskSuggest') : null;
    const detailTaskSuggestBtn = document.getElementById('detailTaskSuggestBtn');
    const detailRelatedTasksTable = document.getElementById('detailRelatedTasksTable');
    const detailName = document.getElementById('detailName');
    const detailDate = document.getElementById('detailDate');
    const detailStart = document.getElementById('detailStart');
    const detailEnd = document.getElementById('detailEnd');

    const applyAddDateTimeToggleState = () => {
        const isUndated = !!addDateUnset?.checked;
        const isAllDay = !!addAllDay?.checked;

        if (addDate) {
            addDate.disabled = isUndated;
            if (isUndated) addDate.value = '';
        }

        if (addAllDay) {
            addAllDay.disabled = isUndated;
            if (isUndated) addAllDay.checked = true;
        }

        const disableTime = isUndated || isAllDay;
        if (addStart) {
            addStart.disabled = disableTime;
            if (disableTime) addStart.value = '';
        }
        if (addEnd) {
            addEnd.disabled = disableTime;
            if (disableTime) addEnd.value = '';
        }
    };

    const collapseTaskSuggest = () => {
        if (!taskSuggestBox) return;
        taskSuggestBox.classList.add('is-collapsed');
    };

    const expandTaskSuggest = () => {
        if (!taskSuggestBox) return;
        taskSuggestBox.classList.remove('is-collapsed');
    };

    const collapseDetailTaskSuggest = () => {
        if (!detailTaskSuggestBox) return;
        detailTaskSuggestBox.classList.add('is-collapsed');
    };

    const expandDetailTaskSuggest = () => {
        if (!detailTaskSuggestBox) return;
        detailTaskSuggestBox.classList.remove('is-collapsed');
    };

    const rebuildAddNameOptions = () => {
        if (!addNameOptions) return;
        const names = new Set();
        ADD_SCHEDULE_TEMPLATES.forEach((t) => names.add(t.name));
        for (const list of scheduleByDate.values()) {
            (list || []).forEach((s) => {
                const n = String(s?.type ?? '').trim();
                if (n) names.add(n);
            });
        }
        const finalNames = Array.from(names).slice(0, 30);
        addNameOptions.innerHTML = finalNames.map((n) => `<option value="${n}"></option>`).join('');
    };

    const setRelatedTasks = (tasks) => {
        if (!relatedTasksTable) return;
        const tbody = relatedTasksTable.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = buildRelatedTasksRows(tasks);
        if (addOverlay) addOverlay.dataset.relatedTasks = JSON.stringify(tasks || []);
    };

    const setDetailRelatedTasks = (tasks) => {
        if (!detailRelatedTasksTable) return;
        const tbody = detailRelatedTasksTable.querySelector('tbody');
        if (!tbody) return;
        tbody.innerHTML = buildPlainTasksRows(tasks);
        if (detailOverlay) detailOverlay.dataset.relatedTasks = JSON.stringify(tasks || []);
    };

    const getRecentScheduleNames = () => {
        try {
            const raw = JSON.parse(localStorage.getItem(RECENT_SCHEDULE_NAMES_KEY) || '[]');
            if (!Array.isArray(raw)) return [];
            return raw
                .map((s) => String(s || '').trim())
                .filter(Boolean)
                .slice(0, 12);
        } catch {
            return [];
        }
    };

    const pushRecentScheduleName = (name) => {
        const n = String(name || '').trim();
        if (!n) return;
        const list = getRecentScheduleNames();
        const next = [n, ...list.filter((x) => x !== n)].slice(0, 12);
        try {
            localStorage.setItem(RECENT_SCHEDULE_NAMES_KEY, JSON.stringify(next));
        } catch {
            // ignore
        }
    };

    const getOpenAIApiKey = () => {
        try {
            const fromGlobal = String(window.__P_CALENDAR_OPENAI_API_KEY__ || '').trim();
            if (fromGlobal) return fromGlobal;
            return String(localStorage.getItem(OPENAI_API_KEY_STORAGE) || '').trim();
        } catch {
            return '';
        }
    };

    const ensureOpenAIApiKey = () => {
        const existing = getOpenAIApiKey();
        if (existing) return existing;
        // NOTE: Storing API keys in the browser is not secure. For production, proxy this via a server.
        const input = window.prompt('OpenAI API Key를 입력해주세요 (브라우저에만 저장됩니다)');
        const key = String(input || '').trim();
        if (!key) return '';
        try {
            localStorage.setItem(OPENAI_API_KEY_STORAGE, key);
        } catch {
            // ignore
        }
        return key;
    };

    const parseGptTasks = (text) => {
        const raw = String(text || '').trim();
        if (!raw) return [];

        const normalizeTasks = (arr) => {
            if (!Array.isArray(arr)) return [];
            return arr
                .map((t) => ({
                    title: String(t?.title ?? '').trim(),
                    due: String(t?.due ?? '').trim(),
                }))
                .filter((t) => t.title)
                .slice(0, 10);
        };

        const tryParseJSON = (candidate) => {
            const s = String(candidate || '').trim();
            if (!s) return null;
            // Remove common JSON mistakes: trailing commas
            const cleaned = s.replace(/,\s*([}\]])/g, '$1');
            try {
                return JSON.parse(cleaned);
            } catch {
                return null;
            }
        };

        const stripCodeFences = (s) => {
            const t = String(s || '').trim();
            if (!t) return '';
            if (!t.startsWith('```')) return t;
            // Remove first ```... line and last ```
            return t
                .replace(/^```[a-zA-Z0-9_-]*\s*/m, '')
                .replace(/```\s*$/m, '')
                .trim();
        };

        const candidates = [];
        candidates.push(raw);
        candidates.push(stripCodeFences(raw));

        // If response contains an array somewhere, extract it
        const noFence = stripCodeFences(raw);
        const firstArr = noFence.indexOf('[');
        const lastArr = noFence.lastIndexOf(']');
        if (firstArr !== -1 && lastArr !== -1 && lastArr > firstArr) {
            candidates.push(noFence.slice(firstArr, lastArr + 1));
        }

        // If response contains objects per line without array wrapper
        if (noFence.includes('{') && noFence.includes('"title"') && !noFence.includes('[')) {
            const objLines = noFence
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l) => l.replace(/,$/, ''));
            if (objLines.length) {
                candidates.push('[' + objLines.join(',') + ']');
            }
        }

        for (const c of candidates) {
            const parsed = tryParseJSON(c);
            if (!parsed) continue;
            const arr = Array.isArray(parsed) ? parsed : parsed?.tasks;
            const normalized = normalizeTasks(arr);
            if (normalized.length) return normalized;
        }

        // Fallback 1: parse per-line JSON objects
        const lines = noFence
            .split(/\r?\n/)
            .map((l) => l.trim())
            .filter(Boolean);
        const lineObjects = [];
        for (const l of lines) {
            if (!l.includes('{') || !l.includes('"title"')) continue;
            const obj = tryParseJSON(l.replace(/,$/, ''));
            if (obj && typeof obj === 'object') lineObjects.push(obj);
        }
        const normalizedLineObjects = normalizeTasks(lineObjects);
        if (normalizedLineObjects.length) return normalizedLineObjects;

        // Fallback 2: plain text lines
        const plain = lines
            .map((l) => l.replace(/^\s*[-*\d.]+\s*/, '').trim())
            .filter(Boolean);
        return plain.slice(0, 10).map((l) => ({ title: l, due: '' }));
    };

    let activeSuggestAbort = null;

    const setSuggestLoading = (btn, isLoading) => {
        if (!btn) return;
        btn.disabled = !!isLoading;
        if (isLoading) {
            btn.dataset.label = btn.dataset.label || btn.textContent || '';
            btn.textContent = '추천 중...';
        } else {
            const label = btn.dataset.label;
            if (label) btn.textContent = label;
        }
    };

    const suggestTasksViaGPTFor = async (name, loadingBtn, baseDateKey) => {
        const cleanName = String(name ?? '').trim();
        if (!cleanName) return null;

        const apiKey = ensureOpenAIApiKey();
        if (!apiKey) return null;

        if (activeSuggestAbort) activeSuggestAbort.abort();
        activeSuggestAbort = new AbortController();

        const recentNames = getRecentScheduleNames().filter((n) => n !== cleanName).slice(0, 8);
        const baseKey = baseDateKey && baseDateKey !== UNDATED_DATE_KEY ? baseDateKey : null;
        const baseIso = baseKey ? dateKeyToISO(baseKey) : '';

const system =
  'You are a deterministic todo-suggestion engine for a personal calendar. ' +
  'You may suggest due dates ONLY for a small subset of todos when it is clearly necessary. ' +
  'You must NOT schedule all todos or distribute dates evenly. ' +
  'Return ONLY valid JSON with no extra text.';



const user =
  `일정명: "${cleanName}"\n` +
  (baseIso ? `일정 날짜(D-day): ${baseIso}\n` : '일정 날짜(D-day): (날짜 미정)\n') +
  '먼저 일정명의 핵심 문제 성격을 한 단어로 내부적으로 해석한다.\n' +
  '문제 성격 예시는 건강, 생활습관, 감정, 교육, 업무, 서비스 기획 등이다.\n' +
  '연관 할일은 해당 문제 성격을 반영한 관점의 대표 행동이어야 한다.\n' +
  '위 정보를 참고해서 연관 할일 7개를 제안해줘.\n' +
  '각 할일은 이 일정이 없으면 하지 않을 행동이어야 한다.\n' +
  '의미가 겹치는 할일은 하나로 묶어 제안한다.\n' +
  '각 할일은 지금 바로 체크할 수 있는 1단계 행동이어야 한다.\n' +
  '검색, 확인, 선택, 신청, 접속, 작성 같은 즉시 행동만 허용한다.\n' +
  '\n' +
  '날짜(due) 규칙:\n' +
  '- 날짜는 반드시 필요한 할일에만 최대 3개까지 제안한다.\n' +
  '- 날짜가 없는 할일은 due를 ""로 둔다.\n' +
  '- 날짜가 있는 경우에만 "D-숫자 HH:MM" 형식을 사용한다.\n' +
  '- 모든 할일에 날짜를 부여하는 것은 금지한다.\n' +
  '\n출력 형식(반드시 JSON만):\n' +
  '[{"title":"할일","due":""}]\n' +
  '- title은 12자 내외, 동사+목적어 형태\n' +
  '- 추상적인 표현 금지\n' +
  '- 일정과 직접 관련 없는 행동 금지\n' +
  '- 정확히 7개';



        setSuggestLoading(loadingBtn, true);
        try {
            const res = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    temperature: 0.7,
                    max_tokens: 400,
                    messages: [
                        { role: 'system', content: system },
                        { role: 'user', content: user },
                    ],
                }),
                signal: activeSuggestAbort.signal,
            });

            if (!res.ok) {
                // Try to surface a readable error
                let msg = '';
                try {
                    const data = await res.json();
                    msg = data?.error?.message ? String(data.error.message) : '';
                } catch {
                    // ignore
                }
                throw new Error(msg || `OpenAI 요청 실패 (HTTP ${res.status})`);
            }

            const data = await res.json();
            const content = data?.choices?.[0]?.message?.content || '';
            const tasks = parseGptTasks(content).map((t) => ({
                title: String(t?.title ?? '').trim(),
                due: resolveTaskDueString(t?.due, baseKey) || String(t?.due ?? '').trim(),
            }));
            if (tasks.length) return tasks;
            throw new Error('추천 결과를 파싱하지 못했어요');
        } finally {
            setSuggestLoading(loadingBtn, false);
        }
    };

    const suggestRelatedTasks = async () => {
        // Prefer template if exact match exists (keeps the previous UX)
        const template = getTemplateByName(addName?.value);
        if (template) {
            expandTaskSuggest();
            applyTemplateToAddForm(template);
            return;
        }

        try {
            const selectedDateKey = document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');
            const baseDateKey = addDateUnset?.checked
                ? null
                : isoToDateKey(addDate?.value) || selectedDateKey || null;
            const tasks = await suggestTasksViaGPTFor(String(addName?.value ?? '').trim(), taskSuggestBtn, baseDateKey);
            if (tasks && tasks.length) {
                expandTaskSuggest();
                setRelatedTasks(tasks);
                return;
            }
        } catch (e) {
            // If GPT fails, fall back to empty list (no dummy)
            console.warn(e);
        }

        expandTaskSuggest();
            setRelatedTasks([]);
    };

    const applyTemplateToAddForm = (template) => {
        if (!template) return;
        const { iso, start, end } = templateDeadlineToISO(template);
        if (addDate) addDate.value = iso;
        if (addStart) addStart.value = start;
        if (addEnd) addEnd.value = end;
        setRelatedTasks(template.tasks);
    };

    const refreshAddFormByName = () => {
        const template = getTemplateByName(addName?.value);
        if (template) {
            applyTemplateToAddForm(template);
        } else {
            setRelatedTasks([]);
        }
    };

    let taskSuggestTimer = null;
    let lastSuggestedSignature = '';
    let suggestingSignature = '';

    const clearTaskSuggestTimer = () => {
        if (taskSuggestTimer) {
            clearTimeout(taskSuggestTimer);
            taskSuggestTimer = null;
        }
    };

    const getAddSuggestBaseDateKey = () => {
        const selectedDateKey = document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');
        return addDateUnset?.checked ? null : isoToDateKey(addDate?.value) || selectedDateKey || null;
    };

    const getAddSuggestSignature = () => {
        const name = String(addName?.value ?? '').trim();
        const baseDateKey = getAddSuggestBaseDateKey() || '';
        const undated = addDateUnset?.checked ? 'U' : '';
        return `${name}||${undated}||${baseDateKey}`;
    };

    const runSuggestIfNeeded = async ({ force } = { force: false }) => {
        const name = String(addName?.value ?? '').trim();
        if (!name) return;

        const sig = getAddSuggestSignature();
        if (!force) {
            if (sig && sig === lastSuggestedSignature) return;
            if (sig && sig === suggestingSignature) return;
        }

        suggestingSignature = sig;
        expandTaskSuggest();
        try {
            await suggestRelatedTasks();
            lastSuggestedSignature = sig;
        } finally {
            suggestingSignature = '';
        }
    };

    const scheduleAutoTaskSuggest = () => {
        clearTaskSuggestTimer();
        taskSuggestTimer = setTimeout(() => {
            runSuggestIfNeeded({ force: false });
            clearTaskSuggestTimer();
        }, 5000);
    };

    const markTaskSuggestAction = () => {
        // Don't reset lastSuggestedSignature here; only re-suggest when signature changes.
        scheduleAutoTaskSuggest();
    };
    const detailDone = document.getElementById('detailDone');

        planAddBtn.addEventListener('click', () => {
            const selectedDateKey = document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');
            if (addDate && selectedDateKey) addDate.value = dateKeyToISO(selectedDateKey);
            if (addAllDay) addAllDay.checked = false;
            if (addDateUnset) addDateUnset.checked = false;
            applyAddDateTimeToggleState();
            rebuildAddNameOptions();
            setRelatedTasks([]);
            clearTaskSuggestTimer();
            lastSuggestedSignature = '';
            suggestingSignature = '';
            collapseTaskSuggest();
            openPopup('addSchedulePopup');
        });


    if (addName) {
        addName.addEventListener('input', markTaskSuggestAction);
        addName.addEventListener('change', markTaskSuggestAction);
        addName.addEventListener('keydown', markTaskSuggestAction);
        addName.addEventListener('paste', markTaskSuggestAction);
        addName.addEventListener('focus', () => {
            // Focus-idle UX: if user focuses and does nothing for 5s, suggest once.
            scheduleAutoTaskSuggest();
        });
        addName.addEventListener('blur', () => {
            clearTaskSuggestTimer();
            // Don't reveal / refresh suggestions just by blur.
            // If the table is already expanded (user requested), keep it in sync.
            if (taskSuggestBox && !taskSuggestBox.classList.contains('is-collapsed')) {
                refreshAddFormByName();
            }
        });
    }

    if (taskSuggestBtn) {
        taskSuggestBtn.addEventListener('click', () => {
            clearTaskSuggestTimer();
            runSuggestIfNeeded({ force: true });
        });
    }

    if (addAllDay) {
        addAllDay.addEventListener('change', () => {
            applyAddDateTimeToggleState();
            markTaskSuggestAction();
        });
    }
    if (addDateUnset) {
        addDateUnset.addEventListener('change', () => {
            applyAddDateTimeToggleState();
            markTaskSuggestAction();
        });
    }
    if (addDate) {
        addDate.addEventListener('change', markTaskSuggestAction);
        addDate.addEventListener('input', markTaskSuggestAction);
    }

    const suggestDetailRelatedTasks = async () => {
        const name = String(detailName?.value ?? '').trim();
        if (!name) return;

        try {
            const baseDateKey = isoToDateKey(detailDate?.value) || (detailOverlay?.dataset?.dateKey || null);
            const tasks = await suggestTasksViaGPTFor(name, detailTaskSuggestBtn, baseDateKey);
            if (tasks && tasks.length) {
                expandDetailTaskSuggest();
                setDetailRelatedTasks(tasks);

                // Persist into the schedule model
                const dateKey = detailOverlay?.dataset?.dateKey;
                const scheduleId = detailOverlay?.dataset?.scheduleId;
                const schedule = dateKey && scheduleId ? findScheduleById(dateKey, scheduleId) : null;
                if (schedule) {
                    schedule.relatedTasks = tasks;
                    saveSchedulesToStorage();
                }
                return;
            }
        } catch (e) {
            console.warn(e);
        }

        expandDetailTaskSuggest();
        setDetailRelatedTasks([]);
    };

    if (detailTaskSuggestBtn) {
        detailTaskSuggestBtn.addEventListener('click', () => {
            expandDetailTaskSuggest();
            suggestDetailRelatedTasks();
        });
    }
    const openDetailPopupFor = (dateKey, scheduleId) => {
        if (!detailOverlay) return;
        const schedule = findScheduleById(dateKey, scheduleId);
        if (!schedule) return;

        detailOverlay.dataset.dateKey = dateKey;
        detailOverlay.dataset.scheduleId = scheduleId;

        if (detailName) detailName.value = String(schedule?.type ?? '');
        if (detailDate) detailDate.value = dateKeyToISO(dateKey);
        if (detailStart) detailStart.value = hourToTimeInput(schedule?.time?.start);
        if (detailEnd) detailEnd.value = hourToTimeInput(schedule?.time?.end);
        if (detailDone) detailDone.checked = !!schedule?.isDone;

        // Detail task suggest: start collapsed, hydrate existing tasks (but keep hidden until user clicks)
        collapseDetailTaskSuggest();
        try {
            const tasks = Array.isArray(schedule?.relatedTasks) ? schedule.relatedTasks : [];
            setDetailRelatedTasks(tasks);
        } catch {
            setDetailRelatedTasks([]);
        }

        openPopup('detailSchedulePopup');
    };

    const formatHourLabel = (hourValue) => {
        const h = Number(hourValue);
        if (Number.isNaN(h)) return '';
        if (h >= 24) return '24:00';
        if (h < 0) return '00:00';
        return `${pad2(h)}:00`;
    };

    const openOverlapPopup = (dateKey, startHour, endHour) => {
        if (!overlapOverlay) return;
        const rangeEl = overlapOverlay.querySelector('[data-role="range"]');
        const listEl = overlapOverlay.querySelector('.overlapList');
        if (!listEl) return;

        const segStart = Number(startHour);
        const segEnd = Number(endHour);

        const schedules = scheduleByDate.get(dateKey) || [];
        const items = (schedules || [])
            .map((s) => {
                const sStartRaw = toHour(s?.time?.start);
                const sEndRaw = toHour(s?.time?.end);
                if (sStartRaw == null || sEndRaw == null) return null;

                let sEnd = sEndRaw;
                if (sEnd <= sStartRaw) sEnd = sStartRaw + 1;

                return {
                    id: s?.id,
                    title: String(s?.type ?? '').trim(),
                    start: sStartRaw,
                    end: sEnd,
                    isDone: !!s?.isDone,
                };
            })
            .filter(Boolean)
            .filter((s) => s.id && s.title && s.start < segEnd && s.end > segStart)
            .sort((a, b) => {
                if (a.start !== b.start) return a.start - b.start;
                return a.end - b.end;
            });

        if (rangeEl) {
            rangeEl.textContent = `${dateKey} · ${formatHourLabel(segStart)} ~ ${formatHourLabel(segEnd)}`;
        }

        if (!items.length) {
            listEl.innerHTML = '<li class="overlapEmpty">겹친 일정이 없어요</li>';
        } else {
            listEl.innerHTML = items
                .map((s) => {
                    const doneClass = s.isDone ? ' type-done' : '';
                    return `
                        <li>
                            <button type="button" class="overlapItem${doneClass}" data-date="${dateKey}" data-id="${s.id}">
                                <span class="title">${s.title}</span>
                                <span class="time">${pad2(s.start)}~${pad2(Math.min(24, s.end))}</span>
                            </button>
                        </li>
                    `;
                })
                .join('');
        }

        openPopup('overlapListPopup');
    };

    const extractScheduleKeyFromPlanItem = (planItem) => {
        if (!planItem) return { dateKey: null, scheduleId: null };

        const dateKey =
            planItem.getAttribute('data-date') ||
            planItem.closest('.calSell[data-date]')?.getAttribute('data-date') ||
            planItem.closest('.detailGrid[data-date]')?.getAttribute('data-date') ||
            null;

        let scheduleId = planItem.getAttribute('data-id') || null;

        if (dateKey && !scheduleId) {
            const list = scheduleByDate.get(dateKey) || [];
            const title = planItem.querySelector('.info h6')?.textContent?.trim() || '';
            let start = planItem.getAttribute('data-start') || '';
            let end = planItem.getAttribute('data-end') || '';

            if ((!start || !end) && planItem.querySelector('.time span')) {
                const txt = planItem.querySelector('.time span').innerText || '';
                const nums = txt.match(/\d{1,2}/g) || [];
                start = nums[0] ? pad2(nums[0]) : '';
                end = nums[1] ? pad2(nums[1]) : '';
            }

            const found = list.find((s) => {
                const sTitle = String(s?.type ?? '').trim();
                const sStart = pad2(toHour(s?.time?.start) ?? '');
                const sEnd = pad2(toHour(s?.time?.end) ?? '');
                return sTitle === title && (!start || sStart === start) && (!end || sEnd === end);
            });
            scheduleId = found?.id || null;
        }

        return { dateKey, scheduleId };
    };

    document.addEventListener('click', (e) => {
        const planItem = e.target.closest('.planItem');
        if (!planItem) return;
        if (planItem.closest('.popup-overlay')) return;

        const { dateKey, scheduleId } = extractScheduleKeyFromPlanItem(planItem);
        if (!dateKey || !scheduleId) return;
        openDetailPopupFor(dateKey, scheduleId);
    });

    // +more (overlaps) popup
    document.addEventListener('click', (e) => {
        const moreBlock = e.target.closest('.moreBlock');
        if (!moreBlock) return;
        if (moreBlock.closest('.popup-overlay')) return;

        const dateKey =
            moreBlock.getAttribute('data-date') ||
            moreBlock.closest('.detailGrid[data-date]')?.getAttribute('data-date') ||
            null;
        const startHour = parseInt(moreBlock.getAttribute('data-start-hour') || '', 10);
        const endHour = parseInt(moreBlock.getAttribute('data-end-hour') || '', 10);
        if (!dateKey || Number.isNaN(startHour) || Number.isNaN(endHour)) return;

        openOverlapPopup(dateKey, startHour, endHour);
    });

    if (overlapOverlay) {
        overlapOverlay.addEventListener('click', (e) => {
            const btn = e.target.closest('.overlapItem');
            if (!btn) return;
            const dateKey = btn.getAttribute('data-date');
            const scheduleId = btn.getAttribute('data-id');
            if (!dateKey || !scheduleId) return;
            // Keep the list popup alive so user can return after closing detail
            overlapOverlay.classList.add('is-suspended');
            openDetailPopupFor(dateKey, scheduleId);
        });
    }

    // Add schedule (demo/in-memory)
    if (addOverlay) {
        const addConfirm = addOverlay.querySelector('.btn-confirm');
        if (addConfirm) {
            addConfirm.addEventListener('click', () => {
                const isUndated = !!addDateUnset?.checked;
                const iso = addDate?.value || '';
                const dateKey =
                    (isUndated ? UNDATED_DATE_KEY : isoToDateKey(iso)) ||
                    (!isUndated
                        ? document
                              .querySelector('#calendarContainer .calSell.is-selected')
                              ?.getAttribute('data-date')
                        : null);
                if (!dateKey) return;

                const type = String(addName?.value || '').trim() || '새 일정';
                pushRecentScheduleName(type);
                const isAllDay = !!addAllDay?.checked || isUndated;
                const start = isAllDay ? '' : timeInputToHourString(addStart?.value);
                const end = isAllDay ? '' : timeInputToHourString(addEnd?.value);
                const hasTime = !isAllDay && !!start && !!end;
                const time = hasTime ? { start, end } : null;

                const relatedTasks = [];
                try {
                    const tasks = JSON.parse(addOverlay.dataset.relatedTasks || '[]');
                    const checks = relatedTasksTable
                        ? Array.from(relatedTasksTable.querySelectorAll('tbody input[type="checkbox"]:checked'))
                        : [];
                    checks.forEach((chk) => {
                        const idx = parseInt(chk.getAttribute('data-task-index') || '', 10);
                        if (!Number.isNaN(idx) && tasks[idx]) relatedTasks.push(tasks[idx]);
                    });
                } catch {
                    // ignore
                }

                const touchedDateKeys = new Set();

                const appendScheduleToDate = (targetDateKey, schedule) => {
                    const list = ensureScheduleMeta(targetDateKey, (scheduleByDate.get(targetDateKey) || []).slice());
                    const prepared = ensureScheduleMeta(targetDateKey, [schedule])[0];
                    list.push(prepared);
                    scheduleByDate.set(targetDateKey, list);
                    touchedDateKeys.add(targetDateKey);
                    return prepared;
                };

                const newSchedule = appendScheduleToDate(dateKey, {
                    id: `s${scheduleSequence++}`,
                    type,
                    time,
                    isDone: false,
                    relatedTasks,
                });

                // Create checked related tasks as separate schedules as well.
                (relatedTasks || []).forEach((task) => {
                    const taskTitle = String(task?.title ?? '').trim();
                    if (!taskTitle) return;

                    const due = parseTaskDueToDateKeyAndTime(task?.due, dateKey);
                    const targetDateKey = due?.dateKey || dateKey;
                    const tStart = due?.start || (hasTime ? start : null);
                    const tEnd = due?.end || (hasTime ? end : null);
                    const tHasTime = !!tStart && !!tEnd;

                    appendScheduleToDate(targetDateKey, {
                        id: `s${scheduleSequence++}`,
                        type: taskTitle,
                        time: tHasTime ? { start: tStart, end: tEnd } : null,
                        isDone: false,
                        parentScheduleId: newSchedule?.id || null,
                    });
                });

                const selected = document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');
                touchedDateKeys.forEach((k) => updateCalendarCellPlan(k));
                // Always refresh the detail for the date we just added to (if it exists in the calendar).
                if (dateKey && dateKey !== UNDATED_DATE_KEY) {
                    const container = document.getElementById('calendarContainer');
                    const exists = !!container?.querySelector(`.calSell[data-date="${dateKey}"]`);
                    if (exists) {
                        selectCalendarCell(dateKey);
                        renderDetailForDate(dateKey);
                    } else if (selected && touchedDateKeys.has(selected)) {
                        renderDetailForDate(selected);
                    }
                } else if (selected && touchedDateKeys.has(selected)) {
                    renderDetailForDate(selected);
                }
                if (touchedDateKeys.has(UNDATED_DATE_KEY)) renderUndatedPanel();

                saveSchedulesToStorage();

                if (addName) addName.value = '';
                if (addStart) addStart.value = '';
                if (addEnd) addEnd.value = '';
                if (addAllDay) addAllDay.checked = false;
                if (addDateUnset) addDateUnset.checked = false;
                applyAddDateTimeToggleState();
                setRelatedTasks([]);
                collapseTaskSuggest();
                closePopup(addOverlay);
            });
        }
    }

    // Edit schedule (demo/in-memory)
    if (detailOverlay) {
        const editConfirm = detailOverlay.querySelector('.btn-confirm');
        if (editConfirm) {
            editConfirm.addEventListener('click', () => {
                const oldDateKey = detailOverlay.dataset.dateKey;
                const scheduleId = detailOverlay.dataset.scheduleId;
                if (!oldDateKey || !scheduleId) return;

                const schedule = findScheduleById(oldDateKey, scheduleId);
                if (!schedule) return;

                const nextDateKey = isoToDateKey(detailDate?.value) || oldDateKey;
                const nextType = String(detailName?.value || '').trim() || schedule.type;
                const inputStart = timeInputToHourString(detailStart?.value);
                const inputEnd = timeInputToHourString(detailEnd?.value);
                const wantsNoTime = !inputStart || !inputEnd;
                const nextStart = wantsNoTime ? null : inputStart;
                const nextEnd = wantsNoTime ? null : inputEnd;
                const nextDone = !!detailDone?.checked;

                schedule.type = nextType;
                schedule.time = wantsNoTime ? null : { start: nextStart, end: nextEnd };
                schedule.isDone = nextDone;

                const selected = document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');

                if (nextDateKey !== oldDateKey) {
                    const oldList = (scheduleByDate.get(oldDateKey) || []).filter((s) => String(s?.id) !== String(scheduleId));
                    scheduleByDate.set(oldDateKey, oldList);

                    const newList = ensureScheduleMeta(nextDateKey, (scheduleByDate.get(nextDateKey) || []).slice());
                    schedule.dateKey = nextDateKey;
                    newList.push(schedule);
                    scheduleByDate.set(nextDateKey, newList);

                    updateCalendarCellPlan(oldDateKey);
                    updateCalendarCellPlan(nextDateKey);
                    if (oldDateKey === UNDATED_DATE_KEY || nextDateKey === UNDATED_DATE_KEY) {
                        renderUndatedPanel();
                    }
                    if (nextDateKey !== UNDATED_DATE_KEY) {
                        selectCalendarCell(nextDateKey);
                        renderDetailForDate(nextDateKey);
                    } else if (selected) {
                        renderDetailForDate(selected);
                    }
                    detailOverlay.dataset.dateKey = nextDateKey;
                } else {
                    updateCalendarCellPlan(oldDateKey);
                    if (oldDateKey === UNDATED_DATE_KEY) {
                        renderUndatedPanel();
                        if (selected) renderDetailForDate(selected);
                    } else {
                        renderDetailForDate(oldDateKey);
                    }
                }

                saveSchedulesToStorage();

                closePopup(detailOverlay);
            });
        }

        const deleteBtn = detailOverlay.querySelector('.btn-delete');
        if (deleteBtn && deleteOverlay) {
            deleteBtn.addEventListener('click', () => {
                deleteOverlay.dataset.dateKey = detailOverlay.dataset.dateKey || '';
                deleteOverlay.dataset.scheduleId = detailOverlay.dataset.scheduleId || '';
                openPopup('deleteConfirmPopup');
            });
        }
    }

    // Delete confirm
    if (deleteOverlay) {
        const dangerBtn = deleteOverlay.querySelector('.btn-confirm.btn-danger');
        if (dangerBtn) {
            dangerBtn.addEventListener('click', () => {
                const dateKey = deleteOverlay.dataset.dateKey;
                const scheduleId = deleteOverlay.dataset.scheduleId;
                if (!dateKey || !scheduleId) return;

                const list = scheduleByDate.get(dateKey) || [];
                scheduleByDate.set(
                    dateKey,
                    list.filter((s) => String(s?.id) !== String(scheduleId))
                );

                updateCalendarCellPlan(dateKey);
                if (dateKey === UNDATED_DATE_KEY) {
                    renderUndatedPanel();
                } else {
                    renderDetailForDate(dateKey);
                }

                saveSchedulesToStorage();

                closePopup(deleteOverlay);
                if (detailOverlay) closePopup(detailOverlay);
            });
        }
    }

    document.querySelectorAll('.popup-overlay').forEach((overlay) => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closePopup(overlay);
        });

        overlay.querySelectorAll('.close-btn, .btn-cancel').forEach((btn) => {
            btn.addEventListener('click', () => closePopup(overlay));
        });
    });

    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const openOverlays = Array.from(document.querySelectorAll('.popup-overlay.is-open')).filter(
            (el) => !el.classList.contains('is-suspended')
        );
        if (!openOverlays.length) return;
        closePopup(openOverlays[openOverlays.length - 1]);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    loadSchedulesFromStorage();
    generateCalendar();
    setupPopupToggles();
    saveSchedulesToStorage();
});