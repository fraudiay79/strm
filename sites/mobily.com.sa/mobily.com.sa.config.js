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
    const todayEpoch = date.startOf('day').utc().valueOf() / 1000
    const nextDayEpoch = date.add(1, 'day').startOf('day').utc().valueOf() / 1000

    return `https://ev-app-api.aws.playco.com/api/media/channel/events?channels=${channel.site_id}&ts_start=${todayEpoch}&ts_end=${nextDayEpoch}&lang=ar`
  },

  parser: function ({ content }) {
    let programs = []
    const data = JSON.parse(content)

    if (data && data.data) {
      data.data.forEach(channel => {
        channel.events?.forEach(event => {
          const start = dayjs(event.tsStart * 1000).utc().toISOString() // Multiply by 1000 for ms
          const stop = dayjs(event.tsEnd * 1000).utc().toISOString()
          const icon = event.images?.find(image => image.type === 'landscape_poster_v1')?.url || null
          const seasonEpisodeMatch = event.description?.match(/م(\d+)\s*،\s*ح(\d+)/) || event.description?.match(/S(\d+)\s*,\s*E(\d+)/)

          programs.push({
            title: event.title,
            description: event.description || 'No description available',
            icon,
            season: seasonEpisodeMatch ? parseInt(seasonEpisodeMatch[1], 10) : null,
            episode: seasonEpisodeMatch ? parseInt(seasonEpisodeMatch[2], 10) : null,
            start,
            stop
          })
        })
      })
    }

    return programs
  },

  async channels(date) {
    const axios = require('axios')
    try {
      const todayEpoch = date.startOf('day').utc().valueOf() / 1000 // Convert to seconds
      const nextDayEpoch = date.add(1, 'day').startOf('day').utc().valueOf() / 1000 // Convert to seconds

      const response = await axios.get(
        `https://ev-app-api.aws.playco.com/api/media/channel/events?channels=all&ts_start=${todayEpoch}&ts_end=${nextDayEpoch}&lang=ar`
      )

      return response.data.data.map(channel => ({
        lang: 'ar',
        name: channel.title,
        site_id: channel.slug
      }))
    } catch (error) {
      console.error('Error fetching channels:', error.message)
      return []
    }
  }
}
