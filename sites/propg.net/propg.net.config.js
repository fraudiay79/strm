const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'propg.net',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `http://epg.propg.net/${channel.site_id}/epg2/${date.format('YYYY-MM-DD')}`
  },
  parser: function ({ content }) {
    const data = JSON.parse(content)
    const programs = []

  data.forEach(item => {
    programs.push({
      name: item.epg,
      description: item.desc || 'No description available',
      start: dayjs.unix(item.start),
      stop: dayjs.unix(item.stop)
    })
  })

  return programs
  },
  async channels() {
    const axios = require('axios')
    try {
      const response = await axios.get(`https://exposure.api.redbee.live/v1/customer/Nova/businessunit/novatvprod/content/asset?assetType=TV_CHANNEL`)
      return response.data.items.map(item => {
        return {
          lang: 'is',
          name: item.localized[0].title,
          site_id: item.assetId
        }
      })
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}
