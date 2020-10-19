import { Request, RequestHandler, Response, Router } from 'express'
import moment from 'moment-timezone'
import pluralize from 'pluralize'
import { ObjectLiteral, SelectQueryBuilder } from 'typeorm'
import { RequestWrapper } from '../Util/RequestWrapper'

type SimpleRouteType = {
  method: string,
  endpoint: string,
  middlewares?: RequestHandler[],
  handler: RequestHandler
}

type ApiRouteType = {
  endpoint?: string,
  middlewares?: RequestHandler[],
  api: Router
}

export abstract class RouterFactory {

  abstract routes: (SimpleRouteType | ApiRouteType)[]

  public register(): Router {
    const router = Router({ mergeParams: true })
    this.routes?.map(route => {
      const buildMiddlewares = route.middlewares?.map(middleware => RequestWrapper((req, res, next) => middleware(req, res, next))) || []
      if ((route as ApiRouteType).api) {
        return router.use(route.endpoint || '/', ...buildMiddlewares, (route as ApiRouteType).api)
      }
      if (buildMiddlewares?.length) {
        router.use((route as SimpleRouteType).endpoint, ...buildMiddlewares)
      }
      return router[(route as SimpleRouteType).method]((route as SimpleRouteType).endpoint, (route as SimpleRouteType).handler)
    })
    return router
  }
}

export abstract class ApiFactory {

  protected middlewares: {
    methods: ('find' | 'get' | 'create' | 'update' | 'delete' | 'softDelete' | 'restore' | string)[] | string,
    middlewares: RequestHandler[]
  }[] = []

  protected actions: { [name: string]: { method: string, endpoint: string } }

  protected routerFactory: RouterFactory

  public constructor(protected name?: string) {
    this.name = name !== undefined && name !== null ? name : `/${this.constructor.name[0].toLowerCase()}${this.constructor.name.slice(1)}`
  }

  protected buildMiddlewares(method: string): RequestHandler[] {
    return this.middlewares.find(handler => handler.methods === '*' || handler.methods.includes(method))?.middlewares?.map(middleware => RequestWrapper((req, res, next) => middleware(req, res, next))) || []
  }

  public build(): Router {
    const router = this.routerFactory ? this.routerFactory.register() : Router({ mergeParams: true })
    if (this.actions) {
      for (const route of Object.keys(this.actions)) {
        router[this.actions[route].method](`${this.name}${this.actions[route].endpoint}`, ...this.buildMiddlewares(route), RequestWrapper((req, res) => this[route](req, res)))
      }
    }
    return router
  }
}

export abstract class ApiModelFactory extends ApiFactory {
  abstract Model: (new () => any) & { [any: string]: any }

  protected middlewares: {
    methods: ('find' | 'get' | 'create' | 'update' | 'delete' | 'softDelete' | 'restore' | string)[] | string,
    middlewares: RequestHandler[]
  }[] = []

  protected excludes: ('find' | 'get' | 'create' | 'update' | 'delete' | 'softDelete' | 'restore' | string)[] = []

  protected includes: ('find' | 'get' | 'create' | 'update' | 'delete' | 'softDelete' | 'restore' | string)[] = [
    'find', 'get', 'create', 'update', 'delete', 'softDelete', 'restore'
  ]

  protected parameterId = {
    path: ':id',
    validate: (params: { [key: string]: any }): boolean => {
      if (isNaN(Number(params.id))) {
        throw { status: 400, body: { error: 'ID is not valid' } }
      }
      return true
    }
  }

  public constructor(protected name?: string) {
    super(name)
    this.name = name || this.constructor.name[0].toLowerCase() + this.constructor.name.slice(1)
  }

  protected where(_req: Request): [string?, ObjectLiteral?] {
    return []
  }

  protected query(_req: Request): SelectQueryBuilder<any> {
    return this.Model.createQueryBuilder(this.getModelName())
  }

