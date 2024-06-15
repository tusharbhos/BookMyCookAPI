import jwt from 'jsonwebtoken'
import createError from 'http-errors'
import { redis } from '../configs/redis'
import User from '../models/userModel'
import { validMongoDbId } from './validMongoDbId'


export const signRefreshToken = (userId) => {
    return new Promise((resolve, reject) => {

        const payload = {}
        const secret = process.env.REFRESH_TOKEN_SECRET
        const options = {
            expiresIn: '1y',
            issuer: "CraveCater",
            audience: [userId]
        }

        jwt.sign(payload, secret, options, (err, token) => {
            if (err) {
                console.log(err.message)
                reject(createError.InternalServerError())
            }

            redis.set(userId, token, 'EX', 365 * 24 * 60 * 60, (err, reply) => {
                if (err) {
                    console.log(err.message)
                    reject(createError.InternalServerError())
                }
                resolve(token)
            })
        })
    })
}

export const verifyRefreshToken = (refreshToken) => {
    return new Promise((resolve, reject) => {
        jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, payload) => {
            if (err) return reject(createError.Unauthorized())
            const userId = payload.aud

            redis.get(userId, (err, result) => {
                if (err) {
                    console.log(err.message)
                    reject(createError.InternalServerError())
                    return
                }

                if (refreshToken === result) return resolve(userId)
                reject(createError.Unauthorized())
            })
        })
    })
}

const accessTokenExpire = parseInt(
    process.env.ACCESS_TOKEN_EXPIRE || "300",
    10
);

const refreshTokenExpire = parseInt(
    process.env.REFRESH_TOKEN_EXPIRE || "1200",
    10
);

// options for cookies
export const accessTokenOptions = {
    expires: new Date(Date.now() + accessTokenExpire * 60 * 60 * 1000),
    maxAge: accessTokenExpire * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure: true,
};

export const refreshTokenOptions = {
    expires: new Date(Date.now() + refreshTokenExpire * 24 * 60 * 60 * 1000),
    maxAge: refreshTokenExpire * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: "none",
    secure: true,
};

export const sendToken = (user, statusCode, res) => {
    const accessToken = user.SignAccessToken();
    const refreshToken = user.SignRefreshToken();
    // upload session to redis

    redis.set(user._id, JSON.stringify(user));

    res.cookie("accessToken", accessToken, accessTokenOptions);
    res.cookie("refreshToken", refreshToken, refreshTokenOptions);
    res.status(statusCode).json({
        success: "Login Successful!",
        user,
        accessToken,
    });
};