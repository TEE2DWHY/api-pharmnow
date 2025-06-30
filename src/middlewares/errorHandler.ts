import { Request, Response, NextFunction } from "express";
import { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";
import { StatusCodes } from "http-status-codes";

const errorHandler = async (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let payload = null;
  let hasErrors = true;
  let message = err.message;

  if (err.name === "ValidationError") {
    message = err.message;
  } else if (err.code === 11000) {
    message = `${Object.keys(err.keyValue)} is taken already.`;
  } else if (err.name === "CastError") {
    message = `${Object.keys(err.value)} is not found in database.`;
  } else if (err instanceof TokenExpiredError) {
    message = "Token has expired.";
  } else if (err instanceof JsonWebTokenError) {
    message = "Invalid token. Please provide a valid token.";
  } else if (err) {
    console.log(err);
  }

  res.status(getStatusCode(err)).json({
    payload,
    hasErrors,
    message,
  });
};

const getStatusCode = (err: any) => {
  if (err.name === "ValidationError") {
    return StatusCodes.UNAUTHORIZED;
  }
  if (err.code === 11000 || err.name === "CastError") {
    return StatusCodes.BAD_REQUEST;
  }
  if (err instanceof TokenExpiredError || err instanceof JsonWebTokenError) {
    return StatusCodes.UNAUTHORIZED;
  }
  return StatusCodes.INTERNAL_SERVER_ERROR;
};

export default errorHandler;
