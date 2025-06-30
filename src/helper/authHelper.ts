import jwt, { SignOptions } from "jsonwebtoken";

interface JWTPayload {
  email: string;
  userId: string;
  userType?: string;
}

export const generateToken = (user: JWTPayload): string => {
  const { email, userId, userType } = user;

  const payload: JWTPayload = { email, userId, userType };

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set.");
  }

  const expiresIn = process.env.JWT_EXPIRES_IN as SignOptions["expiresIn"];

  const options: SignOptions = { expiresIn };

  return jwt.sign(payload, jwtSecret, options);
};
