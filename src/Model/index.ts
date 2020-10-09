import { Connection, ConnectionOptions, createConnection, Repository } from 'typeorm'

export class Model {
  private static instance: Model

  private constructor(private connection: Connection) {}

  public static async init(options: ConnectionOptions, entities: any[]): Promise<Model> {
    if (!Model.instance) {
      Model.instance = new Model(
        await createConnection({
          ...options,
          entities
        })
      )
      entities.map(entity => entity.useConnection(Model.instance.connection))
    }
    return Model.instance
  }

  public static get connection(): Connection {
    if (!Model.instance.connection) {
      throw new Error('Please init DB first')
    }
    return Model.instance.connection
  }

  public static getRepository<T>(model: (new () => T)): Repository<T> {
    return Model.instance.connection.getRepository(model)
  }

  public static async query(query: string, parameter?: any[]): Promise<any> {
    return Model.connection.query(query, parameter)
  }
}