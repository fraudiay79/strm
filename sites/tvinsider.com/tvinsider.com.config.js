const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const cheerio = require('cheerio')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'tvinsider.com',
  channels: 'tvinsider.com.channels.xml',
  days: 14, // maxdays=5
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br, zstd'
    }
  },
  url({ channel }) {
    return `https://www.tvinsider.com/network/${channel.site_id}schedule/`
  },
  parser: function ({ content, date }) {
    const $ = cheerio.load(content)
    const programs = []
    let previousEndTime = null

    $('a.show-upcoming.live').each((index, element) => {
      const $element = $(element)
      const time = $element.find('time').text().trim()
      const startTime = dayjs.tz(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD hh:mm A', 'America/New_York').format()
      const endTime = previousEndTime ? dayjs(previousEndTime).add(1, 'hour').utc().format() : dayjs.tz(startTime).add(1, 'hour').format()
      const title = $element.find('h3').text().trim()
      const seriesInfo = $element.find('h4').text().trim().match(/(.*) • (\d{4})/)
      const category = seriesInfo ? seriesInfo[1] : null
      const year = seriesInfo ? seriesInfo[2] : null
      const episodeTitle = $element.find('h5').text().trim()
      const seasonEpisodeInfo = $element.find('h6').text().trim().match(/Season (\d+) • Episode (\d+)/)
      const season = seasonEpisodeInfo ? seasonEpisodeInfo[1] : null
      const episode = seasonEpisodeInfo ? seasonEpisodeInfo[2] : null
      const description = $element.find('p').text().trim()

    programs.push({
      title,
      description,
      category,
      year,
      episodeTitle,
      season,
      episode,
      start: startTime,
      stop: endTime
    })

    previousEndTime = endTime
  })

  return programs
}
}
