import jwt from 'jsonwebtoken'
import { config } from '../config.js'

const createHttpError = (status, message) => {
  const error = new Error(message)
  error.status = status
  return error
}

const parsePositiveInt = (value, fieldName) => {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createHttpError(400, `${fieldName} invalido.`)
  }
  return parsed
}

export const handleError = (res, error, message = 'Erro interno no servidor.') => {
  const status = error?.status && Number.isInteger(error.status) ? error.status : 500
  const responseMessage = status === 500 ? message : error?.message ?? message
  console.error(message, error)
  res.status(status).json({ message: responseMessage })
}

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return next()

  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token invalido.' })
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret)
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Token invalido ou expirado.' })
  }
}

export const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    return res.status(401).json({ message: 'Autenticacao obrigatoria.' })
  }

  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token invalido.' })
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret)
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Token invalido ou expirado.' })
  }
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user?.role || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Perfil sem permissao para esta operacao.' })
  }
  return next()
}

export const resolveScopedCommonId = (req, requestedCommonId, options = {}) => {
  const { requiredForAdmin = false } = options
  const isAdmin = req.user?.role === 'admin'
  const hasRequested = requestedCommonId !== undefined && requestedCommonId !== null && requestedCommonId !== ''

  if (isAdmin) {
    if (!hasRequested) {
      if (requiredForAdmin) {
        throw createHttpError(400, 'Comum e obrigatoria.')
      }
      return null
    }
    return parsePositiveInt(requestedCommonId, 'Comum')
  }

  const userCommonId = parsePositiveInt(req.user?.common_id, 'Comum do usuario')
  if (!hasRequested) {
    return userCommonId
  }

  const requested = parsePositiveInt(requestedCommonId, 'Comum')
  if (requested !== userCommonId) {
    throw createHttpError(403, 'Acesso negado para dados de outra comum.')
  }

  return userCommonId
}
