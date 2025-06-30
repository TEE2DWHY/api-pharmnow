import { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import jwt from "jsonwebtoken";
import asyncWrapper from "../middlewares/asyncWrapper";

declare global {
  namespace Express {
    interface Request {
      user?: {
        email: string;
        userId: string;
        userType?: "User" | "Pharmacy";
      };
    }
  }
}

interface JWTPayload {
  email: string;
  userId: string;
  userType?: "User" | "Pharmacy";
  iat?: number;
  exp?: number;
}

export const authorization = asyncWrapper(
  async (req: Request, res: Response, next: NextFunction) => {
    const authToken = req.headers.authorization;

    if (!authToken || !authToken.startsWith("Bearer")) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Unauthorized User. Please provide a valid token.",
      });
    }

    const token = authToken.split(" ")[1];

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "No token provided.",
      });
    }

    try {
      const decodedToken = jwt.verify(
        token,
        process.env.JWT_SECRET as string
      ) as JWTPayload;

      if (!decodedToken) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Invalid Token",
        });
      }

      req.user = {
        email: decodedToken.email,
        userId: decodedToken.userId,
        userType: decodedToken.userType,
      };

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Token has expired. Please login again.",
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
          success: false,
          message: "Invalid token format.",
        });
      }

      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: "Token verification failed.",
      });
    }
  }
);

// export const authorizeRoles = (...roles: ("User" | "Pharmacy")[]) => {
//   return asyncWrapper(
//     async (req: Request, res: Response, next: NextFunction) => {
//       if (!req.user) {
//         return res.status(StatusCodes.UNAUTHORIZED).json({
//           success: false,
//           message: "Access denied. Please authenticate first.",
//         });
//       }

//       if (!req.user.userType || !roles.includes(req.user.userType)) {
//         return res.status(StatusCodes.FORBIDDEN).json({
//           success: false,
//           message: `Access denied. This resource requires ${roles.join(
//             " or "
//           )} access.`,
//         });
//       }

//       next();
//     }
//   );
// };

export default authorization;
