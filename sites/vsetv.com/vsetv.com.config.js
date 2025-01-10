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
      let program = { title: '', start: '', stop: '' }

      $(container).children().each((i, elem) => {
        if ($(elem).hasClass('pasttime') || $(elem).hasClass('onair') || $(elem).hasClass('time')) {
          const timeString = parseTimeContent($, $(elem).contents())
          const startTime = dayjs.tz(`${formattedDate} ${timeString}`, 'YYYY-MM-DD HH:mm', 'Europe/Kiev').toISOString()

          if (program.title && program.start) {
            program.stop = startTime
            programs.push(program)
            program = { title: '', start: startTime, stop: '' }
          } else {
            program.start = startTime
          }

          previousEndTime = startTime
        } else if ($(elem).hasClass('pastprname2') || $(elem).hasClass('prname2')) {
          program.title = $(elem).text().trim()
        }
      })

      // Set stop time for the last program in the container (assuming it ends after 1 hour)
      if (program.start) {
        program.stop = dayjs(program.start).add(1, 'hour').toISOString()
        programs.push(program)
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

function parseTimeContent($, timeHtml) {
  const mapping = {
    "/pic/zn.gif": "0"
  }

  let timeString = ""
  timeHtml.each((index, elem) => {
    if (elem.type === "text") {
      timeString += $(elem).text()
    } else if (elem.type === "tag" && elem.name === "img") {
      const src = $(elem).attr("src")
      timeString += mapping[src] || ""
    }
  })

  return timeString
}
