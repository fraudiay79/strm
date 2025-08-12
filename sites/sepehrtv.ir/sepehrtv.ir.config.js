const crypto = require('crypto')
const OAuth = require('oauth-1.0a')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const axios = require('axios')

dayjs.extend(utc)

// 🔐 OAuth Header Generator with timestamp and nonce
function getOAuthHeader(url, method = 'GET') {
  const oauth = OAuth({
    consumer: {
      key: '84ALFkdjpBX0DSR3DsaLo364lKs1hTGq',
      secret: 'VPk0dIUxdAPu5NbBAfMKdnC9G99KIKjd'
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
    secret: '64c1e29167fa69c9d9d715be04fe2ec48de57b99ec72ad341c62f31cc5fd547a'
  }

  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = crypto.randomBytes(16).toString('hex')

  const requestData = {
    url,
    method,
    data: {
      oauth_timestamp: timestamp,
      oauth_nonce: nonce
    }
  }

  const authHeader = oauth.toHeader(oauth.authorize(requestData, token))
  
  // Debug output
  console.log('Generated OAuth Headers:', authHeader)
  console.log('Request URL:', url)
  console.log('Timestamp:', timestamp)
  console.log('Nonce:', nonce)

  return authHeader
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
    const epgUrl = `https://sepehrapi.sepehrtv.ir/v3/epg/tvprogram?channel_id=${channel.site_id}&date=${formattedDate}`
    console.log('EPG URL:', epgUrl) // Debug output
    return epgUrl
  },

  // 📺 EPG Parser
  parser({ content, channel, date }) {
    let data
    try {
      data = JSON.parse(content)
      console.log(`Parsed EPG data for ${channel.site_id} on ${date.format('YYYY-MM-DD')}:`, data) // Debug
    } catch (error) {
      console.error('Error parsing JSON:', error)
      console.error('Response content:', content) // Debug
      return []
    }

    const programs = []

    if (data && Array.isArray(data.list)) {
      data.list.forEach(item => {
        if (!item || !item.start || !item.duration) {
          console.warn('Invalid program item:', item) // Debug
          return
        }

        const start = dayjs.utc(item.start)
        const stop = start.add(item.duration, 'm')

        programs.push({
          title: item.title || 'No Title',
          description: item.descSummary || item.descFull || '',
          start,
          stop
        })
      })
    } else {
      console.warn('Unexpected data format:', data) // Debug
    }

    console.log(`Found ${programs.length} programs for ${channel.site_id}`) // Debug
    return programs
  },

  // 📡 Channel Fetcher with improved error handling
  async channels() {
    const url = 'https://sepehrapi.sepehrtv.ir/v3/channels/?include_media_resources=true&include_details=false'
    
    try {
      console.log('Fetching channels from:', url) // Debug
      const response = await axios.get(url, {
        headers: getRequestHeaders(url),
        timeout: 10000 // 10 seconds timeout
      })

      console.log('Channels API response status:', response.status) // Debug

      if (!response.data || !Array.isArray(response.data.list)) {
        console.error('Invalid channels response:', response.data)
        return []
      }

      const channels = response.data.list.map(channel => ({
        lang: 'fa',
        site_id: channel.id,
        name: channel.name
      }))

      console.log(`Found ${channels.length} channels`) // Debug
      return channels

    } catch (error) {
      console.error('Error fetching channels:')
      if (error.response) {
        console.error('Response status:', error.response.status)
        console.error('Response data:', error.response.data)
        console.error('Response headers:', error.response.headers)
      } else if (error.request) {
        console.error('No response received:', error.request)
      } else {
        console.error('Error:', error.message)
      }
      return []
    }
  }
}
