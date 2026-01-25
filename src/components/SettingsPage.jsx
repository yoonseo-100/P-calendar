import { useState, useEffect } from 'react'

function SettingsPage({ onNavigateToCalendar }) {
  const [settings, setSettings] = useState({
    weekStart: 'MON',
    showWeather: true,
    defaultView: '개인일정',
    timezone: 'Asia/Seoul (KST)',
    weekdayWakeTime: '07:00',
    weekdaySleepTime: '23:00',
    weekendSleepSeparate: false,
    weekendWakeTime: '09:00',
    weekendSleepTime: '00:00',
    eventStartNotification: true,
    dailySummary: false,
    soundEnabled: true,
  })

  useEffect(() => {
    // 로컬 스토리지에서 설정 불러오기
    const savedSettings = localStorage.getItem('pCalendarSettings')
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

  const handleChange = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    localStorage.setItem('pCalendarSettings', JSON.stringify(newSettings))
  }

  const handleSave = () => {
    localStorage.setItem('pCalendarSettings', JSON.stringify(settings))
    alert('변경사항이 저장되었습니다.')
  }

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'p-calendar-settings.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    if (confirm('로컬 데이터를 초기화하시겠습니까?')) {
      localStorage.removeItem('pCalendarSettings')
      window.location.reload()
    }
  }

  return (
    <section className="frame loca-calendar loca-settings">
      <header></header>
      <nav id="appNav" data-active="settings">
        <div className="tabs">
          <button type="button" className="tabItem" onClick={onNavigateToCalendar}>
            <h4>홈</h4>
          </button>
          <button type="button" className="tabItem">
            <h4>개인일정</h4>
          </button>
          <button type="button" className="tabItem NOW">
            <h4>설정</h4>
          </button>
        </div>
        <div className="control"></div>
      </nav>

      <div className="content">
        <div className="settingsWrap">
          <div className="settingsTop">
            <h2>설정</h2>
            <p className="settingsSub">기본 환경과 알림을 관리합니다</p>
          </div>

          <section className="settingsCard">
            <h3>캘린더 기본</h3>
            <div className="settingsItem">
              <div className="label">
                <h5>주 시작 요일</h5>
                <p>캘린더에서 한 주의 시작</p>
              </div>
              <select
                className="settingsSelect"
                id="weekStartSelect"
                value={settings.weekStart}
                onChange={(e) => handleChange('weekStart', e.target.value)}
              >
                <option value="MON">월요일</option>
                <option value="SUN">일요일</option>
              </select>
            </div>
            <div className="settingsItem">
              <div className="label">
                <h5>날씨 표시</h5>
                <p>날짜 옆에 기온을 표시합니다</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  id="showWeatherToggle"
                  checked={settings.showWeather}
                  onChange={(e) => handleChange('showWeather', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="settingsItem">
              <div className="label">
                <h5>기본 보기</h5>
                <p>앱에서 처음 보여줄 화면</p>
              </div>
              <select
                className="settingsSelect"
                value={settings.defaultView}
                onChange={(e) => handleChange('defaultView', e.target.value)}
              >
                <option>개인일정</option>
                <option>홈</option>
              </select>
            </div>
            <div className="settingsItem">
              <div className="label">
                <h5>시간대</h5>
                <p>일정 시간 표기 기준</p>
              </div>
              <select
                className="settingsSelect"
                value={settings.timezone}
                onChange={(e) => handleChange('timezone', e.target.value)}
              >
                <option>Asia/Seoul (KST)</option>
                <option>UTC</option>
                <option>America/Los_Angeles (PST)</option>
                <option>Europe/London (GMT)</option>
              </select>
            </div>
          </section>

          <section className="settingsCard">
            <h3>수면 목표</h3>
            <div className="settingsItem">
              <div className="label">
                <h5>평일 기상</h5>
              </div>
              <div className="settingsRange" aria-label="평일 기상 및 취침 시간">
                <input
                  className="settingsInput"
                  id="weekdayWakeTime"
                  type="time"
                  value={settings.weekdayWakeTime}
                  onChange={(e) => handleChange('weekdayWakeTime', e.target.value)}
                />
                <span className="settingsRangeSep">~</span>
                <input
                  className="settingsInput"
                  id="weekdaySleepTime"
                  type="time"
                  value={settings.weekdaySleepTime}
                  onChange={(e) => handleChange('weekdaySleepTime', e.target.value)}
                />
              </div>
            </div>
            <div className="settingsItem">
              <div className="label">
                <h5>주말 수면 목표 별도 설정</h5>
                <p>토/일은 따로 기상·취침 시간을 관리해요</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  id="weekendSleepSeparate"
                  checked={settings.weekendSleepSeparate}
                  onChange={(e) => handleChange('weekendSleepSeparate', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>

            {settings.weekendSleepSeparate && (
              <div className="settingsSleepWeekend" id="weekendSleepSection">
                <div className="settingsItem">
                  <div className="label">
                    <h5>주말 기상</h5>
                  </div>
                  <div className="settingsRange" aria-label="주말 기상 및 취침 시간">
                    <input
                      className="settingsInput"
                      id="weekendWakeTime"
                      type="time"
                      value={settings.weekendWakeTime}
                      onChange={(e) => handleChange('weekendWakeTime', e.target.value)}
                    />
                    <span className="settingsRangeSep">~</span>
                    <input
                      className="settingsInput"
                      id="weekendSleepTime"
                      type="time"
                      value={settings.weekendSleepTime}
                      onChange={(e) => handleChange('weekendSleepTime', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="settingsCard">
            <h3>알림</h3>
            <div className="settingsItem">
              <div className="label">
                <h5>일정 시작 알림</h5>
                <p>시작 10분 전에 알려줘요</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.eventStartNotification}
                  onChange={(e) => handleChange('eventStartNotification', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="settingsItem">
              <div className="label">
                <h5>오늘 요약</h5>
                <p>매일 오전 8시에 일정 요약</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.dailySummary}
                  onChange={(e) => handleChange('dailySummary', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
            <div className="settingsItem">
              <div className="label">
                <h5>소리</h5>
                <p>알림 소리 재생</p>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => handleChange('soundEnabled', e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          </section>

          <section className="settingsCard">
            <h3>데이터</h3>
            <div className="settingsItem">
              <div className="label">
                <h5>내보내기</h5>
                <p>일정 데이터를 파일로 저장</p>
              </div>
              <button type="button" className="settingsBtn" onClick={handleExport}>
                내보내기
              </button>
            </div>
            <div className="settingsItem">
              <div className="label">
                <h5>로컬 데이터 초기화</h5>
                <p>이 기기에서만 저장된 값 삭제</p>
              </div>
              <button type="button" className="settingsBtn danger" onClick={handleReset}>
                초기화
              </button>
            </div>
          </section>

          <section className="settingsCard">
            <h3>정보</h3>
            <div className="settingsItem">
              <div className="label">
                <h5>버전</h5>
                <p>앱 정보</p>
              </div>
              <span className="settingsValue">v0.1</span>
            </div>
          </section>

          <div className="settingsBottom">
            <button
              type="button"
              className="settingsBack"
              onClick={onNavigateToCalendar}
            >
              ← 캘린더로 돌아가기
            </button>
            <button type="button" className="settingsPrimary" onClick={handleSave}>
              변경사항 저장
            </button>
          </div>
        </div>
      </div>

      <footer></footer>
    </section>
  )
}

export default SettingsPage

