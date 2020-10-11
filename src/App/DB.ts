import { readFileSync } from 'fs'
import { Connection, ConnectionOptions, createConnection, EntityTarget, getRepository as _getRepository, Repository } from 'typeorm'
import { BaseModel } from '../Model/Base/BaseModel'

type Connections = 'default'
export const getRepository = <Entity>(
  entity: EntityTarget<Entity>, connection: Connections = 'default'): Repository<Entity> => _getRepository(entity, connection)

class DB {
  private _connection: Connection

  public constructor(private _opts: ConnectionOptions, private _BaseModel?: { useConnection: (connection: Connection) => void }) {}

  public async build(): Promise<void> {
    this._connection = await createConnection(this._opts)
    this._BaseModel?.useConnection(this._connection)
  }
}

(async () => {

  // init the default DB for each class that extends BaseModel
  await new DB({
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
  }, BaseModel).build()
})()