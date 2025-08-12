const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const axios = require('axios')

dayjs.extend(utc)

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

async function getAuthHeaders() {
  try {
    // First make a request to the homepage to get fresh auth headers
    const response = await axios.get('https://sepehrtv.ir', {
      headers: {
        ...baseHeaders,
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate"
      }
    })
    
    // Extract the authorization header from the subsequent API requests
    // Note: This might need adjustment based on how the site actually works
    // You might need to inspect the network traffic to see how the auth is generated
    const setCookieHeader = response.headers['set-cookie']
    if (!setCookieHeader) {
      throw new Error('No auth cookies received')
    }
    
    // Alternatively, if the auth is generated client-side, you might need to:
    // 1. Use a headless browser to get fresh tokens
    // 2. Or reverse-engineer the auth generation logic
    
    // For now, we'll return the headers we have from the example
    // In a real implementation, you would generate fresh ones here
    return {
      ...baseHeaders,
      "authorization": "OAuth oauth_consumer_key=\"84ALFkdjpBX0DSR3DsaLo364lKs1hTGq\", oauth_nonce=\"tRPhhV9VywNaK8zkH1xlU7RlTrXYmWZa\", oauth_signature=\"bLBpTP%2BPup0OxIBujfuoY06TUUM%3D\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"1754967379\", oauth_token=\"b49255684ad9347386d890a04a642bfa7052d69ca568938b622ca7d84ed93972\", oauth_version=\"1.0\""
    }
  } catch (error) {
    console.error('Error getting auth headers:', error)
    return baseHeaders
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
  async getRequestHeaders() {
    return await getAuthHeaders()
  },
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
      const headers = await getAuthHeaders()
      const response = await axios.get(
        'https://sepehrapi.sepehrtv.ir/v3/channels/?key=tv1&include_media_resources=true&include_details=true',
        { headers }
      )

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
