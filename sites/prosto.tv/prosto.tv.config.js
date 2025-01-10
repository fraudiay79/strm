const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(customParseFormat)
dayjs.extend(timezone)

module.exports = {
  site: 'prosto.tv',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    method: 'GET',
    headers: {
      'referer': 'https://prosto.tv/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br, zstd',
      'Device': 'web',
      'Origin': 'https://prosto.tv',
      'Sec-Ch-Ua': '"Not.A/Brand";v="24", "Chromium";v="131", "Google Chrome";v="131"',
      'Sec-Ch-Ua-Mobile': '?0',
      'Sec-Ch-Ua-Platform': '"Windows"',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-site'
    }
  },
  url({ channel, date }) {
    const startOfDay = dayjs(date).startOf('day').utc().unix()
    const endOfDay = dayjs(date).endOf('day').utc().unix()
    return `https://api-prosto-player.prosto.tv/v1/programs/channels/${channel.site_id}?from=${startOfDay}&to=${endOfDay}`
  },
  parser: function ({ date, content }) {
    let programs = [];
    try {
      const data = JSON.parse(content);
      if (data && data.data) {
        data.data.forEach(item => {
          const start = dayjs.unix(item.timeStart).utc().toISOString();
          const stop = dayjs.unix(item.timeStop).utc().toISOString();
          programs.push({
            title: item.title,
            start,
            stop
          })
        })
      }
    } catch (error) {
      console.error("Error parsing content:", error)
    }

    return programs
  },
  async channels() {
    const axios = require('axios')
    try {
      const response = await axios.get('https://api-prosto-player.prosto.tv/v1/programs/channels', {
      headers: this.request.headers
      })
      const data = response.data

      if (data && data.channels) {
        return data.channels.map(item => ({
          lang: 'uk',
          site_id: item.id,
          name: item.title
        }))
      } else {
        console.error('Unexpected response structure:', data)
        return []
      }
    } catch (error) {
      console.error('Error fetching channel data:', error)
      return []
    }
  }
}