  protected async find(req: Request, res: Response): Promise<any> {
    const beforeEventData = await (this as any).beforeFind?.(req, res)
    req = beforeEventData?.req || req
    res = beforeEventData?.res || res

    let query = this.query(req)
    const { skip, take, withDeleted, orderBy, ...where } = req.query
    if (withDeleted) {
      query = query.withDeleted()
    }
    if (req.body.search || Object.keys(where).length) {
      for (const field of Object.keys(where)) {
        if (where[field] === 'null') {
          where[field] = null
        }
      }
      query = query.where(req.body.search || where)
      if (this.where(req)?.length) {
        query = query.andWhere(...this.where(req))
      }
    } else if (this.where(req)?.length) {
      query = query.where(...this.where(req))
    }
    if (req.body.orderBy || orderBy) {
      const order = req.body.orderBy || (orderBy as string).split(',').reduce((res, data) => ({ ...res, [data.split(':')[0]]: data.split(':')[1] }), {})
      query = query.orderBy(order)
    }
    const [models, length] = await query
      .skip(Number(skip) || 0)
      .take(Number(take) || 0)
      .getManyAndCount()

    const afterEventData = await (this as any).afterFind?.(req, res, this.rawBeautifier(req, models))
    return res.send({ [pluralize(this.name)]: afterEventData?.models || this.rawBeautifier(req, models), length })
  }

  protected async get(req: Request, res: Response): Promise<any> {
    const beforeEventData = await (this as any).beforeGet?.(req, res)
    req = beforeEventData?.req || req
    res = beforeEventData?.res || res

    const query = this.query(req)
    const paramKeys = Object.keys(req.params).filter(p => this.parameterId.path.includes(p))
    this.parameterId.validate(req.params)

    const where = paramKeys.reduce((res, key) => ({ ...res, [`${key}`]: req.params[key] }), {})

    const model = this.rawBeautifier(req, await (this.where(req).length
      ? query.where(where).andWhere(...this.where(req))
      : query.where(where))
      .getOne())
    // const model = await query.where(this.where(req)).andWhere(`${this.Model.name}.id = :id`, { id }).getOne()
    if (!model) {
      throw { status: 404, body: { error: 'Resource not found' } }
    }

    const afterEventData = await (this as any).afterGet?.(req, res, model)
    return res.send({ [this.name]: afterEventData?.model || model })
  }

  protected async create(req: Request, res: Response): Promise<any> {
    const beforeEventData = await (this as any).beforeCreate?.(req, res)
    req = beforeEventData?.req || req
    res = beforeEventData?.res || res

    const query = this.where(req).length ? this.query(req).where(...this.where(req)) : this.query(req)
    if (!req.body[this.name]) {
      throw { status: 400, body: { error: `${this.name} object in body is required` } }
    }

    let insertResult: any
    try {
      insertResult = await query.insert().values(req.body[this.name]).returning('*').execute()
    } catch (error) {
      if (error.code === '23502') {
        throw { status: 400, body: { error: error.message } }
      }
      throw error
    }
    const model = insertResult.raw[0]

    const afterEventData = await (this as any).afterCreate?.(req, res, model)
    return res.send({ [this.name]: afterEventData?.models || model })
  }

  protected async update(req: Request, res: Response): Promise<any> {
    const beforeEventData = await (this as any).beforeUpdate?.(req, res)
    req = beforeEventData?.req || req
    res = beforeEventData?.res || res

    const query = this.query(req)
    const paramKeys = Object.keys(req.params).filter(p => this.parameterId.path.includes(p))
    this.parameterId.validate(req.params)

    const where = paramKeys.reduce((res, key) => `${res} and ${key} = ${req.params[key]}`, 'true')

    if (!req.body[this.name]) {
      throw { status: 400, body: { error: `${this.name} object in body is required` } }
    }

    const { affected, raw } = await (this.where(req).length
      ? query.where(where).andWhere(...this.where(req))
      : query.where(where))
      .update().set(req.body[this.name])
      .returning('*')
      .execute()
    // const { affected, raw } = await query.where('id = :id', { id }).update().set(req.body[this.name]).returning('*').execute()
    if (!affected) {
      throw { status: 404, body: { error: 'Resource not found' } }
    }
    const model = raw[0]

    const afterEventData = await (this as any).afterUpdate?.(req, res, model)
    return res.send({ [this.name]: afterEventData?.models || model })
  }

