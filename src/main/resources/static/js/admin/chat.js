function initAdminChat() {
  const userList    = document.getElementById('chat-user-list');
  const chatBody    = document.getElementById('chat-body');
  const chatTitle   = document.getElementById('chat-title');
  const chatEmpty   = document.getElementById('chat-empty');
  const input       = document.getElementById('admin-chat-input');
  const sendBtn     = document.getElementById('admin-chat-send');

  if (!userList) return;

  let stompClient   = null;
  let stompConnected = false;
  let selectedUserId = null;

  // ── STOMP 연결 ────────────────────────────────────────────────
  function connectStomp() {
    const socket = new SockJS('/ws');
    stompClient = Stomp.over(socket);
    stompClient.debug = null;

    stompClient.connect({}, () => {
      stompConnected = true;

      // 모든 유저 메시지 수신
      stompClient.subscribe('/topic/admin.chat', (frame) => {
        const data = JSON.parse(frame.body);
        updateUserPreview(data.userId, data.content);

        // 현재 열려있는 채팅방이면 바로 표시
        if (String(data.userId) === String(selectedUserId)) {
          appendMsg('user', data.username, data.content);
        }
      });
    }, () => {
      stompConnected = false;
    });
  }

  // ── 유저 선택 ─────────────────────────────────────────────────
  userList.addEventListener('click', (e) => {
    const item = e.target.closest('.chat-user-item');
    if (!item) return;

    document.querySelectorAll('.chat-user-item').forEach(el => el.classList.remove('active'));
    item.classList.add('active');

    selectedUserId = item.dataset.userId;
    const username = item.dataset.username;

    chatTitle.innerHTML = `<i class="fas fa-comment-dots mr-1"></i> ${username} 님과의 채팅`;
    loadMessages(selectedUserId);
  });

  // ── 이전 메시지 불러오기 ──────────────────────────────────────
  function loadMessages(userId) {
    chatBody.innerHTML = '';

    fetch(`/api/admin/chats/${userId}`)
      .then(res => res.json())
      .then(data => {
        if (!data.body || data.body.length === 0) {
          chatBody.innerHTML = '<div class="chat-empty"><i class="fas fa-comments fa-2x mb-2"></i><p>채팅 내역이 없습니다.</p></div>';
          return;
        }
        data.body.forEach(msg => {
          appendMsg(msg.senderRole === 'ADMIN' ? 'admin' : 'user', msg.senderRole === 'ADMIN' ? '나' : msg.username, msg.content, msg.createdAt);
        });
      });
  }

  // ── 메시지 전송 ───────────────────────────────────────────────
  function sendReply() {
    if (!selectedUserId) {
      alert('유저를 먼저 선택해주세요.');
      return;
    }
    const text = input.value.trim();
    if (!text || !stompConnected) return;

    stompClient.send('/app/chat.admin.reply', {}, JSON.stringify({
      targetUserId: selectedUserId,
      content: text,
    }));

    appendMsg('admin', '나', text);
    input.value = '';
    input.style.height = 'auto';
  }

  sendBtn.addEventListener('click', sendReply);

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
  });
  input.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      sendReply();
    }
  });
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // ── 말풍선 추가 ───────────────────────────────────────────────
  function appendMsg(role, name, content, time) {
    const isAdmin = role === 'admin';
    const div = document.createElement('div');
    div.className = `chat-msg chat-msg--${role}`;
    div.innerHTML = `
      <div class="chat-msg__avatar">
        <i class="fas fa-${isAdmin ? 'headset' : 'user'}"></i>
      </div>
      <div>
        <div class="chat-msg__bubble">${escHtml(content)}</div>
        ${time ? `<div class="chat-msg__time ${isAdmin ? 'text-right' : ''}">${time}</div>` : ''}
      </div>
    `;
    chatBody.appendChild(div);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  // ── 유저 목록 미리보기 업데이트 ───────────────────────────────
  function updateUserPreview(userId, content) {
    const item = userList.querySelector(`[data-user-id="${userId}"]`);
    if (!item) return;
    const preview = item.querySelector('.preview');
    if (preview) preview.textContent = content;
  }

  function escHtml(t) {
    return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  connectStomp();
}

document.addEventListener('DOMContentLoaded', initAdminChat);