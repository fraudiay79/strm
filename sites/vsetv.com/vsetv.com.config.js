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
  url({ channel }) {
    return `http://www.vsetv.com/schedule_package_uabase_day_${date.format('YYYY-MM-DD')}.html`
  },
  parser: function ({ content, date }) {
    const $ = cheerio.load(content)
    const programs = []
    const formattedDate = dayjs(date).format('YYYY-MM-DD')

    $('#schedule_container').each((index, container) => {
      let previousEndTime = null

      $(container).children().each((i, elem) => {
        if ($(elem).hasClass('time')) {
          const timeString = parseTime($, $(elem).contents())
          const startTime = dayjs.tz(`${formattedDate} ${timeString}`, 'YYYY-MM-DD HH:mm', 'Europe/Kiev').toISOString()

          if (previousEndTime) {
            programs[programs.length - 1].stop = startTime
          }

          programs.push({
            title: '',
            start: startTime,
            stop: '' // Will be updated when the next program's start time is found
          })

          previousEndTime = startTime
        } else if ($(elem).hasClass('prname2')) {
          const title = $(elem).text().trim() || $(elem).find('a').text().trim()
          programs[programs.length - 1].title = title
        }
      })

      // Set stop time for the last program in the container (assuming it ends after 1 hour)
      if (previousEndTime) {
        programs[programs.length - 1].stop = dayjs(previousEndTime).add(1, 'hour').toISOString()
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
          name: name,
          site_id: siteId
        })
      }
    })

    return channels
  }
}

function parseTime($, timeHtml) {
  // Define the mapping for the image sources
  const mapping = {
    "/pic/j8.gif": "0",
    "/pic/p7.gif": "5"
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