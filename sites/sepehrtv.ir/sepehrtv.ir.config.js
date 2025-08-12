const crypto = require('crypto')
const OAuth = require('oauth-1.0a')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const axios = require('axios')

dayjs.extend(utc)

// 🔐 OAuth Header Generator
function getOAuthHeader(url, method = 'GET') {
  const oauth = OAuth({
    consumer: {
      key: '84ALFkdjpBX0DSR3DsaLo364lKs1hTGq',
      secret: 'VPk0dIUxdAPu5NbBAfMKdnC9G99KIKjd' // No consumer secret required
    },
    signature_method: 'HMAC-SHA1',
    hash_function(base_string, key) {
      return crypto
        .createHmac('sha1', key)
        .update(base_string)
        .digest('base64')
    }
  })

  const token = {
    key: 'b49255684ad9347386d890a04a642bfa7052d69ca568938b622ca7d84ed93972',
    secret: '64c1e29167fa69c9d9d715be04fe2ec48de57b99ec72ad341c62f31cc5fd547a' // No token secret required
  }

  const requestData = {
    url,
    method
  }

  return oauth.toHeader(oauth.authorize(requestData, token))
}

// 🧠 Dynamic Request Headers
function getRequestHeaders(url) {
  return {
    ...getOAuthHeader(url),
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
}

module.exports = {
  site: 'sepehrtv.ir',
  days: 2,
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
      const url = 'https://sepehrapi.sepehrtv.ir/v3/channels/?include_media_resources=true&include_details=false'
      const response = await axios.get(url, {
        headers: getRequestHeaders(url)
      })

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
