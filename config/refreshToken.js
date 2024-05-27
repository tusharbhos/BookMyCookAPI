import jwt from "jsonwebtoken";

export const generateRefreshToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET_KEY, { expiresIn: "3d" })
}