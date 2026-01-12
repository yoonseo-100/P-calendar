(function () {
    'use strict';

    var DEFAULT_SETTINGS = {
        targetSelector: '.circleTable',
        menuId: 'pie-menu',
        hours: 24,
        baseWidthPercent: 90,
        intervalMs: 1000,
    };

    function getSettings() {
        var fromGlobal = window.__P_CLOCK_SETTINGS__;
        if (!fromGlobal || typeof fromGlobal !== 'object') return DEFAULT_SETTINGS;

        var hours = Number.parseInt(String(fromGlobal.hours ?? ''), 10);
        if (Number.isNaN(hours) || hours < 1 || hours > 48) hours = DEFAULT_SETTINGS.hours;

        var intervalMs = Number.parseInt(String(fromGlobal.intervalMs ?? ''), 10);
        if (Number.isNaN(intervalMs) || intervalMs < 100 || intervalMs > 60_000) intervalMs = DEFAULT_SETTINGS.intervalMs;

        var baseWidthPercent = Number(fromGlobal.baseWidthPercent);
        if (Number.isNaN(baseWidthPercent) || baseWidthPercent <= 0 || baseWidthPercent > 100) {
            baseWidthPercent = DEFAULT_SETTINGS.baseWidthPercent;
        }

        return {
            targetSelector:
                typeof fromGlobal.targetSelector === 'string' ? fromGlobal.targetSelector : DEFAULT_SETTINGS.targetSelector,
            menuId: typeof fromGlobal.menuId === 'string' ? fromGlobal.menuId : DEFAULT_SETTINGS.menuId,
            hours: hours,
            baseWidthPercent: baseWidthPercent,
            intervalMs: intervalMs,
        };
    }

    function createHourData(hours) {
        return Array.from({ length: hours }, function (_, i) {
            return String(i);
        });
    }

    function createPieMenu() {
        var settings = getSettings();
        var container = document.querySelector(settings.targetSelector);
        if (!container) return;

        // Prevent duplicates if script runs twice.
        if (document.getElementById(settings.menuId)) return;

        var data = [createHourData(settings.hours)];

        var pieMenu = document.createElement('div');
        pieMenu.id = settings.menuId;
        pieMenu.classList.add('pie-outer');

        // 너비가 화면 높이보다 크면, 픽셀 기준으로 화면 높이의 90%에 맞춘 퍼센트로 설정
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var widthPercentage = settings.baseWidthPercent;
        if (vw > vh) {
            widthPercentage = (vh * 0.9 / vw) * 100; // viewport 너비 대비 퍼센트 값
        }
        var widthDelta = widthPercentage / data.length;

        for (var i = 0; i < data.length; i++) {
            var dataItem = data[i];
            var numSegments = dataItem.length;
            var segmentAngle = (Math.PI * 2) / numSegments;
            var skewAngle = Math.PI / 2 - segmentAngle;

            var pie = document.createElement('div');
            pie.classList.add('pie');

            pie.style.width = widthPercentage + '%';

            // pie.style.transform = `translate(-50%,-50%) rotate(${pieRotateAngle}rad)`;
            pie.style.transform = 'translate(-50%,-50%) rotate(90deg)';

            var pieList = document.createElement('ul');

            for (var j = 0; j < dataItem.length; j++) {
                var rotationAngle = segmentAngle * j;
                var dataContent = dataItem[j];
                var pieListItem = document.createElement('li');
                var pieItemAnchor = document.createElement('a');
                var pieItemDeco1 = document.createElement('div');
                pieItemDeco1.className = 'deco1';
                var pieItemDeco2 = document.createElement('div');
                pieItemDeco2.className = 'deco2';

                pieListItem.style.transform = 'rotate(' + rotationAngle + 'rad) skew(' + skewAngle + 'rad)';

                pieItemAnchor.appendChild(document.createTextNode(dataContent));
                var anchorRotate = segmentAngle / 2 - Math.PI / 2;
                var anchorSkew = segmentAngle - Math.PI / 2;
                pieItemAnchor.style.transform = 'skew(' + anchorSkew + 'rad) rotate(' + anchorRotate + 'rad)';

                pieListItem.appendChild(pieItemAnchor);
                pieItemAnchor.appendChild(pieItemDeco1);
                pieItemAnchor.appendChild(pieItemDeco2);
                pieList.appendChild(pieListItem);
            }
            pie.appendChild(pieList);
            pieMenu.appendChild(pie);
            widthPercentage -= widthDelta;
        }

        // 추가: 시침/분침 요소 생성 및 중앙 도트
        var hands = document.createElement('div');
        hands.className = 'hands';

        var hourHand = document.createElement('div');
        hourHand.className = 'hour-hand';

        var minuteHand = document.createElement('div');
        minuteHand.className = 'minute-hand';

        var centerDot = document.createElement('div');
        centerDot.className = 'center-dot';

        hands.appendChild(hourHand);
        hands.appendChild(minuteHand);
        pieMenu.appendChild(hands);
        pieMenu.appendChild(centerDot);

        container.appendChild(pieMenu);

        // 시계 업데이트 시작
        function updateClock() {
            var now = new Date();
            var hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
            var minutes = now.getMinutes() + now.getSeconds() / 60;

            var hourDeg = (hours / 24) * 360;
            var minuteDeg = (minutes / 60) * 360;

            hourHand.style.transform = 'rotate(' + hourDeg + 'deg)';
            minuteHand.style.transform = 'rotate(' + minuteDeg + 'deg)';

            // 0시부터 현재 시간 이전까지 li에 'style-past' 클래스 추가
            var currentHour = now.getHours();
            var hourLis = document.querySelectorAll('.pie:first-child li');
            hourLis.forEach(function (li, index) {
                if (index < currentHour) {
                    li.classList.add('style-past');
                } else {
                    li.classList.remove('style-past');
                }
            });
        }

        updateClock();
        // 매 초 업데이트 (부드러운 움직임 유지)
        setInterval(updateClock, settings.intervalMs);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createPieMenu);
    } else {
        createPieMenu();
    }
})();