import { Request, Response } from 'express'
import { Test } from './Test'
import { RouterFactory } from '../ControllerFactory'
import { JWTAuth } from '../Middleware/Authorization'

export class V1 extends RouterFactory {

  routes = [
    { // this is the static API in /api/v1/hi
      method: 'get',
      endpoint: '/hi',
      middlewares: [
        JWTAuth()
      ],
      handler: (_: Request, res: Response): any => {
        return res.send({ hello: true })
      }
    },
    { api: new Test().build() }   // use controller factory like this if you want to create Model CRUD
  ]
}