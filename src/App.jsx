import { useEffect, useMemo, useState } from 'react'
import { supabase } from './lib/supabaseClient'

const tabs = [
  { id: 'calendar', label: '캘린더', icon: '📅' },
  { id: 'custom', label: '커스텀', icon: '🎨' },
  { id: 'profile', label: '마이', icon: '🌙' },
]

const coverThemes = [
  {
    id: 'aurora',
    name: '오로라 플로우',
    gradient: 'from-[#7f7bff] via-[#c782ff] to-[#ffc8f7]',
    stickers: ['✨ 계획 최소화', '🌈 감정 기록'],
  },
  {
    id: 'dawn',
    name: '새벽 루틴',
    gradient: 'from-[#ff9486] via-[#ffd8a9] to-[#fff2d6]',
    stickers: ['☕ 기상 루틴', '🌅 산책'],
  },
  {
    id: 'neon',
    name: '야행성 모드',
    gradient: 'from-[#00c6ff] via-[#0072ff] to-[#8e2de2]',
    stickers: ['🌙 야간 작업', '🎧 집중 플레이리스트'],
  },
]

const sampleEvents = [
  { id: 1, date: '2025-11-20', title: '디자인 싱킹 워크샵', mood: '인사이트 확보', energy: '⚡' },
  { id: 2, date: '2025-11-21', title: '프로덕트 리뷰', mood: '즉흥 아이디어', energy: '💡' },
  { id: 3, date: '2025-11-22', title: '친구와 브런치', mood: '휴식', energy: '🥐' },
  { id: 4, date: '2025-11-24', title: '사용자 리서치', mood: '관찰모드', energy: '📝' },
]

const flowSuggestions = [
  { id: 'match', title: '연관 일정 추천', desc: '지난주 “완벽주의 디톡스” 일정과 연결할까요?' },
  { id: 'sticker', title: '스티커 업데이트', desc: '이번 주 집중도 70% 달성 “Flow Hunter” 배지 지급' },
]

const calendarDays = Array.from({ length: 30 }, (_, idx) => idx + 1)

function App() {
  const [activeTab, setActiveTab] = useState('calendar')
  const [viewMode, setViewMode] = useState('month')
  const [selectedTheme, setSelectedTheme] = useState(coverThemes[0])
  const [session, setSession] = useState(null)

  useEffect(() => {
    const fetchSession = async () => {
      const { data } = await supabase.auth.getSession()
      setSession(data.session)
    }
    fetchSession()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const upcomingEvents = useMemo(() => sampleEvents.slice(0, 3), [])

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#100d2d] via-[#1e1d2f] to-[#1b1b2a] text-white">
      <header className="px-6 pt-10 pb-6">
        <p className="text-sm text-white/60">p calendar</p>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">오늘도 흐름대로</p>
            <h1 className="text-3xl font-semibold">P-type의 감각 캘린더</h1>
          </div>
          <div className="rounded-full bg-white/10 px-4 py-2 text-sm">
            {session ? '자동 로그인 완료' : '게스트 모드'}
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 px-6 pb-24">
        <section className="rounded-3xl bg-white/10 p-6 shadow-lg shadow-purple-900/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">커버 테마</p>
              <h2 className="text-2xl font-semibold">{selectedTheme.name}</h2>
            </div>
            <button className="rounded-full bg-white/20 px-4 py-2 text-sm backdrop-blur hover:bg-white/30">
              커버 관리
            </button>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {coverThemes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => setSelectedTheme(theme)}
                className={`rounded-2xl p-4 text-left transition ${
                  selectedTheme.id === theme.id ? 'ring-2 ring-white' : 'opacity-70 hover:opacity-100'
                } bg-gradient-to-r ${theme.gradient}`}
              >
                <p className="text-lg font-semibold">{theme.name}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {theme.stickers.map((sticker) => (
                    <span key={sticker} className="rounded-full bg-white/30 px-3 py-1 text-xs backdrop-blur">
                      {sticker}
                    </span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-3xl bg-white text-slate-900 shadow-xl shadow-purple-900/10">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-500">플로우 캘린더</p>
              <h3 className="text-xl font-semibold">11월 흐름 요약</h3>
            </div>
            <div className="flex rounded-full bg-slate-100 p-1 text-sm">
              {['month', 'list'].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`rounded-full px-4 py-1 capitalize ${
                    viewMode === mode ? 'bg-white shadow text-indigo-600' : 'text-slate-500'
                  }`}
                >
                  {mode === 'month' ? '월간' : '목록형'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid gap-6 p-6 md:grid-cols-3">
            <div className="md:col-span-2">
              {viewMode === 'month' ? (
                <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium text-slate-500">
                  {['월', '화', '수', '목', '금', '토', '일'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}
                  {calendarDays.map((day) => {
                    const event = sampleEvents.find((ev) => Number(ev.date.split('-')[2]) === day)
                    return (
                      <div
                        key={day}
                        className={`flex h-16 flex-col items-center justify-center rounded-2xl border text-sm ${
                          event ? 'border-indigo-300 bg-indigo-50 text-indigo-700' : 'border-slate-100 text-slate-500'
                        }`}
                      >
                        <span>{day}</span>
                        {event && <span className="text-xs">{event.energy}</span>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-4">
                  {sampleEvents.map((event) => (
                    <div key={event.id} className="flex items-center justify-between rounded-2xl border border-slate-100 p-4">
                      <div>
                        <p className="text-xs uppercase text-slate-400">{event.date}</p>
                        <p className="text-lg font-semibold text-slate-900">{event.title}</p>
                        <p className="text-sm text-slate-500">{event.mood}</p>
                      </div>
                      <span className="text-2xl">{event.energy}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <aside className="space-y-6">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">다가오는 일정</p>
                <div className="mt-3 space-y-3">
                  {upcomingEvents.map((event) => (
                    <div key={event.id} className="rounded-xl bg-white p-3 shadow-sm">
                      <p className="text-xs text-slate-400">{event.date}</p>
                      <p className="font-semibold">{event.title}</p>
                      <p className="text-sm text-slate-500">{event.mood}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl bg-slate-900 p-4 text-white">
                <p className="text-xs uppercase tracking-wide text-white/70">P-type Flow Insight</p>
                <p className="mt-2 text-sm text-white/80">이번 주 즉흥 지수</p>
                <p className="text-4xl font-bold">82%</p>
                <p className="mt-2 text-sm text-white/70">추천: 감정 기반 일정 2개 추가</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {flowSuggestions.map((suggestion) => (
            <div key={suggestion.id} className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur">
              <p className="text-sm text-white/60">{suggestion.title}</p>
              <p className="mt-2 text-lg font-semibold">{suggestion.desc}</p>
              <button className="mt-4 rounded-full bg-white/20 px-4 py-2 text-sm hover:bg-white/30">
                적용하기
              </button>
            </div>
          ))}
        </section>
      </main>

      <nav className="fixed bottom-4 left-1/2 z-10 flex w-[90%] max-w-md -translate-x-1/2 items-center justify-between rounded-full border border-white/10 bg-[#201c38]/80 px-4 py-3 backdrop-blur">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 flex-col items-center text-xs ${
              activeTab === tab.id ? 'text-white' : 'text-white/50'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  )
}

export default App
