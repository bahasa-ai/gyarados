import { Test as TestModel } from '../../Model/Test'
import { ApiModelFactory } from '../ControllerFactory'
import { JWTAuth } from '../Middleware/Authorization'

export class Test extends ApiModelFactory {

  public Model = TestModel

  protected middlewares = [
    {
      methods: '*',
      middlewares: [
        JWTAuth()
      ]
    }
  ]
}