const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express = require('express')
const axios = require('axios')
const app = express()
const db = require('./database')

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI

if (!CLIENT_ID || !CLIENT_SECRET || !REDIRECT_URI) {
  console.error('Missing environment variables: CLIENT_ID, CLIENT_SECRET, or REDIRECT_URI')
  process.exit(1)
}

app.use(express.static(path.join(__dirname, '../frontend')))

app.get('/login', (req, res) => {
  const redirect = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify`
  res.redirect(redirect)
})

app.get('/callback', async (req, res) => {
  const code = req.query.code
  const data = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    scope: 'identify'
  })

  try {
    const tokenRes = await axios.post('https://discord.com/api/oauth2/token', data, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })

    const access_token = tokenRes.data.access_token

    const userRes = await axios.get('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${access_token}` }
    })

    const user = userRes.data

    const approxCoord = (coord, precision = 2) => {
      const factor = Math.pow(10, precision)
      return Math.round(coord * factor) / factor
    }

    const userLat = 48.8566
    const userLon = 2.3522
    const lat = approxCoord(userLat, 2)
    const lon = approxCoord(userLon, 2)

    db.run(
      `INSERT OR REPLACE INTO users (id, username, latitude, longitude) VALUES (?, ?, ?, ?)`,
      [user.id, user.username, lat, lon],
      (err) => {
        if (err) {
          console.error('Error insert DB', err)
          res.status(500).send('DB error')
        } else {
          console.log('User inserted/updated in DB:', user.username)
          // ✅ Redirection propre avec paramètres
          res.redirect(`/?username=${encodeURIComponent(user.username)}&id=${user.id}`)
        }
      }
    )

  } catch (err) {
    console.error(err.response?.data || err)
    res.status(500).send('Error during authentication')
  }
})

app.listen(3000, () => {
  console.log('Server launch at http://localhost:3000')
})
