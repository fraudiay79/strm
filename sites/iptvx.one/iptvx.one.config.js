const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')

dayjs.extend(utc)

module.exports = {
  site: 'iptvx.one',
  days: 14,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel }) {
    return `https://epg.iptvx.one/api/id/${channel.site_id}.json`
  },
  parser: function ({ content, channel }) {
    const programs = []
    const data = JSON.parse(content)
    if (!data.ch_programme) return programs

    data.ch_programme.forEach((item, index) => {
      if (!item.title || !item.start) return
      const start = dayjs.utc(item.start, 'DD-MM-YYYY HH:mm')
      let stop
      if (index < data.ch_programme.length - 1) {
        const nextStart = dayjs.utc(data.ch_programme[index + 1].start, 'DD-MM-YYYY HH:mm')
        stop = nextStart.subtract(1, 'minute')
      } else {
        stop = start.add(1, 'hour')
      }
      
      programs.push({
        title: item.title,
        description: item.description,
        category: item.category,
        start,
        stop,
      })
    })

    return programs

},
  async channels() {
    const axios = require('axios')
    try {
      const data = await axios.get(`https://epg.iptvx.one/api/channels.json`)
      return data.channels.map(item => {
        return {
          lang: 'ru',
          name: item.chan_names,
          site_id: item.chan_id
        }
      })
    } catch (error) {
      console.error('Error fetching channels:', error)
      // Consider returning a default value or throwing an error
    }
  }
}
