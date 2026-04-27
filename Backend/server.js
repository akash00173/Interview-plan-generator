require ("dotenv").config()
const app = require("./src/app")
const connectToDB = require("./db/db")

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err)
})

connectToDB().then(() => {
  console.log("Database connected")
  app.listen(3000, () => {
    console.log("Server running on port 3000")
  })
}).catch(err => {
  console.error("Failed to connect to database:", err)
  process.exit(1)
})