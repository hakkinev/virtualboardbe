const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
app.use(cors()) // tillåt requests från alla origins

const PORT = process.env.PORT || 8080
console.log(`Node.js ${process.version}`)

app.use(express.json())
 
app.get('/', (req, res) => {
  res.json({ msg: "Lektionsexempel 0.3" })
})

const notesRouter = require('./routes/notes')
app.use('/notes', notesRouter)

const usersRouter = require('./routes/users')
app.use('/', usersRouter)

// const loginRouter = require('./routes/login')
// app.use('/', loginRouter)

const boardsRouter = require('./routes/boards')
app.use('/boards', boardsRouter)


app.listen(PORT, () => {
  try {
    console.log(`Running on http://localhost:${PORT}`)
  } catch (error) {
    console.error(error)
  }
})
