import { NextFunction, Request, RequestHandler, Response } from 'express'

type Options = any

export function JWTAuth(_?: Options): RequestHandler {
  return async (_req: Request, _res: Response, next: NextFunction): Promise<any> => {
    // validate the user requests here

    return next()
  }
}
