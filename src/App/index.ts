import 'source-map-support/register'
require('dotenv').config({ path: '.env' })

import DB from './DB'
import HttpServer from './HttpServer'

(async () => {
  await DB()
  await HttpServer()
})()