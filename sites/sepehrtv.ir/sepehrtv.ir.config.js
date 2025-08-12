const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const crypto = require('crypto')
const axios = require('axios')
const OAuth = require('oauth-1.0a')

dayjs.extend(utc)

// 🔐 OAuth Configuration
const OAUTH_CONFIG = {
  consumerKey: '84ALFkdjpBX0DSR3DsaLo364lKs1hTGq',
  consumerSecret: 'VPk0dIUxdAPu5NbBAfMKdnC9G99KIKjd',
  token: 'b49255684ad9347386d890a04a642bfa7052d69ca568938b622ca7d84ed93972',
  tokenSecret: '64c1e29167fa69c9d9d715be04fe2ec48de57b99ec72ad341c62f31cc5fd547a'
}

// 🧠 OAuth Header Generator
function getAuthHeaderForRequest(url, method = 'GET') {
  const oauth = OAuth({
    consumer: {
      key: OAUTH_CONFIG.consumerKey,
      secret: OAUTH_CONFIG.consumerSecret
    },
    signature_method: 'HMAC-SHA1',
    hash_function(baseString, key) {
      return crypto.createHmac('sha1', key).update(baseString).digest('base64')
    }
  })

  const requestData = { url, method }

  const token = {
    key: OAUTH_CONFIG.token,
    secret: OAUTH_CONFIG.tokenSecret
  }

  return oauth.toHeader(oauth.authorize(requestData, token))
}

// 🌐 Base Headers
const baseHeaders = {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9",
  "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "origin": "https://sepehrtv.ir",
  "referer": "https://sepehrtv.ir/",
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36"
}

// 🧾 Combine Headers
function getRequestHeaders(url, method = 'GET') {
  const oauthHeaders = getAuthHeaderForRequest(url, method)
  return {
    ...baseHeaders,
    ...oauthHeaders
  }
}

// 📦 Module Export
module.exports = {
  site: 'sepehrtv.ir',
  days: 2,
  delay: 5000,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },

  // 📅 EPG URL Builder
  url({ channel, date }) {
    const formattedDate = date.format('YYYY-MM-DD')
    return `https://sepehrapi.sepehrtv.ir/v3/epg/tvprogram?channel_id=${channel.site_id}&date=${formattedDate}`
  },

  // 🧠 Header Builder
  async getRequestHeaders(url, method = 'GET') {
    return getRequestHeaders(url, method)
  },

  // 📺 EPG Parser
  parser({ content }) {
    let data
    try {
      data = JSON.parse(content)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      return []
    }

    const programs = []

    if (data && Array.isArray(data.list)) {
      data.list.forEach(item => {
        if (!item || !item.start || !item.duration) return

        const start = dayjs.utc(item.start)
        const stop = start.add(item.duration, 'm')

        programs.push({
          title: item.title,
          description: item.descSummary || item.descFull || '',
          start,
          stop
        })
      })
    }

    return programs
  },

  // 📡 Channel Fetcher
  async channels() {
    try {
      const url = 'https://sepehrapi.sepehrtv.ir/v3/channels/?key=tv1&include_media_resources=true&include_details=true'
      const headers = getRequestHeaders(url)

      const response = await axios.get(url, { headers })

      if (!response.data || !Array.isArray(response.data.list)) {
        console.error('Error: No channels data found')
        return []
      }

      return response.data.list.map(channel => ({
        lang: 'fa',
        site_id: channel.id,
        name: channel.name
      }))
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}
