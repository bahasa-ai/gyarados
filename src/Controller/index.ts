import { Request, Response } from 'express'
import { readFileSync } from 'fs'
import { RouterFactory } from './ControllerFactory'
import { V1 } from './V1'

export class Api extends RouterFactory {

  routes = [
    {
      method: 'get',
      endpoint: '/ping',
      handler: (_: Request, res: Response): any => res.send({ pong: 1 })
    },
    {
      method: 'get',
      endpoint: '/version',
      handler: (_: Request, res: Response): any => {
        const pkg: { version: string } = JSON.parse(readFileSync(__dirname + '/../../package.json', 'utf-8'))
        return res.send({ version: pkg.version })
      }
    },
    {
      endpoint: '/v1',
      api: new V1().register()
    }
  ]
}
