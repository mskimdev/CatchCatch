(function () {
  const queueId = document.getElementById('cc-queue-id').value;
  const sessionId = document.getElementById('cc-queue-session-id').value;

  const numberEl = document.getElementById('cc-queue-number');
  const waitingAheadEl = document.getElementById('cc-queue-waiting-ahead');
  const messageEl = document.getElementById('cc-queue-message');

  let entering = false;

  async function refreshStatus() {
    const { res, data } = await apiGet(`/api/queue/${queueId}/status`);

    if (!res?.ok || !data?.body) {
      messageEl.textContent = '대기열 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
      return;
    }

    const status = data.body;
    numberEl.textContent = status.queueNumber;
    waitingAheadEl.textContent = status.waitingAhead;

    if (status.status === 'READY') {
      if (entering) return;
      entering = true;

      messageEl.textContent = '입장 가능합니다. 좌석 선택 화면으로 이동합니다...';
      const { res: enterRes } = await apiPost(`/api/queue/${queueId}/enter-booking`, {});
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

  function connectSse() {
    const eventSource = new EventSource(`/api/queue/subscribe/${sessionId}`);

    eventSource.addEventListener('queue-updated', refreshStatus);

    eventSource.onerror = () => {
      eventSource.close();
      setTimeout(connectSse, 3000);
    };
  }

  refreshStatus();
  connectSse();
})();