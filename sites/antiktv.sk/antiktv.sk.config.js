const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'antiktv.sk',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    const formattedDate = dayjs(date).format('YYYY-MM-DD')
    return `https://antiktv.sk/en/epg/epg/?action=getEpgList&options[day]=${formattedDate}&options[filters][channels][]=${channel.site_id}&isAjax=true`
  },
  parser: function ({ content }) {
    const programs = []

    const data = JSON.parse(content).data
    Object.keys(data).forEach(date => {
      data[date].forEach(channel => {
        channel.epg.forEach(item => {
          const programData = {
            title: item.Title,
            subtitle: item.Subtitle || null,
            description: item.Description || null,
            icon: item.Icon || null,
            category: item.Genres || [],
            start: dayjs.tz(item.Start, 'Europe/Prague'),
            stop: dayjs.tz(item.Stop, 'Europe/Prague')
          }

          programs.push(programData)
        })
      })
    })

    return programs
  },
  async channels() {
    const data = await axios
      .get(`https://antiktv.sk/en/epg/epg/?action=getEpgList&options[day]=2025-01-23&isAjax=true`)
      .then(r => r.data)
      .catch(console.log)
    
    if (data && data.filters && data.filters.initArray && data.filters.initArray.channels) {
      const channelsObject = data.filters.initArray.channels
      const channelsArray = Object.keys(channelsObject).map(key => channelsObject[key])

      return channelsArray.map(channel => {
        return {
          lang: 'sk',
          name: channel.name,
          site_id: channel.id_content
        }
    })
  }
}
