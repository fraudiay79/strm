const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const crypto = require('crypto')
const axios = require('axios')
const querystring = require('querystring')

dayjs.extend(utc)

// OAuth Configuration (replace with your actual secrets)
const OAUTH_CONFIG = {
  consumerKey: '84ALFkdjpBX0DSR3DsaLo364lKs1hTGq',
  consumerSecret: 'VPk0dIUxdAPu5NbBAfMKdnC9G99KIKjd',
  token: 'b49255684ad9347386d890a04a642bfa7052d69ca568938b622ca7d84ed93972',
  tokenSecret: '64c1e29167fa69c9d9d715be04fe2ec48de57b99ec72ad341c62f31cc5fd547a'
}

function generateNonce(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

function generateSignature(method, url, oauthParams, consumerSecret, tokenSecret) {
  // Sort and encode parameters
  const encodedParams = Object.entries(oauthParams)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&')

  // Create base string
  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url.split('?')[0]), // Base URL without query params
    encodeURIComponent(encodedParams)
  ].join('&')

  // Create signing key
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`

  // Generate signature
  const signature = crypto.createHmac('sha1', signingKey)
    .update(baseString)
    .digest('base64')

  return encodeURIComponent(signature)
}

function generateOAuthHeader(method, url) {
  const timestamp = Math.floor(Date.now() / 1000)
  const nonce = generateNonce(32)
  
  const oauthParams = {
    oauth_consumer_key: OAUTH_CONFIG.consumerKey,
    oauth_nonce: nonce,
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp,
    oauth_token: OAUTH_CONFIG.token,
    oauth_version: '1.0'
  }

  // Generate signature
  oauthParams.oauth_signature = generateSignature(
    method,
    url,
    oauthParams,
    OAUTH_CONFIG.consumerSecret,
    OAUTH_CONFIG.tokenSecret
  )

  // Build header string
  const headerParts = []
  for (const [key, value] of Object.entries(oauthParams)) {
    headerParts.push(`${key}="${value}"`)
  }

  return `OAuth ${headerParts.join(', ')}`
}

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
  "referer": "https://sepehrtv.ir/"
}

function getRequestHeaders(method, url) {
  return {
    ...baseHeaders,
    authorization: generateOAuthHeader(method, url)
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
  url({ channel, date }) {
    const formattedDate = date.format('YYYY-MM-DD')
    return `https://sepehrapi.sepehrtv.ir/v3/epg/tvprogram?channel_id=${channel.site_id}&date=${formattedDate}`
  },
  getRequestHeaders,
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
  async channels() {
    try {
      const url = 'https://sepehrapi.sepehrtv.ir/v3/channels/?key=tv1&include_media_resources=true&include_details=true'
      const headers = getRequestHeaders('GET', url)
      
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
