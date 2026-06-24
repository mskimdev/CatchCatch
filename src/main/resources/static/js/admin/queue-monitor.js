// 어드민 대시보드 - 대기열 실시간 모니터링 (카드 + 회차 리스트)
(function () {

    var DEBOUNCE_MS = 300;
    var debounceTimers = {};

    // leading-edge debounce: 첫 이벤트 즉시 실행, DEBOUNCE_MS 동안 추가 이벤트 무시
    function debounce(key, fn) {
        if (debounceTimers[key]) return;
        fn();
        debounceTimers[key] = setTimeout(function () {
            delete debounceTimers[key];
        }, DEBOUNCE_MS);
    }

    var CONGESTION_WARNING_THRESHOLD = 80;
    var CONGESTION_DANGER_THRESHOLD = 95;
    var lastLevelMap = {};
    var soldOutNotifiedSet = {};

    function congestionLevel(rate) {
        if (rate >= CONGESTION_DANGER_THRESHOLD) return 'danger';
        if (rate >= CONGESTION_WARNING_THRESHOLD) return 'warning';
        return 'normal';
    }

    function notifyIfSoldOut(key, label, availableSeatCount) {
        if (availableSeatCount === 0 && !soldOutNotifiedSet[key]) {
            soldOutNotifiedSet[key] = true;
            CcUI.toast(label + ' 좌석이 매진되었습니다.', 'warning');
        } else if (availableSeatCount > 0) {
            // 취소로 좌석이 다시 생기면 초기화
            soldOutNotifiedSet[key] = false;
        }
    }

    function notifyIfNewlyDangerous(key, label, level) {
        var prev = lastLevelMap[key];
        lastLevelMap[key] = level;
        if (level === 'danger' && prev !== 'danger') {
            CcUI.toast(label + ' 혼잡도가 위험 수준(95% 이상)입니다.', 'error');
        }
    }

    function refreshAll() {
        fetch('/admin/api/queue-stats')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var totalWaitingEl  = document.getElementById('totalWaitingCount');
                var totalEnteredEl  = document.getElementById('totalEnteredCount');
                var activeSessionEl = document.getElementById('activeSessionCount');
                var activeUserEl    = document.getElementById('activeUserCount');
                if (totalWaitingEl)  totalWaitingEl.textContent  = data.totalWaitingCount;
                if (totalEnteredEl)  totalEnteredEl.textContent  = data.totalEnteredCount;
                if (activeSessionEl) activeSessionEl.textContent = data.activeSessionCount;
                if (activeUserEl)    activeUserEl.textContent    = data.activeUserCount;
                renderSessionList(data.sessionQueues);
            })
            .catch(function () {});
    }

    function renderSessionList(sessionQueues) {
        var el = document.getElementById('sessionQueueList');
        if (!sessionQueues || sessionQueues.length === 0) {
            el.innerHTML = '<li class="list-group-item text-gray-500 p-3">현재 활성 대기열이 없습니다.</li>';
            return;
        }

        el.innerHTML = sessionQueues.map(function (s) {
            // 서버 부하 기준: READY + ENTERED만 (실제 DB/세션에 부하를 주는 인원)
            // 혼잡도는 좌석 수와 무관한 인프라 상한(infraLimit) 기준으로 표시
            var concurrent = (s.readyCount || 0) + (s.enteredCount || 0);
            var infraLimit = s.infraLimit || s.capacity || 1;
            var concurrentPct = Math.min(100, Math.round(concurrent / infraLimit * 100));

            var level = congestionLevel(concurrentPct);
            var badge = level === 'danger'  ? '<span class="badge badge-danger ml-1">포화</span>'
                      : level === 'warning' ? '<span class="badge badge-warning ml-1">혼잡</span>'
                      :                       '<span class="badge badge-success ml-1">여유</span>';
            var barColor = level === 'danger' ? 'bg-danger' : level === 'warning' ? 'bg-warning' : 'bg-success';

            notifyIfNewlyDangerous(s.concertSessionId, s.concertTitle + ' ' + s.round, level);
            notifyIfSoldOut(s.concertSessionId, s.concertTitle + ' ' + s.round, s.availableSeatCount);

            return '<li class="list-group-item py-2">'
                + '<div class="d-flex justify-content-between align-items-center mb-1">'
                + '<span class="font-weight-bold small">' + s.concertTitle + ' ' + s.round + '</span>'
                + badge
                + '</div>'
                + '<div class="d-flex justify-content-between align-items-center mb-1">'
                + '<span class="small text-gray-500">대기 <strong>' + s.waitingCount + '</strong>명 &nbsp; 동접자 <strong>' + concurrent + '</strong>/' + infraLimit + '</span>'
                + '<span class="small font-weight-bold ' + (level !== 'normal' ? 'text-danger' : 'text-gray-500') + '">' + concurrentPct + '%</span>'
                + '</div>'
                + '<div class="progress" style="height:6px;">'
                + '<div class="progress-bar ' + barColor + '" style="width:' + concurrentPct + '%"></div>'
                + '</div>'
                + '</li>';
        }).join('');
    }

    // SSE로 변경 즉시 갱신, 5초 폴링은 SSE 연결 끊김 안전망
    var eventSource = new EventSource('/api/queue/admin/subscribe');
    eventSource.addEventListener('queue-stats-updated', function () {
        debounce('all', refreshAll);
    });
    eventSource.onerror = function () {
        eventSource.close();
        setTimeout(function () {
            eventSource = new EventSource('/api/queue/admin/subscribe');
        }, 3000);
    };

    refreshAll();
    setInterval(refreshAll, 5000);
})();