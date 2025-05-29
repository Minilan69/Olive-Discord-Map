const sqlite3 = require('sqlite3').verbose()
const path = require('path')

const dbPath = path.resolve(__dirname, 'olive-map.db')
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error during DB connection', err)
  } else {
    console.log('DB connected successfully')
  }
})

// Create the users table if it doesn't exist
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    latitude REAL,
    longitude REAL
  )`)
})

module.exports = db
