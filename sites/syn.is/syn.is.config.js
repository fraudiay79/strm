const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const axios = require('axios')

dayjs.extend(utc)

module.exports = {
  site: 'syn.is',
  channels: 'syn.is.channels.xml',
  days: 7,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://www.syn.is/api/epg${channel.site_id}/${date.format('YYYY-MM-DD')}`
  },
  parser: function ({ content }) {
    let data
    try {
      data = JSON.parse(content)
    } catch (error) {
      console.error('Error parsing JSON:', error)
      return []
    }

    const programs = []

    if (data && Array.isArray(data)) {
      data.forEach(item => {
        if (!item) return
        const start = dayjs.utc(item.upphaf)
        const stop = start.add(item.slott, 'm')

        programs.push({
          title: item.isltitill,
          sub_title: item.undirtitill,
          description: item.lysing,
          season: item.seria,
          episode: item.thattur,
          category: item.flokkur,
          actors: item.adalhlutverk,
          directors: item.leikstjori,
          start,
          stop
        })
      })
    }

    return programs
  },
  async channels() {
  try {
    const response = await axios.get('https://www.syn.is/api/epg')
    if (!response.data || !Array.isArray(response.data)) {
      console.error('Error: No channels data found')
      return []
      }
    return response.data.map(item => {
      return {
        lang: 'is',
        site_id: item
        }
      })
    } catch (error) {
    console.error('Error fetching channels:', error)
    return []
    }
  }
}
