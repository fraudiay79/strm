const crypto = require('crypto')
const OAuth = require('oauth-1.0a')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(timezone)

// 🔐 Fixed OAuth Header Generator
function getOAuthHeader(url, method = 'GET') {
  if (typeof url !== 'string') {
    url = String(url)
  }

  const oauth = OAuth({
    consumer: {
      key: '84ALFkdjpBX0DSR3DsaLo364lKs1hTGq',
      secret: ''
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
    secret: ''
  }

  const requestData = {
    url: url.includes('?') ? url.split('?')[0] : url,
    method,
    data: url.includes('?') ? Object.fromEntries(new URLSearchParams(url.split('?')[1])) : null
  }

  const auth = oauth.authorize(requestData, token)

  return {
    'Authorization': `OAuth oauth_consumer_key="${oauth.consumer.key}", ` +
      `oauth_nonce="${auth.oauth_nonce}", ` +
      `oauth_signature="${encodeURIComponent(auth.oauth_signature)}", ` +
      `oauth_signature_method="HMAC-SHA1", ` +
      `oauth_timestamp="${auth.oauth_timestamp}", ` +
      `oauth_token="${token.key}", ` +
      `oauth_version="1.0"`
  }
}

// 🧠 Request Headers Generator
function getRequestHeaders(url) {
  const baseHeaders = {
    "accept": "*/*",
    "accept-language": "en-US,en;q=0.9",
    "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": "\"Windows\"",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-site",
    "Referer": "https://sepehrtv.ir/"
  }

  return url ? { ...baseHeaders, ...getOAuthHeader(url) } : baseHeaders
}

module.exports = {
  site: 'sepehrtv.ir',
  days: 2,
  request: {
    cache: { ttl: 60 * 60 * 1000 },
    headers: getRequestHeaders()
  },

  // 📅 EPG URL Builder
  url({ channel, date }) {
    if (!channel?.site_id || !date) {
      throw new Error('Missing required parameters')
    }

    const apiUrl = new URL('https://sepehrapi.sepehrtv.ir/v3/epg/tvprogram')
    apiUrl.searchParams.append('channel_id', channel.site_id)
    apiUrl.searchParams.append('date', date.format('YYYY-MM-DD'))

    return {
      url: apiUrl.toString(),
      headers: getRequestHeaders(apiUrl.toString())
    }
  },

  // 📺 EPG Parser with Tehran Timezone and Formatted Times
  parser({ content }) {
    try {
      const data = JSON.parse(content)
      if (!data?.list) return []

      return data.list
        .filter(item => typeof item?.start === 'string' && item.duration)
        .map(item => {
          const start = dayjs.utc(item.start).tz('Asia/Tehran')
          const stop = start.add(item.duration, 'm')

          return {
            title: item.title || '',
            description: item.descSummary || item.descFull || '',
            start: start.format('HH:mm'),
            stop: stop.format('HH:mm')
          }
        })

    } catch (error) {
      console.error('Parser error:', error)
      return []
    }
  },

  // 📡 Channel Fetcher
  async channels() {
    const url = new URL('https://sepehrapi.sepehrtv.ir/v3/channels/')
    url.searchParams.append('include_media_resources', 'true')
    url.searchParams.append('include_details', 'false')

    try {
      const response = await axios.get(url.toString(), {
        headers: getRequestHeaders(url.toString()),
        timeout: 5000
      })

      return response.data?.list?.map(channel => ({
        lang: 'fa',
        site_id: channel.id,
        name: channel.name,
        icon: channel.icon
      })) || []

    } catch (error) {
      console.error('Channel fetch error:', error.message)
      return []
    }
  }
}
