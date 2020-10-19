import { Request, Response } from 'express'
import { RouterFactory } from '../ControllerFactory'
import { JWTAuth } from '../Middleware/Authorization'

export class V1 extends RouterFactory {

  routes = [
    {
      method: 'get',
      endpoint: '/hi',
      middlewares: [
        JWTAuth()
      ],
      handler: (_: Request, res: Response): any => {
        return res.send({ hello: true })
      }
    }
  ]
}