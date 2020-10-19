import bodyparser from 'body-parser'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import listEndpoint from 'express-list-endpoints'
import morgan from 'morgan'
import { Api } from '../Controller'
import { BODY_PARSER_JSON_LIMIT, BODY_PARSER_RAW_LIMIT, BODY_PARSER_URL_ENCODED_LIMIT, CORS_ORIGINS } from '../Util/Constant'

const app = express()
app.use(compression())
app.use(cors({
  credentials: true,
  origin: CORS_ORIGINS
}))

app.use(morgan('combined'))
app.use(bodyparser.json({ limit: BODY_PARSER_JSON_LIMIT }))
app.use(bodyparser.urlencoded({ extended: true, limit: BODY_PARSER_URL_ENCODED_LIMIT }))
app.use(bodyparser.raw({ limit: BODY_PARSER_RAW_LIMIT }))
app.use(cookieParser())

if (!process.env.ENVIRONMENT || process.env.ENVIRONMENT === 'develop') {
  app.get('/api/endpoints', (_, res) => res.send(listEndpoint(app as any).filter((route: { path: string }) => !/^\/admin.*/gi.test(route.path))))
}

app.use('/api', new Api().register())
app.get('/', (_: Request, res: Response) => res.send({ 'alive?': true }))

app.listen(process.env.PORT || '6606', () => {
  console.log(`App started in http://localhost:${process.env.PORT || 6606} ...`)
})
