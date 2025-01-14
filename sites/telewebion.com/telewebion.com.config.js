const dayjs = require('dayjs')
require('dayjs/locale/fa')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'telewebion.com',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://gateway.telewebion.com/kandoo/channel/getChannelEpisodesByDate/?ChannelDescriptor=${channel.site_id}&FromDate=${date.startOf('day').format('YYYY-MM-DDTHH:mm:ss')}&ToDate=${date.endOf('day').format('YYYY-MM-DDTHH:mm:ss')}&IsClip=false&First=24&Offset=0`
  },
  parser: function ({ content }) {
    let programs = []
    try {
      const data = JSON.parse(content)

      if (data.body && data.body.queryChannel) {
        data.body.queryChannel.forEach(channel => {
          channel.episodes.forEach(item => {
            if (item.program && item.started_at && item.ended_at) {
              programs.push({
                title: item.program.title,
                start: dayjs.tz(item.started_at, 'Asia/Tehran'),
                stop: dayjs.tz(item.ended_at, 'Asia/Tehran')
              })
            }
          })
        })
      } else {
        console.error("Invalid data structure: 'body.queryChannel' missing.")
      }
    } catch (error) {
      console.error("Error parsing content:", error)
    }

    return programs
},
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get(`https://gateway.telewebion.com/kandoo/channel/getChannelsList/?NumOfItems=300&v=1.6.9`)
      .then(r => r.data)
      .catch(console.log)

    return data.body.queryChannel.map(item => {
      return {
        lang: 'fa',
        site_id: item.descriptor,
        name: item.name
      }
    })
  }
}
