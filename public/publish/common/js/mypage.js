(function () {
  'use strict';

  function maskPhone(phoneDigits) {
    const p = String(phoneDigits || '').replace(/\D/g, '');
    if (p.length < 9) return p;
    const a = p.slice(0, 3);
    const b = p.slice(3, p.length - 4);
    const c = p.slice(-4);
    return `${a}-${'*'.repeat(Math.max(0, b.length))}-${c}`;
  }

  function setupMyPage() {
    const nicknameInput = document.getElementById('myNickname');
    const phoneSpan = document.getElementById('myPhone');
    const saveButton = document.getElementById('btnSaveMy');
    const logoutButton = document.getElementById('btnLogout');

    if (!nicknameInput && !phoneSpan && !saveButton && !logoutButton) return;

    const storedName = (sessionStorage.getItem('userName') || '').trim();
    if (nicknameInput && storedName && !nicknameInput.value) {
      nicknameInput.value = storedName;
    }

    const verifiedPhone = (sessionStorage.getItem('verifiedPhone') || '').trim();
    if (phoneSpan) {
      phoneSpan.textContent = verifiedPhone ? maskPhone(verifiedPhone) : '미인증';
    }

    if (saveButton) {
      saveButton.addEventListener('click', () => {
        const name = (nicknameInput ? nicknameInput.value : '').trim();
        if (!name) {
          alert('닉네임을 입력해주세요');
          nicknameInput && nicknameInput.focus();
          return;
        }
        sessionStorage.setItem('userName', name);
        alert('저장되었습니다');
      });
    }

    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        const ok = confirm('로그아웃 하시겠습니까?');
        if (!ok) return;
        sessionStorage.removeItem('verifiedPhone');
        sessionStorage.removeItem('userName');
        sessionStorage.removeItem('pickedName');
        sessionStorage.removeItem('authFlow');
        location.href = '../home/first.html';
      });
    }
  }

  document.addEventListener('DOMContentLoaded', setupMyPage);
})();
