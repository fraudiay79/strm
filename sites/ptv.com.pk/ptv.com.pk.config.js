// Disable TLS validation (use cautiously)
//process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const cheerio = require('cheerio')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

function parseProgramTime(timeStr) {
  const timeZone = 'Asia/Karachi'

  if (/am|pm|AM|PM/.test(timeStr)) {
    if (timeStr.includes('.') && !timeStr.includes(' ')) {
      return dayjs.tz(timeStr, 'h.mm a', timeZone).format('YYYY-MM-DDTHH:mm:ssZ')
    } else if (timeStr.includes(':')) {
      return dayjs.tz(timeStr, 'h:mm A', timeZone).format('YYYY-MM-DDTHH:mm:ssZ')
    } else {
      return dayjs.tz(timeStr.replace(/\s+/g, ''), 'hmmA', timeZone).format('YYYY-MM-DDTHH:mm:ssZ')
    }
  } else if (timeStr.includes('.')) {
    return dayjs.tz(timeStr, 'H.mm', timeZone).format('YYYY-MM-DDTHH:mm:ssZ')
  } else if (timeStr.includes(':')) {
    return dayjs.tz(timeStr, 'HH:mm', timeZone).format('YYYY-MM-DDTHH:mm:ssZ')
  } else if (timeStr.length === 4 && /^\d{4}$/.test(timeStr)) {
    return dayjs.tz(timeStr, 'HHmm', timeZone).format('YYYY-MM-DDTHH:mm:ssZ')
  } else if (/PST/.test(timeStr)) {
    const pstTime = timeStr.match(/(\d{4})PST/)
    if (pstTime) {
      return dayjs.tz(pstTime[1], 'HHmm', 'Asia/Karachi').format('YYYY-MM-DDTHH:mm:ssZ')
    } else {
      return 'Invalid PST time format'
    }
  } else {
    return 'Invalid time format'
  }
}

function calculateStopTime(start) {
  const timeZone = 'Asia/Karachi'
  return dayjs.tz(start, 'YYYY-MM-DDTHH:mm:ssZ', timeZone).add(1, 'hour').format('YYYY-MM-DDTHH:mm:ssZ')
}

function toProperCase(str) {
  return str.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
}

module.exports = {
  site: 'ptv.com.pk',
  channels: 'ptv.com.pk.channels.xml',
  days: 2,
  request: {
    method: 'GET',
    headers: {
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  url: function ({ date, channel }) {
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    const parsedDate = dayjs(date, 'ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (z)')
    const day = parsedDate.day()
    const dayName = daysOfWeek[day]
    return `https://ptv.com.pk/tvguidemaster?channelid=${channel.site_id}&dayofweek=${dayName}&date=${parsedDate.format('ddd MMM DD YYYY HH:mm:ss [GMT]ZZ (z)')}`
  },
  parser: function ({ content, date }) {
    let programs = []

    try {
      const $ = cheerio.load(content)
      $('.rt-post').each((index, element) => {
        const timeStr = $(element).find('.rt-meta').text().trim()
        const title = $(element).find('.post-title').text().trim()
        if (timeStr && title) {
          const start = parseProgramTime(timeStr)
          const stop = calculateStopTime(start)
          programs.push({
            title: toProperCase(title),
            start,
            stop
          })
        }
      })
    } catch (error) {
      console.error('Error parsing content:', error.message)
    }

    return programs
  }
}
