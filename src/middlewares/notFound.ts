import { StatusCodes } from "http-status-codes";
import { Request, Response } from "express";

const notFound = (req: Request, res: Response) => {
  res.status(StatusCodes.NOT_FOUND).json({
    message: "Route Does Not Exist.",
  });
};

export default notFound;
