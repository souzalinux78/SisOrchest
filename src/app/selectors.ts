import type { Common } from './api'

const buildCommonOptions = (commons: Common[], placeholder = 'Selecione uma comum') => {
  const options = commons
    .map((common) => `<option value="${common.id}">${common.name.toUpperCase()}</option>`)
    .join('')
  return `<option value="">${placeholder}</option>${options}`
}

export const refreshCommonSelects = (commons: Common[]) => {
  const commonSelects = [
    document.getElementById('musician-common') as HTMLSelectElement | null,
    document.getElementById('service-common') as HTMLSelectElement | null,
    document.getElementById('user-common') as HTMLSelectElement | null,
    document.getElementById('self-common-select') as HTMLSelectElement | null,
  ]

  commonSelects.forEach((select) => {
    if (!select) return
    const isSelfRegister = select.id === 'self-common-select'
    select.innerHTML = buildCommonOptions(
      commons,
      isSelfRegister ? 'Selecione uma comum (opcional)' : 'Selecione uma comum',
    )
  })
}
