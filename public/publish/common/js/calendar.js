
// Configuration
const WEEK_START = 'MON'; // Change to 'SUN' for Sunday start
const CURRENT_DATE = new Date();
CURRENT_DATE.setHours(0, 0, 0, 0);

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

const ADD_SCHEDULE_DEFAULT_TASKS = [
    { title: '회의 안건 정리', due: '' },
    { title: '참석자 확인/연락', due: '' },
    { title: '관련 자료 수집', due: '' },
    { title: '리마인드 알림 설정', due: '' },
    { title: '결과 공유/정리', due: '' },
];

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

function parseTaskDueToDateKeyAndTime(dueString) {
    const s = String(dueString || '').trim();
    if (!s) return null;

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

    const year = CURRENT_DATE.getFullYear();
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

const DETAIL_START_HOUR = 7;
const DETAIL_END_HOUR = 24;
const DETAIL_ROW_HEIGHT = 22;

function toHour(value) {
    const s = String(value || '').trim();
    if (!s) return null;
    const m = s.match(/\d{1,2}/);
    if (!m) return null;
    const n = parseInt(m[0], 10);
    return Number.isNaN(n) ? null : n;
}

function buildTimetableHTML() {
    let html = '<div class="timetable">';
    for (let h = DETAIL_START_HOUR; h <= DETAIL_END_HOUR; h++) {
        html += `<div class="time" data-hour="${h}">${h}:00</div>`;
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
    const MAX_VISIBLE_LANES = 2;
    let html = `<div class="scheduleGrid" style="--row-h:${DETAIL_ROW_HEIGHT}px; --rows:${rows}; --more-w:${MORE_WIDTH}px; --max-visible-lanes:${MAX_VISIBLE_LANES}">`;

    // grid lines
    for (let h = DETAIL_START_HOUR; h <= DETAIL_END_HOUR; h++) {
        html += `<div class="gridRow" data-hour="${h}"></div>`;
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
            <div class="moreBlock" style="--top:${top}px; --height:${height}px" title="더보기">
                <span class="plus">${label}</span>
            </div>
        `;
    });

    html += '</div>';
    return html;
}

function renderDetailForDate(dateKey) {
    const detail = document.querySelector('.calendar + .detail') || document.querySelector('.detail');
    if (!detail) return;

    const date = parseDateKey(dateKey);
    if (!date) return;

    const schedules = scheduleByDate.get(dateKey) || [];

    const timetableHTML = buildTimetableHTML();
    const gridHTML = buildScheduleGridHTML(schedules, dateKey);

    const emptyHTML = schedules.length
        ? ''
        : '<div class="planEmpty"><h6>일정이 없어요</h6></div>';

    detail.innerHTML = `
        <div class="detailGrid" data-date="${dateKey}">
            ${timetableHTML}
            ${gridHTML}
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

// 일정 데이터
const scheduleData = {
    types: ['해커톤 멘토', '외부 미팅', '내부 회의', '프로젝트 마감', '코드 리뷰', '팀 빌딩', '클라이언트 미팅', '기술 세미나'],
    timeSlots: [
        { start: '09', end: '18' },
        { start: '10', end: '12' },
        { start: '14', end: '16' },
        { start: '15', end: '17' },
        { start: '09', end: '11' },
        { start: '13', end: '15' }
    ]
};

function generateSchedulesForDate(date) {
    const weekNumber = Math.floor(date.getDate() / 7);
    
    let schedulesPerWeek;
    if (date < CURRENT_DATE) {
        // 과거 날짜: 3~8개
        schedulesPerWeek = (Math.floor(Math.random() * 6) + 3)*0;
    } else if (date.toDateString() === CURRENT_DATE.toDateString()) {
        // 오늘: 3~8개
        schedulesPerWeek = (Math.floor(Math.random() * 6) + 3 )*0;
    } else {
        // 미래 날짜 (type-yet): 0개 70%, 1~2개 30%
        schedulesPerWeek = (Math.random() < 0.9 ? 0 : Math.floor(Math.random() * 2) + 1)*0;
    }
    
    let schedules = [];
    for (let i = 0; i < schedulesPerWeek; i++) {
        const typeIdx = Math.floor(Math.random() * scheduleData.types.length);
        const timeIdx = Math.floor(Math.random() * scheduleData.timeSlots.length);
        const isDone = Math.random() > 0.4;
        
        schedules.push({
            type: scheduleData.types[typeIdx],
            time: scheduleData.timeSlots[timeIdx],
            isDone: isDone
        });
    }
    return schedules;
}

function createPlanHTML(dateKeyOrSchedules, maybeSchedules) {
    const dateKey = Array.isArray(dateKeyOrSchedules) ? '' : (dateKeyOrSchedules || '');
    const schedules = Array.isArray(dateKeyOrSchedules) ? dateKeyOrSchedules : (maybeSchedules || []);
    let html = '';
    (schedules || []).forEach((schedule) => {
        const doneClass = schedule.isDone ? ' type-done' : '';
        const start = String(schedule?.time?.start ?? '').padStart(2, '0');
        const end = String(schedule?.time?.end ?? '').padStart(2, '0');
        const title = String(schedule?.type ?? '').trim();
        html += `
        <div class="planItem${doneClass}" data-date="${dateKey || ''}" data-id="${schedule?.id || ''}">
            <div class="time">
                <span>${start}<br>~${end}</span>
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
    
    const schedules = ensureScheduleMeta(dateKey, generateSchedulesForDate(cellDate));
    const planHTML = createPlanHTML(dateKey, schedules);

    // cache for detail panel
    scheduleByDate.set(dateKey, schedules);
    const weather = `${Math.floor(Math.random() * 5) - 5}-${Math.floor(Math.random() * 10) + 5}˚`;
    weatherByDate.set(dateKey, weather);
    
    cell.innerHTML = `
    <div class="topic">
    <h5>${day}</h5>
    <h6 class="cont-weather">${weather}</h6>
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
        overlay.classList.add('is-open');
    };

    const closePopup = (overlay) => {
        if (!overlay) return;
        overlay.classList.remove('is-open');
    };

    const planAddBtn = document.getElementById('planADD');
    if (planAddBtn) {
        planAddBtn.addEventListener('click', () => openPopup('addSchedulePopup'));
    }

    const addOverlay = document.getElementById('addSchedulePopup');
    const detailOverlay = document.getElementById('detailSchedulePopup');
    const deleteOverlay = document.getElementById('deleteConfirmPopup');

    const addName = document.getElementById('scheduleName');
    const addDate = document.getElementById('scheduleDate');
    const addStart = document.getElementById('scheduleStart');
    const addEnd = document.getElementById('scheduleEnd');

    const addNameOptions = document.getElementById('scheduleNameOptions');
    const relatedTasksTable = document.getElementById('relatedTasksTable');
    const detailName = document.getElementById('detailName');
    const detailDate = document.getElementById('detailDate');
    const detailStart = document.getElementById('detailStart');
    const detailEnd = document.getElementById('detailEnd');

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
            setRelatedTasks(ADD_SCHEDULE_DEFAULT_TASKS);
        }
    };
    const detailDone = document.getElementById('detailDone');

        planAddBtn.addEventListener('click', () => {
            const selectedDateKey = document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');
            if (addDate && selectedDateKey) addDate.value = dateKeyToISO(selectedDateKey);
            rebuildAddNameOptions();
            setRelatedTasks(ADD_SCHEDULE_DEFAULT_TASKS);
            openPopup('addSchedulePopup');
        });


    if (addName) {
        addName.addEventListener('input', refreshAddFormByName);
        addName.addEventListener('change', refreshAddFormByName);
        addName.addEventListener('blur', refreshAddFormByName);
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

        open_bot('detailSchedulePopup');
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

    // Add schedule (demo/in-memory)
    if (addOverlay) {
        const addConfirm = addOverlay.querySelector('.btn-confirm');
        if (addConfirm) {
            addConfirm.addEventListener('click', () => {
                const iso = addDate?.value || '';
                const dateKey = isoToDateKey(iso) || document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');
                if (!dateKey) return;

                const type = String(addName?.value || '').trim() || '새 일정';
                const start = timeInputToHourString(addStart?.value) || '09';
                const end = timeInputToHourString(addEnd?.value) || '10';

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
                    time: { start, end },
                    isDone: false,
                    relatedTasks,
                });

                // Create checked related tasks as separate schedules as well.
                (relatedTasks || []).forEach((task) => {
                    const taskTitle = String(task?.title ?? '').trim();
                    if (!taskTitle) return;

                    const due = parseTaskDueToDateKeyAndTime(task?.due);
                    const targetDateKey = due?.dateKey || dateKey;
                    const tStart = due?.start || start;
                    const tEnd = due?.end || end;

                    appendScheduleToDate(targetDateKey, {
                        id: `s${scheduleSequence++}`,
                        type: taskTitle,
                        time: { start: tStart, end: tEnd },
                        isDone: false,
                        parentScheduleId: newSchedule?.id || null,
                    });
                });

                const selected = document.querySelector('#calendarContainer .calSell.is-selected')?.getAttribute('data-date');
                touchedDateKeys.forEach((k) => updateCalendarCellPlan(k));
                if (selected && touchedDateKeys.has(selected)) renderDetailForDate(selected);

                if (addName) addName.value = '';
                if (addStart) addStart.value = '';
                if (addEnd) addEnd.value = '';
                setRelatedTasks(ADD_SCHEDULE_DEFAULT_TASKS);
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
                const nextStart = timeInputToHourString(detailStart?.value) || pad2(toHour(schedule?.time?.start) ?? '');
                const nextEnd = timeInputToHourString(detailEnd?.value) || pad2(toHour(schedule?.time?.end) ?? '');
                const nextDone = !!detailDone?.checked;

                schedule.type = nextType;
                schedule.time = schedule.time || {};
                schedule.time.start = nextStart;
                schedule.time.end = nextEnd;
                schedule.isDone = nextDone;

                if (nextDateKey !== oldDateKey) {
                    const oldList = (scheduleByDate.get(oldDateKey) || []).filter((s) => String(s?.id) !== String(scheduleId));
                    scheduleByDate.set(oldDateKey, oldList);

                    const newList = ensureScheduleMeta(nextDateKey, (scheduleByDate.get(nextDateKey) || []).slice());
                    schedule.dateKey = nextDateKey;
                    newList.push(schedule);
                    scheduleByDate.set(nextDateKey, newList);

                    updateCalendarCellPlan(oldDateKey);
                    updateCalendarCellPlan(nextDateKey);
                    selectCalendarCell(nextDateKey);
                    renderDetailForDate(nextDateKey);
                    detailOverlay.dataset.dateKey = nextDateKey;
                } else {
                    updateCalendarCellPlan(oldDateKey);
                    renderDetailForDate(oldDateKey);
                }

                closePopup(detailOverlay);
            });
        }

        const deleteBtn = detailOverlay.querySelector('.btn-delete');
        if (deleteBtn && deleteOverlay) {
            deleteBtn.addEventListener('click', () => {
                deleteOverlay.dataset.dateKey = detailOverlay.dataset.dateKey || '';
                deleteOverlay.dataset.scheduleId = detailOverlay.dataset.scheduleId || '';
                open_bot('deleteConfirmPopup');
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
                renderDetailForDate(dateKey);

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
        document.querySelectorAll('.popup-overlay.is-open').forEach(closePopup);
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    generateCalendar();
    setupPopupToggles();
});