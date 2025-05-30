const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express = require('express')
const axios = require('axios')
const session = require('express-session')
const app = express()
const db = require('./database')

// Get Discord OAuth info from env vars
const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI

// Check if env vars exist
if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('Missing environment variables: CLIENT_ID, CLIENT_SECRET, or REDIRECT_URI')
  process.exit(1)
}

// Use session to handle user infos
app.use(session({
  secret: process.env.SESSION_SECRET || 'ultra_secret_key', // secret key for sessions
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Not using HTTPS here, so secure false
}))

app.use(express.static(path.join(__dirname, '../frontend')))
app.use('/assets', express.static(path.join(__dirname, 'assets')))

// Route to start Discord login via OAuth2
app.get('/login', (req, res) => {
  const redirect = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`
  res.redirect(redirect)
})

// OAuth2 callback route from Discord
app.get('/callback', async (req, res) => {
  const code = req.query.code
  const data = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    scope: 'identify guilds'
  })

  try {
    // Exchange code for access token
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const access_token = tokenRes.data.access_token

    // Use access token to get user info
    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    })

    const user = userRes.data
    const guildsRes = await axios.get('https://discord.com/api/users/@me/guilds', {
      headers: { Authorization: `Bearer ${access_token}` }
    })
    const guilds = guildsRes.data

    const MY_GUILD_ID = '1376474773101744148'

    req.session.notInGuild = false
    req.session.user = {
      id: user.id,
      username: user.username
    }

    if (!guilds.some(guild => guild.id === MY_GUILD_ID)) {
      // User is not in the guild
      req.session.notInGuild = true
      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err)
          return res.status(500).send('Session save error')
        }
        // No DB insertion here because user is not in the guild
        return res.redirect('/')
      })
    } else {
      // User is in the guild

      req.session.save(err => {
        if (err) {
          console.error('Session save error:', err)
          return res.status(500).send('Session save error')
        }
        // Insert or update in DB only here
        db.run(
          `INSERT INTO users (id, username) VALUES (?, ?)
          ON CONFLICT(id) DO UPDATE SET username = excluded.username`,
          [user.id, user.username],
          (dbErr) => {
            if (dbErr) {
              console.error('Error insert DB', dbErr)
              // DB error can be ignored here since session is already saved
            } else {
              console.log('User inserted/updated in DB:', user.username)
            }
          }
        )
        return res.redirect('/')
      })
    }

  } catch (err) {
    console.error(err.response?.data || err)
    res.status(500).send('Error during authentication')
  }
})

// Route to log out user and destroy session
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Session destruction error', err)
    }
    res.redirect('/')
  })
})

// Route to get current user info
app.get('/me', (req, res) => {
  console.log('Session user:', req.session.user)
  console.log('Session notInGuild:', req.session.notInGuild)
  if (req.session.user) {
    res.json({
      loggedIn: true,
      username: req.session.user.username,
      id: req.session.user.id,
      notInGuild: req.session.notInGuild || false
    })
  } else {
    res.json({ loggedIn: false, notInGuild: false })
  }
})

app.use(express.json())

// Check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session.user && req.session.user.id) return next()
  res.status(401).json({ error: 'Unauthorized' })
}

// Route to update user's position
app.post('/update-point', isAuthenticated, (req, res) => {
  const userId = req.session.user.id
  const { latitude, longitude } = req.body

  const sql = `
    INSERT INTO users (id, latitude, longitude) VALUES (?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET latitude = excluded.latitude, longitude = excluded.longitude
  `

  db.run(sql, [userId, latitude, longitude], function(err) {
    if (err) {
      console.error('Update point error:', err)
      return res.status(500).json({ error: 'Database error' })
    }
    res.json({ success: true })
  })
})

// Route to get all users' points
app.get('/points', isAuthenticated, (req, res) => {
  db.all(
    `SELECT id, username, latitude, longitude FROM users WHERE latitude IS NOT NULL AND longitude IS NOT NULL`,
    [],
    (err, rows) => {
      if (err) {
        console.error(err)
        return res.status(500).json({ error: 'Database error' })
      }
      res.json(rows)
    }
  )
})

// Route to delete user's point
app.post('/delete-point', isAuthenticated, (req, res) => {
  const userId = req.session.user.id

  const sql = `UPDATE users SET latitude = NULL, longitude = NULL WHERE id = ?`

  db.run(sql, [userId], function(err) {
    if (err) {
      console.error('Delete point error:', err)
      return res.status(500).json({ error: 'Database error' })
    }
    res.json({ success: true })
  })
})

// Start the server
app.listen(3000, () => {
  console.log('Server launch at http://localhost:3000')
})
