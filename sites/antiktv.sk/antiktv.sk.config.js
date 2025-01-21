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
      Object.values(data[date]).forEach(channelData => {
      if (channelData && channelData.epg) {
        channelData.epg.forEach(item => {
          const programData = {
            title: item.Title,
            subtitle: item.Subtitle,
            description: item.Description,
            //icon: item.Icon,
            //category: item.Genres,
            start: dayjs.tz(item.Start, 'Europe/Prague'),
            stop: dayjs.tz(item.Stop, 'Europe/Prague')
          }

          programs.push(programData)
        })
      } else {
        console.warn('Missing EPG data for channel:', channelData)
      }
    })
  })

  return programs
},
  async channels() {
    let channels = []
    const data = await axios
    .get(`https://antiktv.sk/en/epg/epg/?action=getEpgList&options[day]=${dayjs().format('YYYY-MM-DD')}&isAjax=true`)
    .then(r => r.data)
    .catch(console.log)

  const channelsArray = Object.values(data?.data?.filters?.initArray?.channels || {})

    return channelsArray.map(item => {
        return {
            lang: 'sk',
            site_id: item.id_content,
            name: item.name
        }
    })
}
}
