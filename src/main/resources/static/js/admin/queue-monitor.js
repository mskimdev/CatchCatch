// 어드민 대시보드 - 회차별 대기열 실시간 모니터링
// "전체"와 개별 회차(최대 5개)를 선택할 수 있고, 선택된 항목만 SSE 구독 + 폴링을 시작한다.
(function () {
    var MAX_SELECTED_SESSIONS = 5;
    var MAX_POINTS = 60;

    // 회차마다 고정 배정되는 색상 (구분이 쉬운 색상 팔레트). "전체"는 항상 검정.
    var COLOR_PALETTE = ['#4e73df', '#1cc88a', '#f6c23e', '#e74a3b', '#36b9cc'];
    var OVERALL_COLOR = '#5a5c69';

    var sessionColorMap = {}; // sessionId -> color
    var selectedSessionIds = []; // 선택된 회차 id 배열 (순서 = 색상 배정 순서)
    var overallSelected = true;

    var sessionEventSources = {}; // sessionId -> EventSource
    var overallEventSource = null;

    var sessionHistory = {}; // sessionId -> [{time, congestionRate}]
    var overallHistory = []; // [{time, congestionRate}]

    var chart = null;

    // k6 같은 부하 테스트에서는 SSE(queue-stats-updated)가 초당 수백 번씩 쏟아질 수 있다.
    // 매 이벤트마다 즉시 fetch를 날리면 브라우저 동시 연결 한도(ERR_INSUFFICIENT_RESOURCES)를
    // 넘겨버리므로, 같은 키로 들어오는 이벤트는 짧은 시간(DEBOUNCE_MS) 동안 묶어서 1번만 처리한다.
    var DEBOUNCE_MS = 300;
    var debounceTimers = {};

    function debounce(key, fn) {
        if (debounceTimers[key]) return;
        debounceTimers[key] = setTimeout(function () {
            delete debounceTimers[key];
            fn();
        }, DEBOUNCE_MS);
    }

    function pad(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function timeLabel(date) {
        return pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds());
    }

    function colorForSession(sessionId) {
        if (sessionColorMap[sessionId]) return sessionColorMap[sessionId];
        var usedColors = Object.values(sessionColorMap);
        var color = COLOR_PALETTE.find(function (c) { return usedColors.indexOf(c) === -1; }) || COLOR_PALETTE[0];
        sessionColorMap[sessionId] = color;
        return color;
    }

    // 이 페이지는 Chart.js 4.x(CDN)를 별도로 로드한다 (admin 템플릿 vendor의 2.9.4와
    // 옵션 문법이 달라 섞어 쓰면 안 되므로, 이 페이지에서는 vendor Chart.min.js를 쓰지 않는다).
    function initChart() {
        var ctx = document.getElementById('queueChart');
        chart = new Chart(ctx, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function (item) {
                                return item.dataset.label + ': ' + item.formattedValue + '%';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        min: 0,
                        max: 100,
                        title: { display: true, text: '혼잡도 (%)' }
                    }
                }
            }
        });
    }

    function pushHistory(history, congestionRate) {
        history.push({ time: new Date(), value: congestionRate });
        if (history.length > MAX_POINTS) {
            history.shift();
        }
    }

    function rebuildChart() {
        var labels = [];
        var maxLen = 0;

        if (overallSelected) maxLen = Math.max(maxLen, overallHistory.length);
        selectedSessionIds.forEach(function (id) {
            maxLen = Math.max(maxLen, (sessionHistory[id] || []).length);
        });

        // 가장 데이터가 많은 시리즈의 시간 라벨을 기준으로 맞춘다.
        var labelSource = overallSelected && overallHistory.length === maxLen
            ? overallHistory
            : (sessionHistory[selectedSessionIds.find(function (id) {
                return (sessionHistory[id] || []).length === maxLen;
            })] || []);
        labels = labelSource.map(function (p) { return timeLabel(p.time); });

        var datasets = [];

        if (overallSelected) {
            datasets.push({
                label: '전체',
                data: overallHistory.map(function (p) { return p.value; }),
                borderColor: OVERALL_COLOR,
                backgroundColor: OVERALL_COLOR,
                borderDash: [4, 2],
                fill: false,
                tension: 0.2,
                pointRadius: 0
            });
        }

        selectedSessionIds.forEach(function (sessionId) {
            var meta = sessionMetaMap[sessionId];
            var label = meta ? (meta.concertTitle + ' ' + meta.round) : ('회차 ' + sessionId);
            datasets.push({
                label: label,
                data: (sessionHistory[sessionId] || []).map(function (p) { return p.value; }),
                borderColor: colorForSession(sessionId),
                backgroundColor: colorForSession(sessionId),
                fill: false,
                tension: 0.2,
                pointRadius: 0
            });
        });

        chart.data.labels = labels;
        chart.data.datasets = datasets;
        // 'none'으로 갱신해 매번 처음부터 다시 그리는 애니메이션(아래에서 위로 차오르는 효과)을 끈다.
        // SSE로 자주 갱신되는 실시간 차트라 애니메이션이 오히려 시각적 노이즈가 된다.
        chart.update('none');
    }

    function renderMetricCards() {
        var cardsEl = document.getElementById('queueMetricCards');
        var cards = [];

        if (overallSelected && latestOverall) {
            cards.push(metricCardHtml('overall', '전체', OVERALL_COLOR, latestOverall.totalRequestedCount, latestOverall.waitingCount, latestOverall.congestionRate));
        }

        selectedSessionIds.forEach(function (sessionId) {
            var data = latestSessionData[sessionId];
            if (!data) return;
            var label = data.concertTitle + ' ' + data.round;
            cards.push(metricCardHtml(sessionId, label, colorForSession(sessionId), data.totalRequestedCount, data.waitingCount, data.congestionRate));
        });

        cardsEl.innerHTML = cards.join('') || '<div class="col-12 text-gray-500">선택된 항목이 없습니다.</div>';
    }

    // 혼잡도 임계값에 따른 위험도 표시. 운영자가 한눈에 위험 상황을 파악할 수 있도록
    // 80% 이상은 주의(노랑), 95% 이상은 위험(빨강)으로 카드 배경/숫자 색을 바꾼다.
    var CONGESTION_WARNING_THRESHOLD = 80;
    var CONGESTION_DANGER_THRESHOLD = 95;

    // 항목(전체 또는 회차)별 직전 위험도 레벨. 정상/주의 -> 위험으로 "처음" 바뀌는 순간에만
    // 토스트를 띄우기 위해 필요하다 (위험이 계속되는 동안 매번 다시 뜨면 스팸이 된다).
    var lastLevelMap = {};

    function congestionLevel(congestionRate) {
        if (congestionRate >= CONGESTION_DANGER_THRESHOLD) return 'danger';
        if (congestionRate >= CONGESTION_WARNING_THRESHOLD) return 'warning';
        return 'normal';
    }

    function notifyIfNewlyDangerous(key, label, level) {
        var previousLevel = lastLevelMap[key];
        lastLevelMap[key] = level;

        if (level === 'danger' && previousLevel !== 'danger') {
            CcUI.toast(label + ' 혼잡도가 위험 수준(95% 이상)입니다.', 'error');
        }
    }

    // 사용률(혼잡도 %)은 capacity 대비 현재 얼마나 찼는지를 보여주고,
    // 포화도(대기 N명)는 capacity가 다 차서 못 들어가고 쌓인 인원을 보여준다.
    // 둘을 같이 봐야 "꽉 찼다"와 "줄이 밀려 있다"를 구분해 파악할 수 있다.
    function metricCardHtml(key, label, color, totalRequested, waitingCount, congestionRate) {
        var level = congestionLevel(congestionRate);
        var levelClass = level === 'danger' ? 'cc-congestion-danger' : (level === 'warning' ? 'cc-congestion-warning' : '');
        var badge = level === 'danger' ? ' 🔴 위험' : (level === 'warning' ? ' 🟡 주의' : '');

        notifyIfNewlyDangerous(key, label, level);

        return '<div class="col-md-4 col-6 mb-2">'
            + '<div class="border-left-0 py-2 px-3 ' + levelClass + '" style="border-left: 4px solid ' + color + ';">'
            + '<div class="text-xs font-weight-bold text-uppercase" style="color:' + color + ';">' + label + '</div>'
            + '<div class="h6 mb-0 font-weight-bold text-gray-800">총 요청 ' + totalRequested + '명 · 대기 ' + waitingCount + '명</div>'
            + '<div class="small font-weight-bold ' + (levelClass ? '' : 'text-gray-500') + '">혼잡도 ' + congestionRate + '%' + badge + '</div>'
            + '</div>'
            + '</div>';
    }

    function renderSessionQueueList(sessionQueues) {
        var listEl = document.getElementById('sessionQueueList');
        if (!sessionQueues || sessionQueues.length === 0) {
            listEl.innerHTML = '<li class="list-group-item text-gray-500">현재 대기 중인 공연 회차가 없습니다.</li>';
            return;
        }
        listEl.innerHTML = sessionQueues.map(function (s) {
            var total = s.totalRequestedCount || 0;
            var enteredPct = total === 0 ? 0 : Math.round((s.enteredCount / total) * 100);
            var readyPct = total === 0 ? 0 : Math.round((s.readyCount / total) * 100);
            var waitingPct = total === 0 ? 0 : Math.max(0, 100 - enteredPct - readyPct);
            var isSelected = selectedSessionIds.indexOf(s.concertSessionId) !== -1;

            return '<li class="list-group-item' + (isSelected ? ' list-group-item-light' : '') + '">'
                + '<div class="d-flex justify-content-between align-items-center mb-1">'
                + '<span>' + s.concertTitle + ' ' + s.round + '회차</span>'
                + '<span class="font-weight-bold">총 ' + total + '명 / 혼잡도 ' + s.congestionRate + '%</span>'
                + '</div>'
                + '<div class="progress" style="height: 8px;">'
                + '<div class="progress-bar bg-success" style="width: ' + enteredPct + '%" title="입장완료(ENTERED) ' + s.enteredCount + '명"></div>'
                + '<div class="progress-bar bg-warning" style="width: ' + readyPct + '%" title="입장가능(READY) ' + s.readyCount + '명"></div>'
                + '<div class="progress-bar bg-secondary" style="width: ' + waitingPct + '%" title="대기중(WAITING) ' + s.waitingCount + '명"></div>'
                + '</div>'
                + '</li>';
        }).join('');
    }

    var sessionMetaMap = {}; // sessionId -> {concertTitle, round}
    var latestSessionData = {}; // sessionId -> SessionQueueDTO
    var latestOverall = null;

    function renderSessionCheckboxes(sessionQueues) {
        var listEl = document.getElementById('sessionCheckboxList');
        listEl.innerHTML = sessionQueues.map(function (s) {
            sessionMetaMap[s.concertSessionId] = { concertTitle: s.concertTitle, round: s.round };
            var checked = selectedSessionIds.indexOf(s.concertSessionId) !== -1 ? 'checked' : '';
            var swatch = selectedSessionIds.indexOf(s.concertSessionId) !== -1
                ? '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + colorForSession(s.concertSessionId) + ';margin-right:4px;"></span>'
                : '';
            return '<label class="mr-3 mb-2" style="cursor: pointer;">'
                + '<input type="checkbox" class="session-checkbox" data-session-id="' + s.concertSessionId + '" ' + checked + '>'
                + '<span class="ml-1">' + swatch + s.concertTitle + ' ' + s.round + '</span>'
                + '</label>';
        }).join('');

        listEl.querySelectorAll('.session-checkbox').forEach(function (checkbox) {
            checkbox.addEventListener('change', onSessionCheckboxChange);
        });
    }

    function onSessionCheckboxChange(event) {
        var sessionId = Number(event.target.getAttribute('data-session-id'));

        if (event.target.checked) {
            if (selectedSessionIds.length >= MAX_SELECTED_SESSIONS) {
                event.target.checked = false;
                alert('회차는 최대 ' + MAX_SELECTED_SESSIONS + '개까지 선택할 수 있습니다.');
                return;
            }
            selectedSessionIds.push(sessionId);
            colorForSession(sessionId);
            // subscribeSession 내부에서 refreshSessionData -> rebuildChart/renderMetricCards를
            // 호출하므로, 여기서 미리 빈 데이터로 다시 그릴 필요는 없다(체크 직후 그래프가
            // 잠깐 비어 보이는 현상의 원인이었음).
            subscribeSession(sessionId);
        } else {
            selectedSessionIds = selectedSessionIds.filter(function (id) { return id !== sessionId; });
            unsubscribeSession(sessionId);
            rebuildChart();
            renderMetricCards();
        }

        refreshSessionList();
    }

    function subscribeSession(sessionId) {
        if (sessionEventSources[sessionId]) return;
        var source = new EventSource('/api/queue/admin/subscribe/' + sessionId);
        source.addEventListener('queue-stats-updated', function () {
            debounce('session:' + sessionId, function () { refreshSessionData(sessionId); });
        });
        sessionEventSources[sessionId] = source;
        refreshSessionData(sessionId);
    }

    function unsubscribeSession(sessionId) {
        if (sessionEventSources[sessionId]) {
            sessionEventSources[sessionId].close();
            delete sessionEventSources[sessionId];
        }
        delete sessionHistory[sessionId];
        delete latestSessionData[sessionId];
        // 위험도 기억도 같이 지워야, 같은 회차를 다시 선택했을 때 여전히 위험 상태라면
        // "새로 진입한 것"으로 인식해 토스트가 다시 뜬다.
        delete lastLevelMap[sessionId];
    }

    function refreshSessionData(sessionId) {
        fetch('/admin/api/queue-stats/' + sessionId)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (!data) return;
                latestSessionData[sessionId] = data;
                sessionHistory[sessionId] = sessionHistory[sessionId] || [];
                pushHistory(sessionHistory[sessionId], data.congestionRate);
                rebuildChart();
                renderMetricCards();
            })
            .catch(function () {});
    }

    function subscribeOverall() {
        if (overallEventSource) return;
        overallEventSource = new EventSource('/api/queue/admin/subscribe');
        overallEventSource.addEventListener('queue-stats-updated', function () {
            debounce('overall', refreshOverallData);
        });
        refreshOverallData();
    }

    function unsubscribeOverall() {
        if (overallEventSource) {
            overallEventSource.close();
            overallEventSource = null;
        }
        overallHistory = [];
        latestOverall = null;
        delete lastLevelMap['overall'];
    }

    function refreshOverallData() {
        fetch('/admin/api/queue-stats/overall')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                latestOverall = data;
                pushHistory(overallHistory, data.congestionRate);
                rebuildChart();
                renderMetricCards();
            })
            .catch(function () {});

        // 요약 카드(totalWaitingCount/activeSessionCount)와 회차 리스트는 항상 최신 상태로 유지
        debounce('sessionList', refreshSessionList);
    }

    function refreshSessionList() {
        fetch('/admin/api/queue-stats')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                document.getElementById('totalWaitingCount').textContent = data.totalWaitingCount;
                document.getElementById('activeSessionCount').textContent = data.activeSessionCount;
                renderSessionQueueList(data.sessionQueues);
                renderSessionCheckboxes(data.sessionQueues);
            })
            .catch(function () {});
    }

    document.getElementById('overallToggle').addEventListener('change', function (event) {
        overallSelected = event.target.checked;
        if (overallSelected) {
            // subscribeOverall 내부에서 refreshOverallData -> rebuildChart/renderMetricCards를
            // 호출하므로, 여기서 미리 빈 데이터로 다시 그리지 않는다.
            subscribeOverall();
        } else {
            unsubscribeOverall();
            rebuildChart();
            renderMetricCards();
        }
    });

    initChart();
    subscribeOverall();
    refreshSessionList();

    // 회차 목록 자체(새 회차 등장/소멸)는 활성 회차가 자주 안 바뀌므로 5초 주기로 가볍게 갱신.
    // 선택된 회차/전체의 실데이터는 SSE(queue-stats-updated)로 즉시 갱신된다.
    setInterval(refreshSessionList, 5000);
})();