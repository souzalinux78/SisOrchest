import type { User } from './api'

const toggleElement = (selector: string, shouldShow: boolean) => {
  const element = document.querySelector(selector) as HTMLElement | null
  if (!element) return
  element.style.display = shouldShow ? '' : 'none'
}

export const applyPermissions = (user: User) => {
  const isAdmin = user.role === 'admin'
  const isManager = user.role === 'manager'

  toggleElement('.menu__item[data-view="commons"]', isAdmin)
  toggleElement('.menu__item[data-view="users"]', isAdmin || isManager)

  toggleElement('.view[data-view="commons"]', isAdmin)
  toggleElement('.view[data-view="users"]', isAdmin || isManager)
  toggleElement('.view[data-view="users"] .form-card', isAdmin)
  toggleElement('#users-export', isAdmin)

  const musicianCommon = document.getElementById('musician-common') as HTMLSelectElement | null
  const serviceCommon = document.getElementById('service-common') as HTMLSelectElement | null
  const musicianCommonLabel = document.getElementById('musician-common-label') as HTMLLabelElement | null
  const serviceCommonLabel = document.getElementById('service-common-label') as HTMLLabelElement | null

  if (!isAdmin && user.common_id) {
    if (musicianCommon) {
      musicianCommon.value = String(user.common_id)
      musicianCommon.disabled = true
    }
    if (serviceCommon) {
      serviceCommon.value = String(user.common_id)
      serviceCommon.disabled = true
    }
    if (musicianCommonLabel) musicianCommonLabel.style.display = 'none'
    if (serviceCommonLabel) serviceCommonLabel.style.display = 'none'
  }
}

export const resetPermissions = () => {
  toggleElement('.menu__item[data-view="commons"]', true)
  toggleElement('.menu__item[data-view="users"]', true)
  toggleElement('.view[data-view="commons"]', true)
  toggleElement('.view[data-view="users"]', true)

  const musicianCommon = document.getElementById('musician-common') as HTMLSelectElement | null
  if (musicianCommon) {
    musicianCommon.disabled = false
  }

  const serviceCommon = document.getElementById('service-common') as HTMLSelectElement | null
  if (serviceCommon) {
    serviceCommon.disabled = false
  }

  const musicianCommonLabel = document.getElementById('musician-common-label') as HTMLLabelElement | null
  const serviceCommonLabel = document.getElementById('service-common-label') as HTMLLabelElement | null
  if (musicianCommonLabel) musicianCommonLabel.style.display = ''
  if (serviceCommonLabel) serviceCommonLabel.style.display = ''
}
