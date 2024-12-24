const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'vsetv.com',
  days: 7,
  timezone: 'Europe/Kiev',
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate'
    }
  },
  url({ channel, date }) {
    const formattedDate = dayjs(date).format('YYYY-MM-DD')
    return `http://www.vsetv.com/schedule_${channel.site_id}_day_${formattedDate}.html`
  },
  parser: function ({ content, date }) {
    const $ = cheerio.load(content)
    const programs = []
    const formattedDate = dayjs(date).format('YYYY-MM-DD')

    $('#schedule_container').each((index, container) => {
      let previousEndTime = null
      let startTime = null
      let title = ''

      $(container).children().each((i, elem) => {
        if ($(elem).hasClass('pasttime')) {
          const timeString = $(elem).text().trim()
          const startTimeString = `${formattedDate} ${timeString}`
          startTime = dayjs.tz(startTimeString, 'YYYY-MM-DD HH:mm', 'Europe/Kiev').toISOString()

          if (previousEndTime) {
            programs[programs.length - 1].stop = startTime
          }

          previousEndTime = startTime

          if (title) {
            programs.push({
              title,
              start: startTime,
              stop: '' // Temporary stop time
            })
          }
        } else if ($(elem).hasClass('pastprname2')) {
          title = $(elem).text().trim()
        }
      })

      // Set stop time for the last program in the container (assuming it ends after 1 hour)
      if (previousEndTime) {
        const lastProgram = programs[programs.length - 1]
        if (lastProgram) {
          lastProgram.stop = dayjs(previousEndTime).add(1, 'hour').toISOString()
        }
      }
    })

    return programs
  },
  async channels() {
    const response = await axios.get('http://www.vsetv.com/schedule.html', {
      headers: {
        'Accept-Encoding': 'gzip, deflate'
      }
    })
    const $ = cheerio.load(response.data)
    const channels = []

    $('select[name="selected_channel"] option').each((index, element) => {
      const siteId = $(element).val()
      const name = $(element).text().trim()

      // Exclude options with "package_no" value and empty options
      if (siteId && siteId !== 'package_no' && name && name !== '--выберите каналы--' && name !== '--каналы по регионам--' && name !== '--каналы по операторам--' && name !== '--отдельные каналы--') {
        channels.push({
          lang: 'uk',
          name,
          site_id: siteId
        })
      }
    })

    return channels
  }
}
