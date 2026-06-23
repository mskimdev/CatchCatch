(function () {
  const sessionId = document.getElementById('cc-queue-session-id').value;

  const numberEl = document.getElementById('cc-queue-number');
  const waitingAheadEl = document.getElementById('cc-queue-waiting-ahead');
  const waitingBehindEl = document.getElementById('cc-queue-waiting-behind');
  const messageEl = document.getElementById('cc-queue-message');

  let entering = false;
  let lastWaitingAhead = 0;

  async function refreshStatus() {
    const { res, data } = await apiGet(`/api/queue/${sessionId}/status`);

    if (!res?.ok || !data?.body) {
      messageEl.textContent = '대기열 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      return;
    }

    const status = data.body;
    numberEl.textContent = status.queueNumber;
    waitingAheadEl.textContent = status.waitingAhead;
    waitingBehindEl.textContent = status.waitingBehind;
    lastWaitingAhead = status.waitingAhead || 0;

    if (status.status === 'READY') {
      if (entering) return;
      entering = true;

      messageEl.textContent = '입장 가능합니다. 좌석 선택 화면으로 이동합니다...';
      const { res: enterRes } = await apiPost(`/api/queue/${sessionId}/enter-booking`, {});
      if (enterRes?.ok) {
        location.href = '/booking/seat';
      } else {
        entering = false;
        messageEl.textContent = '입장 처리에 실패했습니다. 잠시 후 다시 시도해주세요.';
      }
    } else if (status.status === 'EXPIRED' || status.status === 'CANCELLED') {
      messageEl.textContent = '대기열 입장 시간이 만료되었습니다. 다시 시도해주세요.';
    } else {
      messageEl.textContent = '순서를 기다리고 있습니다.';
    }
  }

  // 승격(promoteNext)이 일어날 때마다 그 회차의 WAITING 전원에게 queue-updated가 전달된다.
  // 수천 명이 동시에 같은 이벤트를 받아 한꺼번에 status를 조회하면 서버에 요청이 몰리므로,
  // 무작위 지연(jitter)을 둬서 fetch 시점을 흩어준다.
  // 대기 인원이 많을수록(서버가 더 혼잡할수록) jitter 폭도 넓혀, 한 번에 몰리는 요청 수를 더 줄인다.
  const MIN_JITTER_MS = 300;
  const MAX_JITTER_MS = 5000;
  const JITTER_SCALE_PER_WAITING = 5; // 대기 1명당 jitter 상한을 5ms씩 늘림

  function refreshStatusWithJitter() {
    const dynamicMax = Math.min(
      MAX_JITTER_MS,
      MIN_JITTER_MS + lastWaitingAhead * JITTER_SCALE_PER_WAITING
    );
    const jitterMs = Math.random() * dynamicMax;
    setTimeout(refreshStatus, jitterMs);
  }

  function connectSse() {
    const eventSource = new EventSource(`/api/queue/subscribe/${sessionId}`);

    eventSource.addEventListener('queue-updated', refreshStatusWithJitter);

    eventSource.onerror = () => {
      eventSource.close();
      setTimeout(connectSse, 3000);
    };
  }

  refreshStatus();
  connectSse();
})();