  protected async delete(req: Request, res: Response): Promise<any> {
    const beforeEventData = await (this as any).beforeDelete?.(req, res)
    req = beforeEventData?.req || req
    res = beforeEventData?.res || res

    const query = this.query(req)
    const paramKeys = Object.keys(req.params).filter(p => this.parameterId.path.includes(p))
    this.parameterId.validate(req.params)

    const where = paramKeys.reduce((res, key) => `${res} and ${key} = ${req.params[key]}`, 'true')

    const { raw, affected } = await (this.where(req).length
      ? query.where(where).andWhere(...this.where(req))
      : query.where(where))
      .delete()
      .returning('*')
      .execute()
    // const { raw, affected } = await query.where(this.where(req)).andWhere(`${Model.connection.getMetadata(this.Model).tableName}.id = :id`, { id }).delete().returning('*').execute()
    if (!affected) {
      throw { status: 404, body: { error: 'Resource not found' } }
    }
    const model = raw[0]

    const afterEventData = await (this as any).afterDelete?.(req, res, model)
    return res.send({ [this.name]: afterEventData?.models || model })
  }

  protected async softDelete(req: Request, res: Response): Promise<any> {
    const beforeEventData = await (this as any).beforeSoftDelete?.(req, res)
    req = beforeEventData?.req || req
    res = beforeEventData?.res || res

    const query = this.query(req)
    const paramKeys = Object.keys(req.params).filter(p => this.parameterId.path.includes(p))
    this.parameterId.validate(req.params)

    const where = paramKeys.reduce((res, key) => `${res} and ${key} = ${req.params[key]}`, 'true')

    const { affected, raw } = await (this.where(req).length
      ? query.where(where).andWhere(...this.where(req))
      : query.where(where))
      .softDelete()
      .returning('*')
      .execute()
    // const { affected, raw } = await query.where(this.where(req)).andWhere(`${Model.connection.getMetadata(this.Model).tableName}.id = :id`, { id }).softDelete().returning('*').execute()
    if (!affected) {
      throw { status: 404, body: { error: 'Resource not found' } }
    }
    const model = raw[0]

    const afterEventData = await (this as any).afterSoftDelete?.(req, res, model)
    return res.send({ [this.name]: afterEventData?.models || model })
  }

  protected async restore(req: Request, res: Response): Promise<any> {
    const beforeEventData = await (this as any).beforeRestore?.(req, res)
    req = beforeEventData?.req || req
    res = beforeEventData?.res || res

    const query = this.query(req)
    const paramKeys = Object.keys(req.params).filter(p => this.parameterId.path.includes(p))
    this.parameterId.validate(req.params)

    const where = paramKeys.reduce((res, key) => `${res} and ${key} = ${req.params[key]}`, 'true')

    const { affected, raw } = await (this.where(req).length
      ? query.where(where).andWhere(...this.where(req))
      : query.where(where))
      .restore()
      .returning('*')
      .execute()
    // const { affected, raw } = await query.where(this.where(req)).andWhere(`${Model.connection.getMetadata(this.Model).tableName}.id = :id`, { id }).restore().returning('*').execute()
    if (!affected) {
      throw { status: 404, body: { error: 'Resource not found' } }
    }
    const model = raw[0]

    const afterEventData = await (this as any).afterRestore?.(req, res, model)
    return res.send({ [this.name]: afterEventData?.models || model })
  }

