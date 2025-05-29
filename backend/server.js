const path = require('path')
require('dotenv').config({ path: path.resolve(__dirname, '../.env') })

const express = require('express')
const axios = require('axios')
const app = express()

const CLIENT_ID = process.env.CLIENT_ID
const CLIENT_SECRET = process.env.CLIENT_SECRET
const REDIRECT_URI = process.env.REDIRECT_URI

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
    res.send(`Login to ${user.username}`)
  } catch (err) {
    console.error(err.response?.data || err)
    res.status(500).send('Error during authentication')
  }
})

app.listen(3000, () => {
  console.log('Server launch at http://localhost:3000')
})
