// 어드민 대시보드 Chart.js 차트 초기화
(function () {

    var trendChart = null;
    var salesRateChart = null;
    var currentPeriod = typeof DASHBOARD_PERIOD !== 'undefined' ? DASHBOARD_PERIOD : 'TODAY';

    function initTrendChart(labels, bookings, sales, canceled) {
        var ctx = document.getElementById('trendChart');
        if (!ctx) return;
        if (trendChart) trendChart.destroy();
        trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '예매 건수',
                        data: bookings,
                        borderColor: '#4e73df',
                        backgroundColor: 'rgba(78,115,223,0.05)',
                        yAxisID: 'yBooking',
                        tension: 0.3,
                        pointRadius: 3,
                        fill: true
                    },
                    {
                        label: '취소 건수',
                        data: canceled,
                        borderColor: '#e74a3b',
                        backgroundColor: 'rgba(231,74,59,0.05)',
                        yAxisID: 'yBooking',
                        tension: 0.3,
                        pointRadius: 3,
                        borderDash: [5, 3],
                        fill: false
                    },
                    {
                        label: '매출(원)',
                        data: sales,
                        borderColor: '#1cc88a',
                        backgroundColor: 'rgba(28,200,138,0.05)',
                        yAxisID: 'ySales',
                        tension: 0.3,
                        pointRadius: 3,
                        fill: true
                    }
                ]
            },
            options: {
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: function (item) {
                                if (item.datasetIndex === 2) {
                                    return '매출: ' + Number(item.raw).toLocaleString('ko-KR') + '원';
                                }
                                return item.dataset.label + ': ' + item.raw + '건';
                            }
                        }
                    }
                },
                scales: {
                    yBooking: {
                        type: 'linear',
                        position: 'left',
                        beginAtZero: true,
                        title: { display: true, text: '건수' }
                    },
                    ySales: {
                        type: 'linear',
                        position: 'right',
                        beginAtZero: true,
                        grid: { drawOnChartArea: false },
                        title: { display: true, text: '매출(원)' },
                        ticks: {
                            callback: function (v) {
                                return v >= 10000 ? (v / 10000).toFixed(0) + '만' : v;
                            }
                        }
                    }
                }
            }
        });
    }

    function initSalesRateChart(labels, values) {
        var ctx = document.getElementById('salesRateChart');
        if (!ctx) return;
        if (salesRateChart) salesRateChart.destroy();
        salesRateChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: '예매율(%)',
                    data: values,
                    backgroundColor: values.map(function (v) {
                        if (v >= 90) return 'rgba(231,74,59,0.7)';
                        if (v >= 60) return 'rgba(246,194,62,0.7)';
                        return 'rgba(54,185,204,0.7)';
                    }),
                    borderRadius: 4
                }]
            },
            options: {
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function (item) { return item.raw + '%'; }
                        }
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        ticks: { callback: function (v) { return v + '%'; } }
                    }
                }
            }
        });
    }

    function loadCharts(period) {
        fetch('/admin/api/chart-data?period=' + period)
            .then(function (res) { return res.json(); })
            .then(function (data) {
                initTrendChart(data.trendLabels, data.trendBookingCounts, data.trendSalesAmounts, data.trendCanceledCounts);
                initSalesRateChart(data.salesRateLabels, data.salesRateValues);
            })
            .catch(function (e) { console.error('차트 데이터 로드 실패', e); });
    }

    function loadKpiStats(period) {
        fetch('/admin/api/kpi-stats?period=' + period)
            .then(function (res) { return res.json(); })
            .then(function (d) {
                var salesEl        = document.getElementById('kpi-sales');
                var salesDiffEl    = document.getElementById('kpi-sales-diff');
                var bookingEl      = document.getElementById('kpi-booking');
                var bookingDiffEl  = document.getElementById('kpi-booking-diff');
                var cancelRateEl   = document.getElementById('kpi-cancel-rate');
                var canceledEl     = document.getElementById('kpi-canceled-count');
                var pendingEl      = document.getElementById('kpi-pending');

                if (salesEl)       salesEl.textContent       = d.totalSalesAmountFormatted + '원';
                if (salesDiffEl)   salesDiffEl.textContent   = d.diffLabel + ' 대비 ' + d.salesAmountDiffFormatted + '원';
                if (bookingEl)     bookingEl.textContent     = d.bookingCount + '건';
                if (bookingDiffEl) bookingDiffEl.textContent = d.diffLabel + ' 대비 ' + d.bookingCountDiffFormatted + '건';
                if (cancelRateEl)  cancelRateEl.textContent  = d.cancelRate + '%';
                if (canceledEl)    canceledEl.textContent    = '취소 ' + d.canceledCount + '건';
                if (pendingEl)     pendingEl.textContent     = d.pendingCount + '건';

                // 증감 색상 갱신
                if (salesDiffEl) {
                    salesDiffEl.className = 'mt-1 small ' + (d.salesUp ? 'text-success' : 'text-danger');
                }
                if (bookingDiffEl) {
                    bookingDiffEl.className = 'mt-1 small ' + (d.bookingUp ? 'text-success' : 'text-danger');
                }
            })
            .catch(function (e) { console.error('KPI 로드 실패', e); });
    }

    // 기간 버튼 클릭 시 페이지 이동 없이 차트 + KPI 갱신
    var periodBtnGroup = document.getElementById('periodBtnGroup');
    if (periodBtnGroup) {
        periodBtnGroup.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-period]');
            if (!btn) return;

            currentPeriod = btn.dataset.period;

            // 버튼 활성화 스타일 교체
            periodBtnGroup.querySelectorAll('button').forEach(function (b) {
                b.className = 'btn btn-sm btn-outline-primary';
            });
            btn.className = 'btn btn-sm btn-primary';

            loadCharts(currentPeriod);
            loadKpiStats(currentPeriod);
        });
    }

    function loadRecentBookings() {
        fetch('/admin/api/recent-bookings')
            .then(function (res) { return res.json(); })
            .then(function (list) {
                var el = document.getElementById('recentBookingList');
                if (!el) return;
                if (!list || list.length === 0) {
                    el.innerHTML = '<li class="list-group-item text-gray-500 small">최근 예매 내역이 없습니다.</li>';
                    return;
                }
                el.innerHTML = list.map(function (b) {
                    return '<li class="list-group-item">'
                        + '<div class="d-flex justify-content-between">'
                        + '<span class="font-weight-bold small">' + b.userName + '</span>'
                        + '<span class="text-success small font-weight-bold">' + b.totalAmountFormatted + '원</span>'
                        + '</div>'
                        + '<div class="text-gray-500" style="font-size:11px;">' + b.concertTitle + ' · ' + b.round + ' · ' + b.paidAt + '</div>'
                        + '</li>';
                }).join('');
            })
            .catch(function () {});
    }

    function loadOperationLogs() {
        fetch('/admin/api/operation-logs')
            .then(function (res) { return res.json(); })
            .then(function (list) {
                var el = document.getElementById('operationLogList');
                if (!el) return;
                if (!list || list.length === 0) {
                    el.innerHTML = '<li class="list-group-item text-gray-500 small">최근 운영 로그가 없습니다.</li>';
                    return;
                }
                el.innerHTML = list.map(function (log) {
                    return '<li class="list-group-item small">'
                        + '<span class="text-gray-500">[' + log.level + ']</span> '
                        + '<span class="font-weight-bold">' + log.actor + '</span> '
                        + log.message
                        + '<span class="text-gray-400 float-right">' + log.createdAt + '</span>'
                        + '</li>';
                }).join('');
            })
            .catch(function () {});
    }

    function loadSystemErrors() {
        fetch('/admin/api/system-error-stats')
            .then(function (res) { return res.json(); })
            .then(function (data) {
                var kpiEl = document.getElementById('kpi-system-error');
                if (kpiEl) kpiEl.textContent = data.recentErrorCount + '건';

                var el = document.getElementById('systemErrorList');
                if (!el) return;
                var errors = data.recentErrors;
                if (!errors || errors.length === 0) {
                    el.innerHTML = '<li class="list-group-item text-gray-500 small">최근 1시간 내 에러가 없습니다.</li>';
                    return;
                }
                el.innerHTML = errors.map(function (e) {
                    var cls = e.isError ? 'text-danger' : (e.isWarn ? 'text-warning' : '');
                    return '<li class="list-group-item small ' + cls + '">'
                        + '[' + e.level + '] ' + e.message
                        + '<span class="float-right">' + e.occurredAt + '</span>'
                        + '</li>';
                }).join('');
            })
            .catch(function () {});
    }

    function loadConcertSalesRates() {
        fetch('/admin/api/concert-sales-rates')
            .then(function (res) { return res.json(); })
            .then(function (list) {
                if (!list || list.length === 0) return;
                var labels = list.map(function (c) { return c.title; });
                var values = list.map(function (c) { return c.salesRate; });
                initSalesRateChart(labels, values);
            })
            .catch(function () {});
    }

    // 초기 로드
    loadCharts(currentPeriod);
    loadRecentBookings();
    loadOperationLogs();
    loadSystemErrors();

    // 폴링: 30초 — 최근 예매, 운영 로그, 시스템 에러
    setInterval(loadRecentBookings, 30 * 1000);
    setInterval(loadOperationLogs, 30 * 1000);
    setInterval(loadSystemErrors, 30 * 1000);

    // 폴링: 1분 — KPI 카드, 차트, 공연별 예매율
    setInterval(function () { loadKpiStats(currentPeriod); }, 60 * 1000);
    setInterval(function () { loadCharts(currentPeriod); }, 60 * 1000);
    setInterval(loadConcertSalesRates, 60 * 1000);

})();