  public build(): Router {
    const router = this.routerFactory ? this.routerFactory.register() : Router({ mergeParams: true })
    if (this.actions) {
      for (const route of Object.keys(this.actions)) {
        router[this.actions[route].method](`/${this.name}${this.actions[route].endpoint}`, ...this.buildMiddlewares(route), RequestWrapper((req, res) => this[route](req, res)))
      }
    }
    if (!this.excludes.includes('find') && this.includes.includes('find')) {
      router.get(`/${pluralize(this.name)}`, ...this.buildMiddlewares('find'), RequestWrapper((req, res) => this.find(req, res)))
      router.post(`/${pluralize(this.name)}`, ...this.buildMiddlewares('find'), RequestWrapper((req, res) => this.find(req, res)))
    }
    if (!this.excludes.includes('get') && this.includes.includes('get')) {
      router.get(`/${this.name}/${this.parameterId.path}`, ...this.buildMiddlewares('get'), RequestWrapper((req, res) => this.get(req, res)))
    }
    if (!this.excludes.includes('create') && this.includes.includes('create')) {
      router.post(`/${this.name}`, ...this.buildMiddlewares('create'), RequestWrapper((req, res) => this.create(req, res)))
    }
    if (!this.excludes.includes('update') && this.includes.includes('update')) {
      router.patch(`/${this.name}/${this.parameterId.path}`, ...this.buildMiddlewares('update'), RequestWrapper((req, res) => this.update(req, res)))
    }
    if (!this.excludes.includes('delete') && this.includes.includes('delete')) {
      router.delete(`/${this.name}/${this.parameterId.path}`, ...this.buildMiddlewares('delete'), RequestWrapper((req, res) => this.delete(req, res)))
    }
    if (!this.excludes.includes('softDelete') && this.includes.includes('softDelete')) {
      router.delete(`/${this.name}/${this.parameterId.path}/archive`, ...this.buildMiddlewares('softDelete'), RequestWrapper((req, res) => this.softDelete(req, res)))
    }
    if (!this.excludes.includes('restore') && this.includes.includes('restore')) {
      router.patch(`/${this.name}/${this.parameterId.path}/restore`, ...this.buildMiddlewares('restore'), RequestWrapper((req, res) => this.restore(req, res)))
    }
    return router
  }

  private getModelName(): string {
    return `${this.Model.name[0].toLocaleLowerCase()}${this.Model.name.substr(1)}`
  }

  protected rawBeautifier(req: Request, raw?: { [any: string]: any } | any[], dataLabel?: string): any {
    if (!raw) return null

    const getResult = (raw: { [any: string]: any }) => {
      let result = {}
      for (const key of Object.keys(raw)) {
        result = {
          ...result,
          ...key.split('_')[0] === (dataLabel || this.getModelName()) && key !== (dataLabel || this.getModelName()) && key.split('_')?.[1] !== (dataLabel || this.getModelName())
            ? this.__rawBeautifierHelper(req, raw, key, result) : {
              [key.split('_')[0]]: this.__rawBeautifierHelper(req, raw, key, result) }
        }
      }
      return result
    }
    return Array.isArray(raw) ? raw.map(obj => getResult(obj)) : getResult(raw)
  }

  private __rawBeautifierHelper(req: Request, raw: { [any: string]: any }, key: string, result: any, idx: number = 0): any {
    if (Object.prototype.hasOwnProperty.call(raw, `${key.split('_')[idx]}_id`) && raw[`${key.split('_')[idx]}_id`] === null) {
      return null
    }
    if (key.split('_').length === idx + 1) {
      if (raw[key] instanceof Date) {
        return moment(raw[key]).tz(req.user.timezone).format()
      }
      if (Array.isArray(raw[key])) {
        return raw[key].map((obj: any) => {
          if (typeof obj !== 'object') return obj
          let result = {}
          for (const key of Object.keys(obj)) {
            result = {
              ...result,
              [key.split('_')[0]]: this.__rawBeautifierHelper(req, obj, key, result)
            }
          }
          return result
        })
      }
      return raw[key]
    }

    return {
      ...result[key.split('_')[idx]] || {},
      [key.split('_')[idx + 1]]: this.__rawBeautifierHelper(req, raw, key, result, idx + 1)
    }
  }
}
