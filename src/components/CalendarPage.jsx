import { useEffect, useRef } from 'react'

const WEEK_START = 'MON'
const CURRENT_DATE = new Date()

const scheduleData = {
  types: ['해커톤 멘토', '외부 미팅', '내부 회의', '프로젝트 마감', '코드 리뷰', '팀 빌딩', '클라이언트 미팅', '기술 세미나'],
  timeSlots: [
    { start: '09', end: '18' },
    { start: '10', end: '12' },
    { start: '14', end: '16' },
    { start: '15', end: '17' },
    { start: '09', end: '11' },
    { start: '13', end: '15' }
  ]
}

function generateSchedulesForDate(date) {
  let schedulesPerWeek
  if (date < CURRENT_DATE) {
    schedulesPerWeek = Math.floor(Math.random() * 6) + 3
  } else if (date.toDateString() === CURRENT_DATE.toDateString()) {
    schedulesPerWeek = Math.floor(Math.random() * 6) + 3
  } else {
    schedulesPerWeek = Math.random() < 0.9 ? 0 : Math.floor(Math.random() * 2) + 1
  }
  
  let schedules = []
  for (let i = 0; i < schedulesPerWeek; i++) {
    const typeIdx = Math.floor(Math.random() * scheduleData.types.length)
    const timeIdx = Math.floor(Math.random() * scheduleData.timeSlots.length)
    const isDone = Math.random() > 0.4
    
    schedules.push({
      type: scheduleData.types[typeIdx],
      time: scheduleData.timeSlots[timeIdx],
      isDone: isDone
    })
  }
  return schedules
}

