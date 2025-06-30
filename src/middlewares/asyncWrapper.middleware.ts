import { Request, Response, NextFunction } from "express";

const asyncWrapper = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
      console.log(err);
    }
  };
};

export default asyncWrapper;
