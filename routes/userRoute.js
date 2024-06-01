import express from "express";
import { loginUser, logoutUser, registerUser, refreshToken } from "../controllers/userControllers";
import { isAuthenticated } from '../middlewares/isAuthenticated'

export const userRouter = express.Router()

userRouter.post('/register-user', registerUser)
userRouter.post('/login-user', loginUser)
userRouter.delete('/logout-user', logoutUser)
userRouter.post('/refresh-token', isAuthenticated, refreshToken)