function CalendarPage({ onNavigateToHome }) {
  const calendarContainerRef = useRef(null)
  const contentRef = useRef(null)

  useEffect(() => {
    if (!calendarContainerRef.current) return

    const container = calendarContainerRef.current
    container.innerHTML = ''

    const startMonth = 9 // October (0-indexed)
    const startYear = 2025
    const monthsToGenerate = 6

    // Header row
    const headerRow = document.createElement('div')
    headerRow.className = 'calRow type-head'
    
    const days = WEEK_START === 'MON' 
      ? ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']
      : ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    
    const korDays = WEEK_START === 'MON'
      ? ['월', '화', '수', '목', '금', '토', '일']
      : ['일', '월', '화', '수', '목', '금', '토']
    
    days.forEach((day, idx) => {
      const cell = document.createElement('div')
      cell.className = 'calSell' + (idx >= 5 ? ' type-holi' : '')
      cell.innerHTML = `
        <div class="topic">
          <h5>${day}</h5>
          <h6>${korDays[idx]}</h6>
        </div>
      `
      headerRow.appendChild(cell)
    })
    
    container.appendChild(headerRow)

    // Generate calendar rows
    let currentRow = null
    let cellCount = 0

    for (let m = 0; m < monthsToGenerate; m++) {
      const month = (startMonth + m) % 12
      const year = startYear + Math.floor((startMonth + m) / 12)
      
      const firstDay = new Date(year, month, 1)
      const lastDay = new Date(year, month + 1, 0)
      const startOffset = WEEK_START === 'MON' 
        ? firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
        : firstDay.getDay()
      
      if (!currentRow || cellCount === 0) {
        currentRow = document.createElement('div')
        currentRow.className = 'calRow type-body'
        currentRow.setAttribute('data-month', `${year}-${month + 1}`)
        cellCount = 0
      }
      
      if (cellCount === 0) {
        for (let i = 0; i < startOffset; i++) {
          const emptyCell = document.createElement('div')
          emptyCell.className = 'calSell'
          currentRow.appendChild(emptyCell)
          cellCount++
        }
      }
      
      for (let day = 1; day <= lastDay.getDate(); day++) {
        if (cellCount === 7) {
          container.appendChild(currentRow)
          currentRow = document.createElement('div')
          currentRow.className = 'calRow type-body'
          currentRow.setAttribute('data-month', `${year}-${month + 1}`)
          cellCount = 0
        }
        
        const cell = document.createElement('div')
        const dayOfWeek = (startOffset + day - 1) % 7
        const isHoliday = WEEK_START === 'MON' ? dayOfWeek >= 5 : dayOfWeek === 0 || dayOfWeek === 6
        
        const cellDate = new Date(year, month, day)
        let className = 'calSell' + (isHoliday ? ' type-holi' : '')
        
        if (cellDate.toDateString() === CURRENT_DATE.toDateString()) {
          className += ' type-today'
        } else if (cellDate < CURRENT_DATE) {
          className += ' type-back'
        } else if (cellDate > CURRENT_DATE) {
          className += ' type-yet'
        }
        
        cell.className = className
        cell.setAttribute('data-date', `${year}-${month + 1}-${day}`)
        
        const schedules = generateSchedulesForDate(cellDate)
        const planHTML = schedules.map(schedule => {
          const doneClass = schedule.isDone ? ' type-done' : ''
          return `
            <div class="planItem${doneClass}">
              <div class="time">
                <span>${schedule.time.start}<br>~${schedule.time.end}</span>
              </div>
              <div class="info">
                <h6>${schedule.type}</h6>
              </div>
            </div>
          `
        }).join('')
        
        cell.innerHTML = `
          <div class="topic">
            <h5>${day}</h5>
            <h6 class="cont-weather">${Math.floor(Math.random() * 5) - 5}-${Math.floor(Math.random() * 10) + 5}˚</h6>
          </div>
          <div class="plan">${planHTML}</div>
        `
        
        currentRow.appendChild(cell)
        cellCount++
      }
    }
    
    if (currentRow && cellCount > 0) {
      while (cellCount < 7) {
        const emptyCell = document.createElement('div')
        emptyCell.className = 'calSell'
        currentRow.appendChild(emptyCell)
        cellCount++
      }
      container.appendChild(currentRow)
    }

    // Scroll to current week
    const dateStr = `${CURRENT_DATE.getFullYear()}-${CURRENT_DATE.getMonth() + 1}-${CURRENT_DATE.getDate()}`
    const targetCell = container.querySelector(`[data-date="${dateStr}"]`)
    
    if (targetCell && contentRef.current) {
      const row = targetCell.closest('.calRow')
      if (row) {
        setTimeout(() => {
          const offset = row.offsetTop - contentRef.current.offsetTop - 88
          contentRef.current.scrollTop = offset
        }, 100)
      }
    }

    // Setup sticky header
    if (contentRef.current) {
      const headerRow = container.querySelector('.calRow.type-head')
      if (headerRow) {
        const todayCell = container.querySelector(`[data-date="${CURRENT_DATE.getFullYear()}-${CURRENT_DATE.getMonth() + 1}-${CURRENT_DATE.getDate()}"]`)
        if (todayCell) {
          const todayDayOfWeek = CURRENT_DATE.getDay()
          const adjustedIndex = WEEK_START === 'MON' ? (todayDayOfWeek === 0 ? 6 : todayDayOfWeek - 1) : todayDayOfWeek
          const headerCells = headerRow.querySelectorAll('.calSell')
          if (headerCells[adjustedIndex]) {
            headerCells[adjustedIndex].classList.add('type-today')
          }
        }

        const stickyContainer = document.createElement('div')
        stickyContainer.className = 'sticky-header calendar'
        stickyContainer.style.cssText = 'position: sticky; top: 0; background: white; z-index: 10; display: none;'
        
        const stickyMonth = document.createElement('div')
        stickyMonth.className = 'calRow type-month-title'
        stickyMonth.innerHTML = '<h4>2025년 10월</h4>'
        
        const stickyHeader = headerRow.cloneNode(true)
        stickyHeader.className = 'calRow type-head'
        
        stickyContainer.appendChild(stickyMonth)
        stickyContainer.appendChild(stickyHeader)
        contentRef.current.insertBefore(stickyContainer, contentRef.current.firstChild)
        
        contentRef.current.addEventListener('scroll', () => {
          const offset = 100
          const rows = Array.from(container.querySelectorAll('.calRow.type-body'))
          
          let currentMonth = '2025-10'
          for (let row of rows) {
            const rowTop = row.offsetTop - contentRef.current.offsetTop
            if (rowTop >= contentRef.current.scrollTop + offset) {
              break
            }
            currentMonth = row.getAttribute('data-month')
          }
          
          stickyMonth.innerHTML = `<h4>${currentMonth.split('-')[0]}년 ${currentMonth.split('-')[1]}월</h4>`
          stickyContainer.style.display = 'block'
        })
      }
    }
  }, [])

  return (
    <section className="frame loca-calendar">
      <header></header>
      <nav>
        <div className="tabs">
          <button type="button" className="tabItem" onClick={onNavigateToHome}>
            <h4>홈</h4>
          </button>
          <button type="button" className="tabItem NOW">
            <h4>개인일정</h4>
          </button>
        </div>
        <div className="control"></div>
      </nav>
      <div className="content" ref={contentRef}>
        <div className="calendar" ref={calendarContainerRef}></div>
      </div>
      <footer></footer>
    </section>
  )
}

export default CalendarPage


