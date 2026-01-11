import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import HomePage from './components/HomePage'
import CalendarPage from './components/CalendarPage'

const initialTodos = [
  { id: 'todo1', text: '8:40~18:00 대전 해커톤 멘토', checked: false },
  { id: 'todo2', text: '19:00~22:00 밋 Y2K모각작', checked: false },
  { id: 'todo3', text: '17:30 줌 WEC업무췍', checked: false },
  { id: 'todo4', text: '22:20~23:20 대전to수서', checked: false },
  { id: 'todo5', text: '인테리어 준비', checked: false },
]

function App() {
  const [session, setSession] = useState(null)
  const [todoList, setTodoList] = useState(initialTodos)
  const [currentPage, setCurrentPage] = useState('home') // 'home' or 'calendar'

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

  return (
    <>
      {currentPage === 'home' ? (
        <HomePage
          todoList={todoList}
          setTodoList={setTodoList}
          onNavigateToCalendar={() => setCurrentPage('calendar')}
        />
      ) : (
        <CalendarPage
          onNavigateToHome={() => setCurrentPage('home')}
        />
      )}
    </>
  )
}

export default App
