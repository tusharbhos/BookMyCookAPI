import express from "express";
import { loginUser, activateAccount, logoutUser, registerUser, refreshToken } from "../controllers/userController";
import { isAuthenticated } from '../middlewares/isAuthenticated'

export const userRouter = express.Router()

userRouter.post('/register', registerUser)
userRouter.post('/activate-account', activateAccount)
userRouter.post('/login', loginUser)
userRouter.get('/logout', isAuthenticated, logoutUser)
userRouter.post('/refresh-token', isAuthenticated, refreshToken)

