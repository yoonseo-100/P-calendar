(function () {
    'use strict';

    var SETTINGS_KEY = '__p_calendar_settings__';

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
        } catch (e) {
            return null;
        }
    }

    function readSettings() {
        var raw = null;
        try {
            raw = localStorage.getItem(SETTINGS_KEY);
        } catch (e) {
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
        try {
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
            return true;
        } catch (e) {
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
        var weekStartSelect = document.getElementById('weekStartSelect');
        var showWeatherToggle = document.getElementById('showWeatherToggle');

        var weekdayWakeTime = document.getElementById('weekdayWakeTime');
        var weekdaySleepTime = document.getElementById('weekdaySleepTime');
        var weekendSleepSeparate = document.getElementById('weekendSleepSeparate');
        var weekendSleepSection = document.getElementById('weekendSleepSection');
        var weekendWakeTime = document.getElementById('weekendWakeTime');
        var weekendSleepTime = document.getElementById('weekendSleepTime');

        var saveBtn = document.querySelector('.settingsPrimary');
        var resetBtn = document.querySelector('.settingsBtn.danger');

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
                    alert('설정이 저장되었습니다.');
                } else {
                    alert('저장에 실패했습니다. 브라우저 설정을 확인해주세요.');
                }
            });
        }

        if (resetBtn) {
            resetBtn.addEventListener('click', function () {
                var sure = confirm('로컬에 저장된 설정값을 초기화할까요?');
                if (!sure) return;
                try {
                    localStorage.removeItem(SETTINGS_KEY);
                } catch (e) {
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
