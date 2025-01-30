const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const languages = { en: 'en', ka: 'ka' }

module.exports = {
  site: 'silktv.ge',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://middleware-prod01.silktv.ge/v1.5/?m=epg&cid=${channel.site_id}&sdt=${date.unix()}&edt=${date.add(1, 'd').unix()}&language=ka`
  },
  parser: function ({ content }) {
  const data = JSON.parse(content)
  const programs = []

  data.data.forEach(item => {
    programs.push({
      name: item.title,
      description: item.descr || 'No description available',
      start: dayjs(item.start, 'YYYYMMDDHHmmssSS').unix(),
      stop: dayjs(item.end, 'YYYYMMDDHHmmssSS').unix()
    })
  })

  return programs
},
  async channels() {
  const axios = require('axios')
  try {
    const response = await axios.get(`https://middleware-prod01.silktv.ge/v1.5/?m=list-channels-all&sid=D40EC7E68344D040E4CD301B0F1019D4`)
    const data = response.data
    const channels = data.data.map(item => ({
      lang: 'ka',
      name: item.name,
      site_id: item.id
    }))
    return channels
  } catch (error) {
    console.error('Error fetching channels:', error)
    return []
  }
}
}
