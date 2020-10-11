import { Connection, ConnectionOptions, createConnection, Repository } from 'typeorm'

export class DB {
  private static instance: DB

  private constructor(private connection: Connection) {}

  public static async init(options: ConnectionOptions, entities: any[]): Promise<DB> {
    if (!DB.instance) {
      DB.instance = new DB(
        await createConnection({
          ...options,
          entities
        })
      )
      entities.map(entity => entity.useConnection(DB.instance.connection))
    }
    return DB.instance
  }

  public static get connection(): Connection {
    if (!DB.instance.connection) {
      throw new Error('Please init DB first')
    }
    return DB.instance.connection
  }

  public static getRepository<T>(model: (new () => T)): Repository<T> {
    return DB.instance.connection.getRepository(model)
  }

  public static async query(query: string, parameter?: any[]): Promise<any> {
    return DB.connection.query(query, parameter)
  }
}