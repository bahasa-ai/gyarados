require('dotenv').config()
const readFileSync = require('fs').readFileSync

module.exports = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: 'public',
  ssl: process.env.DB_USE_SSL === 'true' ? {
    cert: readFileSync(`${__dirname}/${process.env.DB_CERT || 'client-cert.pem'}`, 'utf-8'),
    key: readFileSync(`${__dirname}/${process.env.DB_KEY || 'client-key.pem'}`, 'utf-8'),
    ca: readFileSync(`${__dirname}/${process.env.DB_CA || 'server-ca.pem'}`, 'utf-8'),
    rejectUnauthorized: process.env.DB_REJECT_UNAUTHORIZED === 'true'
  } : false,
  entities: [
  ],
  migrations: [
    'dist/Model/migrations/*.js'
  ],
  logging: ['error'],
  synchronize: false,
  logger: 'file',
  cli: {
    'migrationsDir': 'src/Model/migrations'
  }
}