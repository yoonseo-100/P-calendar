(function () {
  'use strict';

  const STORAGE_KEYS = {
    userName: 'userName',
    authFlow: 'authFlow',
    verifiedPhone: 'verifiedPhone',
    pickedName: 'pickedName',
  };

  const ROUTES = {
    phone: (flow) => `../auth/phone.html?flow=${encodeURIComponent(flow || 'login')}`,
    signup: () => '../auth/signup.html',
    pickName: () => '../auth/pick-name.html',
    calendar: () => '../calendar/index.html',
    homeFirst: () => '../home/first.html',
    mypage: () => '../mypage/index.html',
  };

  const DEFAULT_SETTINGS = {
    strings: {
      requireName: '이름을 입력해주세요',
      requirePhone: '전화번호를 입력해주세요',
      otpSent: '인증번호 발송됨',
      requireOtp4: '인증번호 4자리를 모두 입력해주세요',
      doneChangePhone: '전화번호 변경이 완료되었습니다',
      doneReauth: '재인증이 완료되었습니다',
      askSignup: '등록된 계정이 없습니다. 회원가입 하시겠어요?',
      signupDone: '회원가입 완료',
      requireTerms: '약관 동의가 필요합니다',
      defaultUserName: '사용자',
    },
    mock: {
      newUserPhones: ['01000000000'],
    },
    pickNameCandidates: ['김민지', '박서준', '이도현', '최유진', '정하늘', '홍길동'],
  };

  function getSettings() {
    const fromGlobal = window.__P_LOGIN_SETTINGS__;
    if (!fromGlobal || typeof fromGlobal !== 'object') return DEFAULT_SETTINGS;

    return {
      ...DEFAULT_SETTINGS,
      ...fromGlobal,
      strings: { ...DEFAULT_SETTINGS.strings, ...(fromGlobal.strings || {}) },
      mock: { ...DEFAULT_SETTINGS.mock, ...(fromGlobal.mock || {}) },
      pickNameCandidates: Array.isArray(fromGlobal.pickNameCandidates)
        ? fromGlobal.pickNameCandidates
        : DEFAULT_SETTINGS.pickNameCandidates,
    };
  }

  function navigateTo(href) {
    window.location.href = href;
  }

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
    const settings = getSettings();
    const nameInput = document.querySelector('.formItem input[type="text"]') || document.querySelector('input[type="text"]');
    const loginButton = document.querySelector('.btnLogin');

    if (!nameInput || !loginButton) return;

    const goNext = () => {
      const userName = (nameInput.value || '').trim();
      if (!userName) {
        alert(settings.strings.requireName);
        nameInput.focus();
        return;
      }
      sessionStorage.setItem(STORAGE_KEYS.userName, userName);
      sessionStorage.setItem(STORAGE_KEYS.authFlow, 'login');
      navigateTo(ROUTES.phone('login'));
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
    const settings = getSettings();
    const phoneInput = document.getElementById('phoneInput');
    const sendButton = document.getElementById('btnSendCode');
    const otpSection = document.getElementById('otpSection');
    const otpInput = document.getElementById('otpInput');
    const confirmButton = document.getElementById('btnConfirm');
    const userNameSpan = document.getElementById('userName');

    if (!phoneInput || !sendButton || !otpSection || !otpInput || !confirmButton) return;

    const flowFromUrl = getFlowFromUrl();
    const flow = (flowFromUrl || sessionStorage.getItem(STORAGE_KEYS.authFlow) || 'login').trim();
    sessionStorage.setItem(STORAGE_KEYS.authFlow, flow);

    const storedName = (sessionStorage.getItem(STORAGE_KEYS.userName) || '').trim();
    if (userNameSpan) {
      userNameSpan.textContent = storedName ? storedName : settings.strings.defaultUserName;
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
        alert(settings.strings.requirePhone);
        phoneInput.focus();
        return;
      }

      sessionStorage.setItem(STORAGE_KEYS.verifiedPhone, phone);

      sendButton.textContent = settings.strings.otpSent;
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
        alert(settings.strings.requireOtp4);
        otpInput.focus();
        return;
      }

      if (flow === 'reauth' || flow === 'changePhone') {
        alert(flow === 'changePhone' ? settings.strings.doneChangePhone : settings.strings.doneReauth);
        navigateTo(ROUTES.mypage());
        return;
      }

      const phone = normalizePhone(phoneInput.value);
      const newUserPhones = Array.isArray(settings.mock?.newUserPhones) ? settings.mock.newUserPhones : [];
      const isNewUser = newUserPhones.includes(phone);

      if (flow === 'signup') {
        navigateTo(ROUTES.signup());
        return;
      }

      if (flow === 'find') {
        navigateTo(ROUTES.pickName());
        return;
      }

      if (isNewUser) {
        const ok = confirm(settings.strings.askSignup);
        if (ok) {
          navigateTo(ROUTES.signup());
        } else {
          navigateTo(ROUTES.homeFirst());
        }
        return;
      }

      navigateTo(ROUTES.calendar());
    });
  }

  function setupPickNamePage() {
    const settings = getSettings();
    const grid = document.getElementById('nameGrid');
    if (!grid) return;

    const myName = (sessionStorage.getItem(STORAGE_KEYS.userName) || '').trim();
    const baseNames = Array.isArray(settings.pickNameCandidates) ? settings.pickNameCandidates : DEFAULT_SETTINGS.pickNameCandidates;
    const names = myName && !baseNames.includes(myName) ? [myName, ...baseNames.slice(0, 5)] : baseNames;

    grid.innerHTML = '';
    names.slice(0, 6).forEach((name) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nameCard';
      btn.textContent = name;
      btn.addEventListener('click', () => {
        sessionStorage.setItem(STORAGE_KEYS.pickedName, name);
        navigateTo(ROUTES.calendar());
      });
      grid.appendChild(btn);
    });
  }

  function setupSignupPage() {
    const settings = getSettings();
    const nameInput = document.getElementById('signupName');
    const termsCheck = document.getElementById('termsAgree');
    const doneButton = document.getElementById('btnSignupDone');

    if (!nameInput || !termsCheck || !doneButton) return;

    const existingName = (sessionStorage.getItem(STORAGE_KEYS.userName) || '').trim();
    if (existingName && !nameInput.value) {
      nameInput.value = existingName;
    }

    const submit = () => {
      const name = (nameInput.value || '').trim();
      if (!name) {
        alert(settings.strings.requireName);
        nameInput.focus();
        return;
      }
      if (!termsCheck.checked) {
        alert(settings.strings.requireTerms);
        return;
      }

      sessionStorage.setItem(STORAGE_KEYS.userName, name);
      alert(settings.strings.signupDone);
      navigateTo(ROUTES.calendar());
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
    setupSignupPage();
  });
})();
