export const setText = (id: string, value: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.textContent = value
  }
}

export const setHtml = (id: string, html: string) => {
  const element = document.getElementById(id)
  if (element) {
    element.innerHTML = html
  }
}

export const setButtonLoading = (button: HTMLButtonElement | null, isLoading: boolean, label?: string) => {
  if (!button) return
  if (isLoading) {
    button.classList.add('is-loading')
    if (label) button.dataset.originalLabel = button.textContent ?? ''
    if (label) button.textContent = label
    button.disabled = true
  } else {
    button.classList.remove('is-loading')
    if (button.dataset.originalLabel) {
      button.textContent = button.dataset.originalLabel
      delete button.dataset.originalLabel
    }
    button.disabled = false
  }
}

export const setTextLoading = (ids: string[]) => {
  ids.forEach((id) => {
    const element = document.getElementById(id)
    if (element) {
      element.classList.add('skeleton-text')
      element.textContent = 'Carregando'
    }
  })
}

export const clearTextLoading = (ids: string[]) => {
  ids.forEach((id) => {
    const element = document.getElementById(id)
    if (element) {
      element.classList.remove('skeleton-text')
    }
  })
}

export const setTableLoading = (tableBodyId: string, columns: number) => {
  const element = document.getElementById(tableBodyId)
  if (!element) return
  const skeletonCell = '<td><span class="skeleton-line"></span></td>'
  const row = `<tr class="skeleton-row">${skeletonCell.repeat(columns)}</tr>`
  element.innerHTML = row.repeat(4)
  element.closest('.data-card')?.classList.add('is-loading')
}

export const clearTableLoading = (tableBodyId: string) => {
  const element = document.getElementById(tableBodyId)
  if (!element) return
  element.closest('.data-card')?.classList.remove('is-loading')
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date)
}

export const formatServiceSchedule = (weekday?: string | null, time?: string | null) => {
  const safeWeekday = weekday ?? '--'
  const safeTime = time ? time.slice(0, 5) : '--'
  return `${safeWeekday} às ${safeTime}`
}

export const formatDate = (value?: string | null) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(date)
}
