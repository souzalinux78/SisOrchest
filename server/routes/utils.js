import jwt from 'jsonwebtoken'
import { config } from '../config.js'

export const handleError = (res, error, message = 'Erro interno no servidor.') => {
  console.error(message, error)
  res.status(500).json({ message })
}

export const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return next()

  const [type, token] = authHeader.split(' ')
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Token inválido.' })
  }

  try {
    req.user = jwt.verify(token, config.jwt.secret)
    return next()
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido ou expirado.' })
  }
}
