
    let data = [
        Array.from(Array(24).keys()).map(String),
    ];

    function getRandomHTMLColor() {
        var r = 255 * Math.random() | 0,
            g = 255 * Math.random() | 0,
            b = 255 * Math.random() | 0;
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    function createPieMenu() {
        let pieMenu = document.createElement("div");
        pieMenu.id = "pie-menu"
        pieMenu.classList.add("pie-outer");

        // 너비가 화면 높이보다 크면, 픽셀 기준으로 화면 높이의 90%에 맞춘 퍼센트로 설정
        let vw = window.innerWidth;
        let vh = window.innerHeight;
        let widthPercentage = 90;
        if (vw > vh) {
            widthPercentage = (vh * 0.9 / vw) * 100; // viewport 너비 대비 퍼센트 값
        }
        let widthDelta = widthPercentage / data.length;

        for (let i = 0; i < data.length; i++) {
            let dataItem = data[i];
            let numSegments = dataItem.length;
            let segmentAngle = (Math.PI * 2) / numSegments;
            let skewAngle = (Math.PI / 2) - segmentAngle;

            let pie = document.createElement("div");
            let pieRotateAngle = (Math.PI / 2) - segmentAngle / 2;
            pie.classList.add("pie");

            pie.style.width = `${widthPercentage}%`;

            // pie.style.transform = `translate(-50%,-50%) rotate(${pieRotateAngle}rad)`;
            pie.style.transform = `translate(-50%,-50%) rotate(90deg)`;

            let pieList = document.createElement("ul");

            for (let j = 0; j < dataItem.length; j++) {
                let rotationAngle = segmentAngle * j;
                let dataContent = dataItem[j];
                let pieListItem = document.createElement('li');
                let pieItemAnchor = document.createElement('a');
                let pieItemDeco1 = document.createElement('div');
                pieItemDeco1.className = 'deco1';
                let pieItemDeco2 = document.createElement('div');
                pieItemDeco2.className = 'deco2';

                pieListItem.style.transform = `rotate(${rotationAngle}rad) skew(${skewAngle}rad)`;

                pieItemAnchor.appendChild(document.createTextNode(dataContent));
                let anchorRotate = segmentAngle / 2 - Math.PI / 2;
                let anchorSkew = segmentAngle - Math.PI / 2;
                pieItemAnchor.style.transform = `skew(${anchorSkew}rad) rotate(${anchorRotate}rad)`;

                pieListItem.appendChild(pieItemAnchor);
                pieItemAnchor.appendChild(pieItemDeco1);
                pieItemAnchor.appendChild(pieItemDeco2);
                pieList.appendChild(pieListItem)
            }
            pie.appendChild(pieList);
            pieMenu.appendChild(pie);
            widthPercentage -= widthDelta;
        }

        // 추가: 시침/분침 요소 생성 및 중앙 도트
        let hands = document.createElement('div');
        hands.className = 'hands';

        let hourHand = document.createElement('div');
        hourHand.className = 'hour-hand';

        let minuteHand = document.createElement('div');
        minuteHand.className = 'minute-hand';

        let centerDot = document.createElement('div');
        centerDot.className = 'center-dot';

        hands.appendChild(hourHand);
        hands.appendChild(minuteHand);
        pieMenu.appendChild(hands);
        pieMenu.appendChild(centerDot);

        document.querySelector(".circleTable").appendChild(pieMenu);

        // 시계 업데이트 시작
        function updateClock() {
            let now = new Date();
            let hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
            let minutes = now.getMinutes() + now.getSeconds() / 60;

            let hourDeg = (hours / 24) * 360;
            let minuteDeg = (minutes / 60) * 360;

            hourHand.style.transform = `rotate(${hourDeg}deg)`;
            minuteHand.style.transform = `rotate(${minuteDeg}deg)`;

            // 0시부터 현재 시간 이전까지 li에 'style-past' 클래스 추가
            let currentHour = now.getHours();
            let hourLis = document.querySelectorAll('.pie:first-child li');
            hourLis.forEach((li, index) => {
                if (index < currentHour) {
                    li.classList.add('style-past');
                } else {
                    li.classList.remove('style-past');
                }
            });
        }      updateClock();
        // 매 초 업데이트 (부드러운 움직임 유지)
        setInterval(updateClock, 1000);
    }

    createPieMenu();