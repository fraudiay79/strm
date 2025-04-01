const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'mobily.com.sa',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // Cache duration: 1 hour
    }
  },

  url: function ({ date, channel }) {
    const todayEpoch = date.startOf('day').utc().valueOf()
    const nextDayEpoch = date.add(1, 'day').startOf('day').utc().valueOf()

    return `https://ev-app-api.aws.playco.com/api/media/channel/events?channels=${channel.site_id}&ts_start=${todayEpoch}&ts_end=${nextDayEpoch}&lang=en&pg=18&page=1&limit=999`
  },

  parser: function ({ content }) {
    const programs = []

    const data = JSON.parse(content).data
    data.forEach(channel => {
      channel.events.forEach(event => {
        const start = dayjs.unix(event.tsStart).tz('Asia/Riyadh')
        const stop = dayjs.unix(event.tsEnd).tz('Asia/Riyadh')
        const icon = event.images.find(image => image.type === 'landscape_poster_v1')?.url || null
        const seasonEpisodeMatch = event.description.match(/S(\d+)\s*,\s*E(\d+)/)

        programs.push({
          title: event.title,
          description: event.description || null,
          icon,
          season: seasonEpisodeMatch ? parseInt(seasonEpisodeMatch[1], 10) : null,
          episode: seasonEpisodeMatch ? parseInt(seasonEpisodeMatch[2], 10) : null,
          start,
          stop
        })
      })
    })

    return programs
  },
  async channels() {
    const axios = require('axios')
    try {
      const response = await axios.get(
        `https://ev-app-api.aws.playco.com/api/media/channel/events?channels=all&ts_start=1743508800&ts_end=1743616800&lang=en&pg=50&page=1&limit=999`
      )

      return response.data.data.map(channel => ({
        lang: 'ar',
        name: channel.title,
        site_id: channel.slug
      }))
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}
