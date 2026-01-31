import type { Common } from './api'

const buildCommonOptions = (commons: Common[]) => {
  const options = commons
    .map((common) => `<option value="${common.id}">${common.name.toUpperCase()}</option>`)
    .join('')
  return `<option value="">Selecione uma comum</option>${options}`
}

export const refreshCommonSelects = (commons: Common[]) => {
  const commonSelects = [
    document.getElementById('musician-common') as HTMLSelectElement | null,
    document.getElementById('service-common') as HTMLSelectElement | null,
    document.getElementById('user-common') as HTMLSelectElement | null,
  ]

  commonSelects.forEach((select) => {
    if (!select) return
    select.innerHTML = buildCommonOptions(commons)
  })
}
