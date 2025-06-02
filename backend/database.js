const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.resolve(__dirname, "db/users.db");

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("DB connection error", err);
  } else {
    console.log("DB connected");
  }
});

db.serialize(() => {
  // Create the users table if it doesn't exist
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT,
    latitude REAL,
    longitude REAL
  )`,
    (err) => {
      if (err) {
        console.error("Table creation error", err);
      } else {
        // Show users in DB at startup
        db.all("SELECT * FROM users", (err, rows) => {
          if (err) console.error("Read users error", err);
          else console.log("Users at startup:", rows);
        });
      }
    }
  );
});

// Export the database
module.exports = db;
