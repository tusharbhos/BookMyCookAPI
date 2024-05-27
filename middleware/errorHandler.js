// not found

export const notFound = (req, res, next) => {
    const error = new Error(`NOT FOUND : ${req.originalUrl}`)
    res.status(400)
    next(error)
}

export const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode == 200 ? 500 : res.statusCode
    res.status(statusCode)
    res.json({
        message: err?.message,
        error: err?.stack
    })
}