import bodyparser from 'body-parser'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import express, { Request, Response } from 'express'
import { BODY_PARSER_JSON_LIMIT, BODY_PARSER_RAW_LIMIT, BODY_PARSER_URL_ENCODED_LIMIT, CORS_ORIGINS } from '../Util/Constant'
import morgan from 'morgan'

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

app.get('/', (_: Request, res: Response) => res.send({ 'alive?': true }))

app.listen(process.env.PORT || '6606', () => {
  console.log(`App started in http://localhost:${process.env.PORT || 6606} ...`)
})
