process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'

const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'directv.com.ar',
  days: 2,
  url: 'https://www.directv.com.ar/guia/guia.aspx/GetProgramming',
  request: {
    method: 'POST',
    headers: {
      Cookie: 'PGCSS=16; PGLang=S; PGCulture=es-AR;',
      Accept: '*/*',
      'Accept-Language': 'es-419,es;q=0.9',
      Connection: 'keep-alive',
      'Content-Type': 'application/json; charset=UTF-8',
      Origin: 'https://www.directv.com.ar',
      Referer: 'https://www.directv.com.ar/guia/ChannelDetail.aspx?id=1740&name=TLCHD',
      'Sec-Fetch-Dest': 'empty',
      'Sec-Fetch-Mode': 'cors',
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36',
      'sec-ch-ua': '"Not.A/Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
      'sec-ch-ua-mobile': '?0',
      'sec-ch-ua-platform': '"Windows"',
      'X-Requested-With': 'XMLHttpRequest'
    },
    data({ channel, date }) {
      const [channelNum, channelName] = channel.site_id.split('#')
      return {
        filterParam: {
          day: date.date(),
          time: 0,
          minute: 0,
          month: date.month() + 1,
          year: date.year(),
          offSetValue: 0,
          homeScreenFilter: '',
          filtersScreenFilters: [''],
          isHd: '',
          isChannelDetails: 'Y',
          channelNum,
          channelName: channelName.replace('&amp;', '&')
        }
      }
    }
  },

  // 👇 Main parser with HTML fallback
  parser({ content, channel }) {
    const trimmed = content.trim()

    if (trimmed.startsWith('{')) {
      const items = parseItems(content, channel)
      return items.map(item => ({
        title: item.title,
        description: item.description,
        rating: parseRating(item),
        start: parseStart(item),
        stop: parseStop(item)
      }))
    } else {
      console.warn(`📄 Using HTML parser for ${channel.site_id}`)
      return parseHTML(content, channel)
    }
  }
}

// ✅ Extract programs from JSON
function parseItems(content, channel) {
  let [ChannelNumber] = channel.site_id.split('#')
  const data = JSON.parse(content)

  if (!data || !Array.isArray(data.d)) return []

  const channelData = data.d.find(c => String(c.ChannelNumber) === String(ChannelNumber))
  return channelData?.ProgramList ?? []
}

// 🎬 Parse rating
function parseRating(item) {
  return item.rating
    ? {
        system: 'MPA',
        value: item.rating
      }
    : null
}

// 🕒 Time parsing
function parseStart(item) {
  return dayjs.tz(item.startTimeString, 'M/D/YYYY h:mm:ss A', 'America/Argentina/Buenos_Aires')
}

function parseStop(item) {
  return dayjs.tz(item.endTimeString, 'M/D/YYYY h:mm:ss A', 'America/Argentina/Buenos_Aires')
}

// 🧩 HTML fallback parser
function parseHTML(content, channel) {
  const $ = cheerio.load(content)
  const programs = []

  $('div.program').each((_, elem) => {
    const title = $(elem).find('.title').text().trim()
    const description = $(elem).find('.description').text().trim()
    const timeString = $(elem).find('.time').text().trim()

    const [startStr, endStr] = timeString.split(' - ')
    const start = dayjs.tz(startStr, 'h:mm A', 'America/Argentina/Buenos_Aires')
    const stop = dayjs.tz(endStr, 'h:mm A', 'America/Argentina/Buenos_Aires')

    programs.push({
      title,
      description,
      rating: null,
      start,
      stop
    })
  })

  return programs
}
