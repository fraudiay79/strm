const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const tz = 'Africa/Casablanca'

module.exports = {
  site: 'medi1tv.com',
  days: 1,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://idara.medi1tv.ma/rss/medi1tv/detail-grille2.aspx?lg=ar&type=${channel.site_id}&s&date=${date.format('DD/MM/YYYY')}`
  },
  parser: function ({ content }) {
    let data
    try {
      data = JSON.parse(content)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      return []
    }

    const programs = []
    let previousStopTime = null

    if (data && Array.isArray(data)) {
      data.forEach((item, index) => {
        if (!item) return
        const start = dayjs.tz(item.heure, 'HH:mm', tz).utc()
        const stop = previousStopTime ? previousStopTime : dayjs.tz(data[index + 1]?.heure || '23:59', 'HH:mm', tz).utc()

        programs.push({
          title: item.titre,
          description: item.resume,
          icon: item.image,
          start: start.format(),
          stop: stop.format()
        })

        previousStopTime = stop
      })
    }

    return programs
  },
  async channels() {
    const data = await axios
      .get(`https://idara.medi1tv.ma/rss/medi1tv/channels.aspx?lg=ar&a`)
      .then((r) => r.data)
      .catch(console.log)

    return data.channels.map((item) => {
      return {
        lang: 'ar',
        site_id: item.type,
        name: item.titre
      }
    })
  }
}
