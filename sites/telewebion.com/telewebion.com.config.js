const dayjs = require('dayjs')
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
    let programs = [];
    const data = JSON.parse(content)
    const programsData = data.body.queryChannel.episodes || []

    programsData.forEach(item => {
      const start = dayjs.tz(item.started_at, 'Asia/Tehran') 
      const start = dayjs.tz(item.ended_at, 'Asia/Tehran')

      programs.push({
        title: item.title,
        start,
        stop
      })
    })

    return programs
  }
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
