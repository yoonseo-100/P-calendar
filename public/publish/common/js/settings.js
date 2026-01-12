(function () {
    'use strict';

    var DEFAULT_UI = {
        storageKey: '__p_calendar_settings__',
        selectors: {
            weekStartSelectId: 'weekStartSelect',
            showWeatherToggleId: 'showWeatherToggle',
            weekdayWakeTimeId: 'weekdayWakeTime',
            weekdaySleepTimeId: 'weekdaySleepTime',
            weekendSleepSeparateId: 'weekendSleepSeparate',
            weekendSleepSectionId: 'weekendSleepSection',
            weekendWakeTimeId: 'weekendWakeTime',
            weekendSleepTimeId: 'weekendSleepTime',
            saveButtonSelector: '.settingsPrimary',
            resetButtonSelector: '.settingsBtn.danger',
        },
        strings: {
            saved: '설정이 저장되었습니다.',
            saveFailed: '저장에 실패했습니다. 브라우저 설정을 확인해주세요.',
            resetConfirm: '로컬에 저장된 설정값을 초기화할까요?',
        },
    };

    function getUiSettings() {
        var fromGlobal = window.__P_SETTINGS_UI__;
        if (!fromGlobal || typeof fromGlobal !== 'object') return DEFAULT_UI;

        var s = {
            storageKey:
                typeof fromGlobal.storageKey === 'string' ? fromGlobal.storageKey : DEFAULT_UI.storageKey,
            selectors: {
                weekStartSelectId:
                    typeof (fromGlobal.selectors || {}).weekStartSelectId === 'string'
                        ? fromGlobal.selectors.weekStartSelectId
                        : DEFAULT_UI.selectors.weekStartSelectId,
                showWeatherToggleId:
                    typeof (fromGlobal.selectors || {}).showWeatherToggleId === 'string'
                        ? fromGlobal.selectors.showWeatherToggleId
                        : DEFAULT_UI.selectors.showWeatherToggleId,
                weekdayWakeTimeId:
                    typeof (fromGlobal.selectors || {}).weekdayWakeTimeId === 'string'
                        ? fromGlobal.selectors.weekdayWakeTimeId
                        : DEFAULT_UI.selectors.weekdayWakeTimeId,
                weekdaySleepTimeId:
                    typeof (fromGlobal.selectors || {}).weekdaySleepTimeId === 'string'
                        ? fromGlobal.selectors.weekdaySleepTimeId
                        : DEFAULT_UI.selectors.weekdaySleepTimeId,
                weekendSleepSeparateId:
                    typeof (fromGlobal.selectors || {}).weekendSleepSeparateId === 'string'
                        ? fromGlobal.selectors.weekendSleepSeparateId
                        : DEFAULT_UI.selectors.weekendSleepSeparateId,
                weekendSleepSectionId:
                    typeof (fromGlobal.selectors || {}).weekendSleepSectionId === 'string'
                        ? fromGlobal.selectors.weekendSleepSectionId
                        : DEFAULT_UI.selectors.weekendSleepSectionId,
                weekendWakeTimeId:
                    typeof (fromGlobal.selectors || {}).weekendWakeTimeId === 'string'
                        ? fromGlobal.selectors.weekendWakeTimeId
                        : DEFAULT_UI.selectors.weekendWakeTimeId,
                weekendSleepTimeId:
                    typeof (fromGlobal.selectors || {}).weekendSleepTimeId === 'string'
                        ? fromGlobal.selectors.weekendSleepTimeId
                        : DEFAULT_UI.selectors.weekendSleepTimeId,
                saveButtonSelector:
                    typeof (fromGlobal.selectors || {}).saveButtonSelector === 'string'
                        ? fromGlobal.selectors.saveButtonSelector
                        : DEFAULT_UI.selectors.saveButtonSelector,
                resetButtonSelector:
                    typeof (fromGlobal.selectors || {}).resetButtonSelector === 'string'
                        ? fromGlobal.selectors.resetButtonSelector
                        : DEFAULT_UI.selectors.resetButtonSelector,
            },
            strings: {
                saved: typeof (fromGlobal.strings || {}).saved === 'string' ? fromGlobal.strings.saved : DEFAULT_UI.strings.saved,
                saveFailed:
                    typeof (fromGlobal.strings || {}).saveFailed === 'string'
                        ? fromGlobal.strings.saveFailed
                        : DEFAULT_UI.strings.saveFailed,
                resetConfirm:
                    typeof (fromGlobal.strings || {}).resetConfirm === 'string'
                        ? fromGlobal.strings.resetConfirm
                        : DEFAULT_UI.strings.resetConfirm,
            },
        };

        return s;
    }

    var DEFAULT_SETTINGS = {
        calendar: {
            weekStart: 'MON',
            showWeather: true,
        },
        sleep: {
            weekday: { wake: '07:00', sleep: '23:00' },
            weekendEnabled: false,
            weekend: { wake: '09:00', sleep: '00:00' },
        },
    };

    function safeParse(jsonString) {
        try {
            return JSON.parse(jsonString);
        } catch {
            return null;
        }
    }

    function readSettings() {
        var ui = getUiSettings();
        var SETTINGS_KEY = ui.storageKey;
        var raw = null;
        try {
            raw = localStorage.getItem(SETTINGS_KEY);
        } catch {
            raw = null;
        }

        var parsed = raw ? safeParse(raw) : null;
        var s = {
            calendar: {
                weekStart: DEFAULT_SETTINGS.calendar.weekStart,
                showWeather: DEFAULT_SETTINGS.calendar.showWeather,
            },
            sleep: {
                weekday: {
                    wake: DEFAULT_SETTINGS.sleep.weekday.wake,
                    sleep: DEFAULT_SETTINGS.sleep.weekday.sleep,
                },
                weekendEnabled: DEFAULT_SETTINGS.sleep.weekendEnabled,
                weekend: {
                    wake: DEFAULT_SETTINGS.sleep.weekend.wake,
                    sleep: DEFAULT_SETTINGS.sleep.weekend.sleep,
                },
            },
        };

        if (parsed && typeof parsed === 'object') {
            if (parsed.calendar) {
                if (parsed.calendar.weekStart === 'SUN' || parsed.calendar.weekStart === 'MON') {
                    s.calendar.weekStart = parsed.calendar.weekStart;
                }
                if (typeof parsed.calendar.showWeather === 'boolean') {
                    s.calendar.showWeather = parsed.calendar.showWeather;
                }
            }

            if (parsed.sleep) {
                if (parsed.sleep.weekday) {
                    if (typeof parsed.sleep.weekday.wake === 'string') s.sleep.weekday.wake = parsed.sleep.weekday.wake;
                    if (typeof parsed.sleep.weekday.sleep === 'string') s.sleep.weekday.sleep = parsed.sleep.weekday.sleep;
                }
                if (typeof parsed.sleep.weekendEnabled === 'boolean') s.sleep.weekendEnabled = parsed.sleep.weekendEnabled;
                if (parsed.sleep.weekend) {
                    if (typeof parsed.sleep.weekend.wake === 'string') s.sleep.weekend.wake = parsed.sleep.weekend.wake;
                    if (typeof parsed.sleep.weekend.sleep === 'string') s.sleep.weekend.sleep = parsed.sleep.weekend.sleep;
                }
            }
        }

        return s;
    }

    function writeSettings(settings) {
        var ui = getUiSettings();
        var SETTINGS_KEY = ui.storageKey;
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch {
            return false;
        }
    }

    function setWeekendEnabled(sectionEl, wakeInput, sleepInput, isEnabled) {
        if (wakeInput) wakeInput.disabled = !isEnabled;
        if (sleepInput) sleepInput.disabled = !isEnabled;
        if (!sectionEl) return;
        if (isEnabled) {
            sectionEl.classList.remove('is-disabled');
        } else {
            sectionEl.classList.add('is-disabled');
        }
    }

    function init() {
        var ui = getUiSettings();
        var sel = ui.selectors;

        var weekStartSelect = document.getElementById(sel.weekStartSelectId);
        var showWeatherToggle = document.getElementById(sel.showWeatherToggleId);

        var weekdayWakeTime = document.getElementById(sel.weekdayWakeTimeId);
        var weekdaySleepTime = document.getElementById(sel.weekdaySleepTimeId);
        var weekendSleepSeparate = document.getElementById(sel.weekendSleepSeparateId);
        var weekendSleepSection = document.getElementById(sel.weekendSleepSectionId);
        var weekendWakeTime = document.getElementById(sel.weekendWakeTimeId);
        var weekendSleepTime = document.getElementById(sel.weekendSleepTimeId);

        var saveBtn = document.querySelector(sel.saveButtonSelector);
        var resetBtn = document.querySelector(sel.resetButtonSelector);

        if (!weekStartSelect || !showWeatherToggle || !weekdayWakeTime || !weekdaySleepTime || !weekendSleepSeparate || !weekendSleepSection || !weekendWakeTime || !weekendSleepTime) {
            return;
        }

        var settings = readSettings();

        weekStartSelect.value = settings.calendar.weekStart;
        showWeatherToggle.checked = !!settings.calendar.showWeather;

        weekdayWakeTime.value = settings.sleep.weekday.wake;
        weekdaySleepTime.value = settings.sleep.weekday.sleep;
        weekendSleepSeparate.checked = !!settings.sleep.weekendEnabled;
        weekendWakeTime.value = settings.sleep.weekend.wake;
        weekendSleepTime.value = settings.sleep.weekend.sleep;
        setWeekendEnabled(weekendSleepSection, weekendWakeTime, weekendSleepTime, weekendSleepSeparate.checked);

        weekendSleepSeparate.addEventListener('change', function () {
            setWeekendEnabled(weekendSleepSection, weekendWakeTime, weekendSleepTime, weekendSleepSeparate.checked);
        });

        function collect() {
            return {
                calendar: {
                    weekStart: weekStartSelect.value === 'SUN' ? 'SUN' : 'MON',
                    showWeather: !!showWeatherToggle.checked,
                },
                sleep: {
                    weekday: {
                        wake: weekdayWakeTime.value || DEFAULT_SETTINGS.sleep.weekday.wake,
                        sleep: weekdaySleepTime.value || DEFAULT_SETTINGS.sleep.weekday.sleep,
                    },
                    weekendEnabled: !!weekendSleepSeparate.checked,
                    weekend: {
                        wake: weekendWakeTime.value || DEFAULT_SETTINGS.sleep.weekend.wake,
                        sleep: weekendSleepTime.value || DEFAULT_SETTINGS.sleep.weekend.sleep,
                    },
                },
            };
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', function () {
                var next = collect();
                var ok = writeSettings(next);
                if (ok) {
                    alert(ui.strings.saved);
                } else {
                    alert(ui.strings.saveFailed);
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                var sure = confirm(ui.strings.resetConfirm);
                if (!sure) return;
                try {
                    localStorage.removeItem(ui.storageKey);
                } catch {
                    // ignore
                }
                location.reload();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
