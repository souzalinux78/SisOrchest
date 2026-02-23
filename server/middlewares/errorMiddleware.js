export const errorMiddleware = (err, req, res, next) => {
    const status = err.status || 500
    const message = err.message || 'Erro interno no servidor.'

    // Log estruturado do erro (sem expor stack em produção)
    console.error(`[BACKEND ERROR] ${new Date().toISOString()}`, {
        method: req.method,
        url: req.url,
        status,
        message,
        stack: process.env.NODE_ENV === 'production' ? 'REDACTED' : err.stack,
        user: req.user ? req.user.sub : 'anonymous'
    })

    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    })
}

export const notFoundMiddleware = (req, res) => {
    res.status(404).json({
        success: false,
        message: 'Rota não encontrada.'
    })
}
