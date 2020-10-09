import express, { Request, Response } from 'express'

const app = express()

app.get('/', (_: Request, res: Response) => res. send({ 'alive?': true }))

app.listen(process.env.PORT || '6606', () => {
  console.log(`App started in http://localhost:${process.env.PORT || 6606} ...`)
})
