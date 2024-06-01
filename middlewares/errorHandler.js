import createError from 'http-errors'

export const notFound = (req, res, next) => {
    next(createError.NotFound(`${req.originalUrl} not found`))
}

export const errorHandler = (err, req, res, next) => {
    res.status(err.status || 500)
    res.send({
        error: {
            status: err?.status || 500,
            message: err?.message
        }
    })
}