import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import tasksHandler from './api/tasks.js'
import toggleHandler from './api/tasks/toggle.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())

app.get('/api/tasks', (req, res) => tasksHandler(req, res))
app.post('/api/tasks/toggle', (req, res) => toggleHandler(req, res))

// Serve front-end
app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

const port = process.env.PORT || 3000
app.listen(port, () => console.log(`Server listening on ${port}`))
