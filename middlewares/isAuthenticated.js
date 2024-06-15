import jwt from 'jsonwebtoken'
import User from '../models/userModel'
import { redis } from '../configs/redis'
import { updateAccessToken } from '../controllers/userController';


export const isAuthenticated = (
    async (req, res, next) => {
        const access_token = req.cookies.accessToken;

        if (!access_token) {
            return next(
                new Error("Please login to access this resource", 400)
            );
        }

        const decoded = jwt.decode(access_token);

        if (!decoded) {
            return next(new Error("access token is not valid", 400));
        }

        // check if the access token is expired
        if (decoded.exp && decoded.exp <= Date.now() / 1000) {
            try {
                await updateAccessToken(req, res, next);
            } catch (error) {
                return next(error);
            }
        } else {
            const user = await redis.get(decoded.id);

            if (!user) {
                return next(
                    new Error("Please login to access this resource", 400)
                );
            }

            req.user = JSON.parse(user);

            next();
        }
    }
);
