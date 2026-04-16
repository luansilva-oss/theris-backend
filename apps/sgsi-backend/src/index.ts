import express from 'express'
import dotenv from 'dotenv'
import usersRouter from './routes/users'

dotenv.config()

const app = express()
app.use(express.json())

app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'sgsi-dashboard',
    version: '0.1.0',
    timestamp: new Date().toISOString()
  })
})

app.use('/users', usersRouter)

const PORT = process.env.PORT || 3001
app.listen(PORT, () => {
  console.log(`SGSI Dashboard API rodando na porta ${PORT}`)
})

export default app
