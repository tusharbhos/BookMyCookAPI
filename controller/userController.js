import { generateToken } from "../config/jwtToken";
import { generateRefreshToken } from "../config/refreshToken";
import User from "../model/userModel";
import asyncHandler from "express-async-handler";
import { validateMongoDbId } from "../utils/validateMongoDbId"
import jwt from "jsonwebtoken";
import { sendEmail } from "./emailController";
import crypto from 'crypto'
import uniqid from 'uniqid'
import { redis } from "../utils/redis"


export const registerUser = async () => {

    // Check n database if already is present or not
}