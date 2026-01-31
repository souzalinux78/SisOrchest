import { loadAttendanceList, loadAttendanceLookups, setupAttendanceForm } from './attendance'
import { loadCommonsList, setupCommonsForm } from './commons'
import { loadDashboardData } from './dashboard'
import { setupMusiciansForm, loadMusiciansList } from './musicians'
import { loadReports, setupReports } from './reports'
import { setupServicesForm, loadServicesList } from './services'
import { getCurrentUser } from './session'
import { loadUsersList, setupUsersForm } from './users'

export const setupFeatureHandlers = () => {
  setupMusiciansForm()
  setupServicesForm()
  setupAttendanceForm()
  setupCommonsForm()
  setupUsersForm()
  setupReports()
}

export const loadAllData = async () => {
  const currentUser = getCurrentUser()
  const commonId = currentUser?.role === 'admin' ? null : currentUser?.common_id ?? null

  await loadDashboardData(commonId)
  if (currentUser?.role === 'admin') {
    await loadCommonsList()
  }
  await loadMusiciansList(commonId)
  await loadServicesList()
  await loadAttendanceList(commonId)
  await loadAttendanceLookups()
  await loadUsersList()
  await loadReports()
}
