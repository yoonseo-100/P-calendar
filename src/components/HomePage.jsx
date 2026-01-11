import { useEffect, useRef } from 'react'

const todos = [
  { id: 'todo1', text: '8:40~18:00 대전 해커톤 멘토', checked: false },
  { id: 'todo2', text: '19:00~22:00 밋 Y2K모각작', checked: false },
  { id: 'todo3', text: '17:30 줌 WEC업무췍', checked: false },
  { id: 'todo4', text: '22:20~23:20 대전to수서', checked: false },
  { id: 'todo5', text: '인테리어 준비', checked: false },
]

function HomePage({ todoList, setTodoList, onNavigateToCalendar }) {
  const circleTableRef = useRef(null)
  const hourHandRef = useRef(null)
  const minuteHandRef = useRef(null)

  useEffect(() => {
    // 원형 시계 생성
    const data = [Array.from(Array(24).keys()).map(String)]
    
    if (!circleTableRef.current) return

    const pieMenu = document.createElement('div')
    pieMenu.id = 'pie-menu'
    pieMenu.classList.add('pie-outer')

    const vw = window.innerWidth
    const vh = window.innerHeight
    let widthPercentage = 90
    if (vw > vh) {
      widthPercentage = (vh * 0.9 / vw) * 100
    }
    const widthDelta = widthPercentage / data.length

    for (let i = 0; i < data.length; i++) {
      const dataItem = data[i]
      const numSegments = dataItem.length
      const segmentAngle = (Math.PI * 2) / numSegments
      const skewAngle = (Math.PI / 2) - segmentAngle

      const pie = document.createElement('div')
      const pieRotateAngle = (Math.PI / 2) - segmentAngle / 2
      pie.classList.add('pie')
      pie.style.width = `${widthPercentage}%`
      pie.style.transform = `translate(-50%,-50%) rotate(${pieRotateAngle}rad)`

      const pieList = document.createElement('ul')

      for (let j = 0; j < dataItem.length; j++) {
        const rotationAngle = segmentAngle * j
        const dataContent = dataItem[j]
        const pieListItem = document.createElement('li')
        const pieItemAnchor = document.createElement('a')
        const pieItemDeco1 = document.createElement('div')
        pieItemDeco1.className = 'deco1'
        const pieItemDeco2 = document.createElement('div')
        pieItemDeco2.className = 'deco2'

        pieListItem.style.transform = `rotate(${rotationAngle}rad) skew(${skewAngle}rad)`
        pieItemAnchor.appendChild(document.createTextNode(dataContent))
        const anchorRotate = segmentAngle / 2 - Math.PI / 2
        const anchorSkew = segmentAngle - Math.PI / 2
        pieItemAnchor.style.transform = `skew(${anchorSkew}rad) rotate(${anchorRotate}rad)`

        pieListItem.appendChild(pieItemAnchor)
        pieItemAnchor.appendChild(pieItemDeco1)
        pieItemAnchor.appendChild(pieItemDeco2)
        pieList.appendChild(pieListItem)
      }
      pie.appendChild(pieList)
      pieMenu.appendChild(pie)
      widthPercentage -= widthDelta
    }

    // 시침/분침 요소 생성
    const hands = document.createElement('div')
    hands.className = 'hands'

    const hourHand = document.createElement('div')
    hourHand.className = 'hour-hand'
    hourHandRef.current = hourHand

    const minuteHand = document.createElement('div')
    minuteHand.className = 'minute-hand'
    minuteHandRef.current = minuteHand

    const centerDot = document.createElement('div')
    centerDot.className = 'center-dot'

    hands.appendChild(hourHand)
    hands.appendChild(minuteHand)
    pieMenu.appendChild(hands)
    pieMenu.appendChild(centerDot)

    circleTableRef.current.appendChild(pieMenu)

    // 시계 업데이트
    const updateClock = () => {
      const now = new Date()
      const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600
      const minutes = now.getMinutes() + now.getSeconds() / 60

      const hourDeg = (hours / 24) * 360
      const minuteDeg = (minutes / 60) * 360

      if (hourHandRef.current) {
        hourHandRef.current.style.transform = `rotate(${hourDeg}deg)`
      }
      if (minuteHandRef.current) {
        minuteHandRef.current.style.transform = `rotate(${minuteDeg}deg)`
      }
    }

    updateClock()
    const interval = setInterval(updateClock, 1000)

    return () => {
      clearInterval(interval)
      if (circleTableRef.current && pieMenu.parentNode) {
        pieMenu.parentNode.removeChild(pieMenu)
      }
    }
  }, [])

  const handleTodoChange = (id) => {
    setTodoList(todoList.map(todo => 
      todo.id === id ? { ...todo, checked: !todo.checked } : todo
    ))
  }

  const currentDate = new Date()
  const dateStr = `${currentDate.getFullYear()}/${String(currentDate.getMonth() + 1).padStart(2, '0')}/${String(currentDate.getDate()).padStart(2, '0')}`
  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const dayName = dayNames[currentDate.getDay()]

  return (
    <section className="frame loca-home">
      <header></header>
      <div className="content">
        <h1 className="title">POTEBOOK</h1>
        <div className="circleTable" ref={circleTableRef}></div>
        <div className="todoList">
          <div className="headBox">
            <div className="date">
              <h2><b>{dateStr} {dayName}</b>요일</h2>
            </div>
            <div className="controlBox">
              <button className="btnPrev">◀</button>
              <button className="btnNext">▶</button>
            </div>
          </div>
          <div className="contBox">
            <ul>
              {todoList.map((todo) => (
                <li key={todo.id}>
                  <input
                    type="checkbox"
                    id={todo.id}
                    checked={todo.checked}
                    onChange={() => handleTodoChange(todo.id)}
                  />
                  <label htmlFor={todo.id}>
                    <h4 className="text">{todo.text}</h4>
                  </label>
                </li>
              ))}
            </ul>
            <button onClick={onNavigateToCalendar} className="detailBtn" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <h4>자세히 보기→</h4>
            </button>
          </div>
        </div>
      </div>
      <footer></footer>
    </section>
  )
}

export default HomePage


