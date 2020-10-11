import { readFileSync } from 'fs'
import { Connection, ConnectionOptions, createConnection, Repository } from 'typeorm'
import { BaseModel } from '../Model/Base/BaseModel'

export class DB {
  private static instance: DB

  private constructor(private connection: Connection) {}

  public static async init(options: ConnectionOptions): Promise<DB> {
    if (!DB.instance) {
      DB.instance = new DB(await createConnection(options))
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

export default async (): Promise<void> => {
  await DB.init({
    name: 'default',
    type: 'postgres',
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT) || 5432,
    username: process.env.DB_USERNAME,
    ssl: process.env.DB_USE_SSL === 'true' ? {
      cert: readFileSync(`${__dirname}/../${process.env.DB_CERT || 'client-cert.pem'}`, 'utf-8'),
      key: readFileSync(`${__dirname}/../${process.env.DB_KEY || 'client-key.pem'}`, 'utf-8'),
      ca: readFileSync(`${__dirname}/../${process.env.DB_CA || 'server-ca.pem'}`, 'utf-8'),
      rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'true'
    } : false,
    synchronize: false,
    logging: process.env.ENVIRONMENT === 'develop' || process.env.ENVIRONMENT === 'local',
    entities: [`${__dirname}/../Model/*.js`]
  })

  BaseModel.useConnection(DB.connection)
}
