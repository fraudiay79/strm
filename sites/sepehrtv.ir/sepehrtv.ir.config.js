const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const axios = require('axios')

dayjs.extend(utc)

const requestHeaders = {
  "accept": "*/*",
  "accept-language": "en-US,en;q=0.9",
  "authorization": "OAuth oauth_consumer_key=\"84ALFkdjpBX0DSR3DsaLo364lKs1hTGq\", oauth_nonce=\"cEeavYyYcYISRzg6vuGdWd6iAMUzszuG\", oauth_signature=\"7%2FVhqEIDAPQEJMU%2B7mW0FVfPodM%3D\", oauth_signature_method=\"HMAC-SHA1\", oauth_timestamp=\"1754833126\", oauth_token=\"b49255684ad9347386d890a04a642bfa7052d69ca568938b622ca7d84ed93972\", oauth_version=\"1.0\"",
  "sec-ch-ua": "\"Not)A;Brand\";v=\"8\", \"Chromium\";v=\"138\", \"Google Chrome\";v=\"138\"",
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": "\"Windows\"",
  "sec-fetch-dest": "empty",
  "sec-fetch-mode": "cors",
  "sec-fetch-site": "same-site",
  "origin": "https://sepehrtv.ir",
  "referer": "https://sepehrtv.ir/"
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
      const response = await axios.get(
        'https://sepehrapi.sepehrtv.ir/v3/channels/?include_media_resources=true&include_details=false',
        { headers: requestHeaders }
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
