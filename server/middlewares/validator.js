/**
 * Middleware genérico para validação de esquemas (ex: via Zod ou Yup)
 * Neste projeto, como não há Zod/Yup instalados, implementamos uma 
 * validação simples baseada em regras passadas ou apenas um wrapper.
 */

export const validate = (schema) => (req, res, next) => {
    try {
        // Aqui poderíamos usar schema.parse(req.body) se tivéssemos Zod
        // Por enquanto, apenas um placeholder para futura evolução SOLID
        next()
    } catch (error) {
        res.status(400).json({
            success: false,
            message: 'Dados inválidos.',
            errors: error.errors
        })
    }
}

/**
 * Middleware para sanitização básica de strings no body
 */
export const sanitize = (req, res, next) => {
    if (req.body) {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim()
            }
        }
    }
    next()
}
