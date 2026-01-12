(function () {
    'use strict';

    var DEFAULT_SETTINGS = {
        schedulesKey: '__p_calendar_schedules__',
        undatedKey: '__undated__',
        selectors: {
            daysId: 'memoDays',
        },
        strings: {
            empty: '표시할 일정이 없어요',
            undated: '날짜 미정',
            fallbackTitle: '일정',
            unsetTimePrefix: '미지정',
        },
        locale: 'ko',
        dayNames: ['일', '월', '화', '수', '목', '금', '토'],
    };

    function getSettings() {
        var fromGlobal = window.__P_MEMO_SETTINGS__;
        if (!fromGlobal || typeof fromGlobal !== 'object') return DEFAULT_SETTINGS;

        return {
            schedulesKey: typeof fromGlobal.schedulesKey === 'string' ? fromGlobal.schedulesKey : DEFAULT_SETTINGS.schedulesKey,
            undatedKey: typeof fromGlobal.undatedKey === 'string' ? fromGlobal.undatedKey : DEFAULT_SETTINGS.undatedKey,
            selectors: {
                daysId:
                    typeof (fromGlobal.selectors || {}).daysId === 'string'
                        ? fromGlobal.selectors.daysId
                        : DEFAULT_SETTINGS.selectors.daysId,
            },
            strings: {
                empty: typeof (fromGlobal.strings || {}).empty === 'string' ? fromGlobal.strings.empty : DEFAULT_SETTINGS.strings.empty,
                undated:
                    typeof (fromGlobal.strings || {}).undated === 'string' ? fromGlobal.strings.undated : DEFAULT_SETTINGS.strings.undated,
                fallbackTitle:
                    typeof (fromGlobal.strings || {}).fallbackTitle === 'string'
                        ? fromGlobal.strings.fallbackTitle
                        : DEFAULT_SETTINGS.strings.fallbackTitle,
                unsetTimePrefix:
                    typeof (fromGlobal.strings || {}).unsetTimePrefix === 'string'
                        ? fromGlobal.strings.unsetTimePrefix
                        : DEFAULT_SETTINGS.strings.unsetTimePrefix,
            },
            locale: typeof fromGlobal.locale === 'string' ? fromGlobal.locale : DEFAULT_SETTINGS.locale,
            dayNames: Array.isArray(fromGlobal.dayNames) && fromGlobal.dayNames.length === 7 ? fromGlobal.dayNames : DEFAULT_SETTINGS.dayNames,
        };
    }

    function pad2(n) {
        return String(n ?? '').padStart(2, '0');
    }

    function parseDateKey(key) {
        var parts = String(key || '')
            .split('-')
            .map(function (v) {
                return parseInt(v, 10);
            });
        if (parts.length !== 3 || parts.some(function (n) { return Number.isNaN(n); })) return null;
        var d = new Date(parts[0], parts[1] - 1, parts[2]);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    function compareDateKeys(a, b) {
        var da = parseDateKey(a);
        var db = parseDateKey(b);
        if (!da && !db) return String(a).localeCompare(String(b));
        if (!da) return 1;
        if (!db) return -1;
        return da.getTime() - db.getTime();
    }

    function toHour(value) {
        var s = String(value || '').trim();
        if (!s) return null;
        var m = s.match(/\d{1,2}/);
        if (!m) return null;
        var n = parseInt(m[0], 10);
        return Number.isNaN(n) ? null : n;
    }

    function safeLoadAll() {
        var settings = getSettings();
        try {
            var raw = localStorage.getItem(settings.schedulesKey);
            if (!raw) return null;
            var parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return parsed;
        } catch {
            return null;
        }
    }

    function safeSaveAll(obj) {
        var settings = getSettings();
        try {
            localStorage.setItem(settings.schedulesKey, JSON.stringify(obj || {}));
        } catch {
            // ignore
        }
    }

    // NOTE: This app used to seed random demo schedules.
    // We now show only real persisted schedules to avoid dummy values.

    function formatDateLabel(dateKey, date) {
        var settings = getSettings();
        if (String(dateKey || '') === String(settings.undatedKey)) return settings.strings.undated;

        var yy = String(date.getFullYear()).slice(-2);
        var mm = pad2(date.getMonth() + 1);
        var dd = pad2(date.getDate());
        var kor = (settings.dayNames || DEFAULT_SETTINGS.dayNames)[date.getDay()];
        return yy + '/' + mm + '/' + dd + ' ' + kor + '요일';
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replaceAll('&', '&amp;')
            .replaceAll('<', '&lt;')
            .replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;')
            .replaceAll("'", '&#39;');
    }

    function buildItemText(schedule) {
        var settings = getSettings();
        var title = String(schedule?.type ?? '').trim();
        if (!title) title = settings.strings.fallbackTitle;

        var startH = toHour(schedule?.time?.start);
        var endH = toHour(schedule?.time?.end);

        if (startH == null || endH == null) {
            return settings.strings.unsetTimePrefix + ' ' + title;
        }

        return pad2(startH) + ':00~' + pad2(endH) + ':00 ' + title;
    }

    function sortForChecklist(a, b) {
        var aStart = toHour(a?.time?.start);
        var bStart = toHour(b?.time?.start);
        var aHas = aStart != null;
        var bHas = bStart != null;

        if (aHas !== bHas) return aHas ? -1 : 1;
        if (aHas && bHas && aStart !== bStart) return aStart - bStart;
        return String(a?.type || '').localeCompare(String(b?.type || ''), 'ko');
    }

    function init() {
        var settings = getSettings();
        var daysEl = document.getElementById(settings.selectors.daysId);
        if (!daysEl) return;

        function renderAll() {
            var all = safeLoadAll() || {};
            var keys = Object.keys(all || {}).filter(function (k) {
                return Array.isArray(all[k]) && all[k].length > 0;
            });
            keys.sort(compareDateKeys);

            if (!keys.length) {
                daysEl.innerHTML = '<div class="memoEmpty">' + escapeHtml(settings.strings.empty) + '</div>';
                return;
            }

            daysEl.innerHTML = keys
                .map(function (dateKey) {
                    var d = parseDateKey(dateKey);
                    var label = d ? formatDateLabel(dateKey, d) : String(dateKey);
                    var list = Array.isArray(all[dateKey]) ? all[dateKey].slice() : [];
                    list.sort(sortForChecklist);

                    var itemsHtml = list
                        .map(function (s) {
                            var id = String(s?.id || '');
                            var checked = s?.isDone ? 'checked' : '';
                            var text = escapeHtml(buildItemText(s));
                            var inputId = 'memoTodo_' + dateKey.replace(/[^0-9]/g, '') + '_' + id;
                            return (
                                '<li>' +
                                '<input type="checkbox" id="' + inputId + '" data-date="' + dateKey + '" data-id="' + id + '" ' + checked + ' />' +
                                '<label for="' + inputId + '"><h4 class="text">' + text + '</h4></label>' +
                                '</li>'
                            );
                        })
                        .join('');

                    return (
                        '<div class="todoList memoDay" data-date="' + dateKey + '">' +
                        '<div class="headBox"><div class="date"><h2><b>' + escapeHtml(label) + '</b></h2></div></div>' +
                        '<div class="contBox"><ul>' + itemsHtml + '</ul></div>' +
                        '</div>'
                    );
                })
                .join('');
        }

        daysEl.addEventListener('change', function (e) {
            var input = e.target;
            if (!input || input.tagName !== 'INPUT' || input.type !== 'checkbox') return;

            var dateKey = input.getAttribute('data-date');
            var id = input.getAttribute('data-id');
            if (!dateKey || !id) return;

            var all = safeLoadAll() || {};
            var list = Array.isArray(all[dateKey]) ? all[dateKey] : null;
            if (!list) return;

            var found = list.find(function (s) {
                return String(s?.id) === String(id);
            });
            if (!found) return;

            found.isDone = !!input.checked;
            safeSaveAll(all);
        });

        renderAll();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
