// =====================================================
//  CatchCatch UI 유틸 (SweetAlert2 래퍼)
//  전역 사용: CcUI.toast() / CcUI.confirm() / CcUI.alert()
// =====================================================

const CcUI = (() => {

  // 공통 스타일
  const BASE_STYLE = {
    customClass: {
      popup:          'cc-swal-popup',
      title:          'cc-swal-title',
      htmlContainer:  'cc-swal-text',
      confirmButton:  'cc-swal-confirm',
      cancelButton:   'cc-swal-cancel',
      actions:        'cc-swal-actions',
    },
    buttonsStyling: false,
  };

  // ── Toast ──────────────────────────────────────────
  // CcUI.toast('저장되었습니다.')
  // CcUI.toast('삭제 실패', 'error')
  // type: 'success' | 'error' | 'warning' | 'info'
  function toast(message, type = 'success') {
    Swal.fire({
      ...BASE_STYLE,
      toast: true,
      position: 'top-end',
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  }

  // ── Confirm ────────────────────────────────────────
  // CcUI.confirm({ title, text, onConfirm: async () => await apiPost('/api/...', {}) })
  // CcUI.confirm({ title, text, confirmText:'삭제', danger: true, onConfirm: async () => await apiDelete('/api/...') })
  function confirm({ title = '확인', text = '', confirmText = '확인', cancelText = '취소', danger = false, onConfirm }) {
    Swal.fire({
      ...BASE_STYLE,
      icon: danger ? 'warning' : 'question',
      title,
      html: text,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      customClass: {
        ...BASE_STYLE.customClass,
        confirmButton: danger ? 'cc-swal-confirm cc-swal-confirm--danger' : 'cc-swal-confirm',
      },
      reverseButtons: true,
      focusCancel: true,
    }).then(result => {
      if (result.isConfirmed && typeof onConfirm === 'function') {
        onConfirm();
      }
    });
  }

  // ── Alert ──────────────────────────────────────────
  // CcUI.alert('관람일을 선택해주세요.')
  // CcUI.alert('처리 실패', 'error')
  function alert(message, type = 'warning') {
    Swal.fire({
      ...BASE_STYLE,
      icon: type,
      title: message,
      confirmButtonText: '확인',
    });
  }

  // ── Loading ────────────────────────────────────────
  // CcUI.loading.show()
  // CcUI.loading.show('저장 중입니다...')
  // CcUI.loading.hide()
  const loading = {
    show(message = '처리 중입니다...') {
      Swal.fire({
        ...BASE_STYLE,
        title: message,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen() {
          Swal.showLoading();
        },
      });
    },
    hide() {
      Swal.close();
    },
  };

  return { toast, confirm, alert, loading };
})();
