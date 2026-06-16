function initPanelResize(panel) {
  const handle = document.createElement('div');
  handle.className = 'cc-chat-panel__resize';
  panel.appendChild(handle);

  const MIN_W = 320;
  const MAX_W = Math.min(720, window.innerWidth - 40);

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    handle.classList.add('is-dragging');
    const startX = e.clientX;
    const startW = panel.offsetWidth;

    function onMove(e) {
      const delta = startX - e.clientX;
      const newW = Math.min(MAX_W, Math.max(MIN_W, startW + delta));
      panel.style.width = newW + 'px';
    }
    function onUp() {
      handle.classList.remove('is-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

const renderer = new marked.Renderer();
renderer.link = ({ href, text }) => `<a href="${href}" target="_blank" rel="noopener noreferrer">${text}</a>`;
marked.use({ renderer });

function initFab() {
  const wrap = document.getElementById('cc-fab');
  if (!wrap) return;

  const mainBtn = document.getElementById('cc-fab-main');
  const overlay = document.getElementById('cc-chat-overlay');

  // ── FAB 토글 ──────────────────────────────────────────────────
  mainBtn.addEventListener('click', () => {
    const isOpen = wrap.classList.toggle('is-open');
    mainBtn.setAttribute('aria-expanded', isOpen);
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target) && !e.target.closest('.cc-chat-panel')) {
      wrap.classList.remove('is-open');
      mainBtn.setAttribute('aria-expanded', false);
    }
  });

  // ── 패널 열기/닫기 ────────────────────────────────────────────
  function openPanel(panelId) {
    document.querySelectorAll('.cc-chat-panel').forEach(p => p.classList.remove('is-open'));
    const panel = document.getElementById(panelId);
    if (!panel) return;
    panel.classList.add('is-open');
    panel.removeAttribute('aria-hidden');
    overlay.classList.add('is-open');
    wrap.classList.remove('is-open');
    mainBtn.setAttribute('aria-expanded', false);
    panel.querySelector('.cc-chat-panel__input')?.focus();
  }

  function closeAll() {
    document.querySelectorAll('.cc-chat-panel').forEach(p => {
      p.classList.remove('is-open');
      p.setAttribute('aria-hidden', 'true');
    });
    overlay.classList.remove('is-open');
  }

  overlay.addEventListener('click', closeAll);
  document.querySelectorAll('.cc-chat-panel__close').forEach(btn => {
    btn.addEventListener('click', closeAll);
  });

  document.querySelectorAll('.cc-chat-panel').forEach(initPanelResize);

  document.getElementById('cc-fab-chat')?.addEventListener('click', () => {
    openPanel('cc-live-panel');
    connectStomp();
  });
  document.getElementById('cc-fab-ai')?.addEventListener('click', () => openPanel('cc-ai-panel'));

  // ── 공용 헬퍼 ─────────────────────────────────────────────────
  function escHtml(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function appendMsg(bodyEl, role, html) {
    const isAi = role === 'ai';
    const isLive = bodyEl.id === 'cc-live-body';
    const aiAvatar = isLive
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
    const userAvatar = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
    const div = document.createElement('div');
    div.className = `cc-chat-msg cc-chat-msg--${role}`;
    div.innerHTML = `
      <div class="cc-chat-msg__avatar">${isAi ? aiAvatar : userAvatar}</div>
      <div class="cc-chat-msg__bubble">${html}</div>
    `;
    bodyEl.appendChild(div);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function showTyping(bodyEl, typingId) {
    const isLive = bodyEl.id === 'cc-live-body';
    const avatar = isLive
      ? `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`
      : `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`;
    const div = document.createElement('div');
    div.className = 'cc-chat-msg cc-chat-msg--ai';
    div.id = typingId;
    div.innerHTML = `
      <div class="cc-chat-msg__avatar">${avatar}</div>
      <div class="cc-chat-typing"><span></span><span></span><span></span></div>
    `;
    bodyEl.appendChild(div);
    bodyEl.scrollTop = bodyEl.scrollHeight;
  }

  function bindInput(input, sendBtn, onSend) {
    input.addEventListener('input', () => {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 100) + 'px';
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
      }
    });
    input.addEventListener('keyup', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        const text = input.value.trim();
        if (text) onSend(text);
      }
    });
    sendBtn.addEventListener('click', () => {
      const text = input.value.trim();
      if (text) onSend(text);
    });
  }

  // ── 1:1 채팅 (STOMP) ──────────────────────────────────────────
  const userId = document.querySelector('meta[name="session-user-id"]')?.content;
  let stompClient = null;
  let stompConnected = false;

  function connectStomp() {
    if (stompConnected || !userId) return;

    const liveBody = document.getElementById('cc-live-body');
    // 1. WebSocket 연결
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {
      stompConnected = true;

      // 2. 최초 1회 실행
      stompClient.subscribe(`/queue/chat.${userId}`, (frame) => {
        const data = JSON.parse(frame.body);
        appendMsg(liveBody, 'ai', escHtml(data.content));
      });
    }, () => {
      stompConnected = false;
      appendMsg(liveBody, 'ai', '연결에 실패했습니다. 잠시 후 다시 시도해주세요.');
    });
  }

  const liveBody = document.getElementById('cc-live-body');
  const liveInput = document.getElementById('cc-live-input');
  const liveSend = document.getElementById('cc-live-send');

  bindInput(liveInput, liveSend, (text) => {
    if (!stompConnected) {
      appendMsg(liveBody, 'ai', '연결 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }
    liveInput.value = '';
    liveInput.style.height = 'auto';
    appendMsg(liveBody, 'user', escHtml(text));
    stompClient.send('/app/chat.send', {}, JSON.stringify({ content: text }));
  });

  // ── AI 챗봇 (HTTP) ────────────────────────────────────────────
  const aiBody = document.getElementById('cc-ai-body');
  const aiInput = document.getElementById('cc-ai-input');
  const aiSend = document.getElementById('cc-ai-send');
  const aiSessionId = crypto.randomUUID();

  aiBody.addEventListener('click', (e) => {
    const btn = e.target.closest('.cc-chat-suggestion');
    if (btn) sendAi(btn.textContent.trim());
  });

  bindInput(aiInput, aiSend, sendAi);

  async function sendAi(text) {
    aiInput.value = '';
    aiInput.style.height = 'auto';
    appendMsg(aiBody, 'user', escHtml(text));
    aiSend.disabled = true;

    const typingId = 'cc-typing-ai';
    showTyping(aiBody, typingId);

    const { res, data } = await apiPost('/api/chat/ai', { sessionId: aiSessionId, message: text });

    document.getElementById(typingId)?.remove();

    if (res?.ok && data?.body?.answer) {
      appendMsg(aiBody, 'ai', marked.parse(data.body.answer));
    } else {
      appendMsg(aiBody, 'ai', '일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    aiSend.disabled = false;
    aiInput.focus();
  }
}

document.addEventListener('DOMContentLoaded', initFab);