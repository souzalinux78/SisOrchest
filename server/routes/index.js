import express from 'express'
import { authRouter } from './auth.js'
import { commonsRouter } from './commons.js'
import { musiciansRouter } from './musicians.js'
import { servicesRouter } from './services.js'
import { attendanceRouter } from './attendance.js'
import { usersRouter } from './users.js'
import reportsRouter from './reports.js'

const router = express.Router()

router.use('/commons', commonsRouter)
router.use('/musicians', musiciansRouter)
router.use('/services', servicesRouter)
router.use('/attendance', attendanceRouter)
router.use('/users', usersRouter)
router.use('/auth', authRouter)
router.use('/reports', reportsRouter)

export default router
