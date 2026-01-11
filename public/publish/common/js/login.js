(function () {
  'use strict';

  function normalizePhone(raw) {
    return String(raw || '').replace(/\D/g, '');
  }

  function getFlowFromUrl() {
    try {
      const url = new URL(window.location.href);
      const flow = (url.searchParams.get('flow') || '').trim();
      return flow;
    } catch {
      return '';
    }
  }

  function setupFirstPage() {
    const nameInput = document.querySelector('input[type="text"]');
    const loginButton = document.querySelector('.btnLogin');

    if (!nameInput || !loginButton) return;

    const goNext = () => {
      const userName = (nameInput.value || '').trim();
      if (!userName) {
        alert('이름을 입력해주세요');
        nameInput.focus();
        return;
      }
      sessionStorage.setItem('userName', userName);
      sessionStorage.setItem('authFlow', 'login');
      location.href = '../auth/phone.html?flow=login';
    };

    loginButton.addEventListener('click', (e) => {
      e.preventDefault();
      goNext();
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        goNext();
      }
    });
  }

  function setupPhonePage() {
    const phoneInput = document.getElementById('phoneInput');
    const sendButton = document.getElementById('btnSendCode');
    const otpSection = document.getElementById('otpSection');
    const otpInput = document.getElementById('otpInput');
    const confirmButton = document.getElementById('btnConfirm');
    const userNameSpan = document.getElementById('userName');

    if (!phoneInput || !sendButton || !otpSection || !otpInput || !confirmButton) return;

    const flowFromUrl = getFlowFromUrl();
    const flow = (flowFromUrl || sessionStorage.getItem('authFlow') || 'login').trim();
    sessionStorage.setItem('authFlow', flow);

    const storedName = (sessionStorage.getItem('userName') || '').trim();
    if (userNameSpan) {
      userNameSpan.textContent = storedName ? storedName : '사용자';
    }

    function setOtpEnabled(enabled) {
      otpInput.disabled = !enabled;
      confirmButton.disabled = !enabled;
      otpSection.classList.toggle('is-active', enabled);
      otpSection.setAttribute('aria-hidden', enabled ? 'false' : 'true');
    }

    setOtpEnabled(false);

    sendButton.addEventListener('click', () => {
      const phone = normalizePhone(phoneInput.value);
      if (!phone) {
        alert('전화번호를 입력해주세요');
        phoneInput.focus();
        return;
      }

      sessionStorage.setItem('verifiedPhone', phone);

      sendButton.textContent = '인증번호 발송됨';
      sendButton.disabled = true;
      setOtpEnabled(true);

      otpInput.value = '';
      otpInput.focus();
    });

    otpInput.addEventListener('input', () => {
      const digitsOnly = (otpInput.value || '').replace(/\D/g, '');
      otpInput.value = digitsOnly.slice(0, 4);
    });

    otpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        confirmButton.click();
      }
    });

    confirmButton.addEventListener('click', () => {
      const otp = (otpInput.value || '').replace(/\D/g, '').slice(0, 4);
      if (otp.length !== 4) {
        alert('인증번호 4자리를 모두 입력해주세요');
        otpInput.focus();
        return;
      }

      if (flow === 'reauth' || flow === 'changePhone') {
        alert(flow === 'changePhone' ? '전화번호 변경이 완료되었습니다' : '재인증이 완료되었습니다');
        location.href = '../mypage/index.html';
        return;
      }

      const phone = normalizePhone(phoneInput.value);
      const isNewUser = phone === '01000000000';

      if (flow === 'signup') {
        location.href = '../auth/signup.html';
        return;
      }

      if (flow === 'find') {
        location.href = '../auth/pick-name.html';
        return;
      }

      if (isNewUser) {
        const ok = confirm('등록된 계정이 없습니다. 회원가입 하시겠어요?');
        if (ok) {
          location.href = '../calendar/index.html';
        } else {
          location.href = '../home/first.html';
        }
        return;
      }

      location.href = '../calendar/index.html';
    });
  }

  function setupPickNamePage() {
    const grid = document.getElementById('nameGrid');
    if (!grid) return;

    const myName = (sessionStorage.getItem('userName') || '').trim();
    const baseNames = ['김민지', '박서준', '이도현', '최유진', '정하늘', '홍길동'];
    const names = myName && !baseNames.includes(myName)
      ? [myName, ...baseNames.slice(0, 5)]
      : baseNames;

    grid.innerHTML = '';
    names.slice(0, 6).forEach((name) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nameCard';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        sessionStorage.setItem('pickedName', name);
        location.href = '../calendar/index.html';
      });
      grid.appendChild(btn);
    });
  }

  function setupSecurityQuizPage() {
    const doneButton = document.getElementById('btnQuizDone');
    const quizInput = document.getElementById('quizAnswer');
    const pickedNameSpan = document.getElementById('pickedName');

    if (!doneButton || !quizInput) return;

    const pickedName = (sessionStorage.getItem('pickedName') || '').trim();
    if (pickedNameSpan) {
      pickedNameSpan.textContent = pickedName || '선택한 이름';
    }

    const submit = () => {
      const answer = (quizInput.value || '').trim();
      if (!answer) {
        alert('보안 퀴즈 답변을 입력해주세요');
        quizInput.focus();
        return;
      }
      alert('인증 완료');
      location.href = '../calendar/index.html';
    };

    doneButton.addEventListener('click', submit);
    quizInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
  }

  function setupSignupPage() {
    const nameInput = document.getElementById('signupName');
    const termsCheck = document.getElementById('termsAgree');
    const doneButton = document.getElementById('btnSignupDone');

    if (!nameInput || !termsCheck || !doneButton) return;

    const existingName = (sessionStorage.getItem('userName') || '').trim();
    if (existingName && !nameInput.value) {
      nameInput.value = existingName;
    }

    const submit = () => {
      const name = (nameInput.value || '').trim();
      if (!name) {
        alert('이름을 입력해주세요');
        nameInput.focus();
        return;
      }
      if (!termsCheck.checked) {
        alert('약관 동의가 필요합니다');
        return;
      }

      sessionStorage.setItem('userName', name);
      alert('회원가입 완료');
      location.href = '../calendar/index.html';
    };

    doneButton.addEventListener('click', submit);
    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        submit();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    setupFirstPage();
    setupPhonePage();
    setupPickNamePage();
    setupSecurityQuizPage();
    setupSignupPage();
  });
})();
