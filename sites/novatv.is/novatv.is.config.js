const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'novatv.is',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://exposure.api.redbee.live/v2/customer/Nova/businessunit/novatvprod/epg/${channel.site_id}/date/${date.format('YYYY-MM-DD')}`
  },
  parser: function ({ content }) {
    const programs = []

    const data = JSON.parse(content)
    data.programs.forEach(program => {
    const localizedData = program.asset.localized.find(loc => loc.locale === 'is') || program.asset.localized[0] // default to first if 'is' locale not found
    const start = dayjs.tz(program.startTime, 'Africa/Abidjan')
    const stop = dayjs.tz(program.endTime, 'Africa/Abidjan')
    const actors = program.asset.participants
      .filter(participant => participant.function === 'Actor')
      .slice(0, 3)
      .map(actor => actor.name)
    const director = program.asset.participants
      .find(participant => participant.function === 'Director')?.name
    const icon = localizedData.images.find(image => image.orientation === 'LANDSCAPE')?.url || null
    const episode = program.asset.episode
    const season = program.asset.season
    const programData = {
      title: localizedData.title,
      description: localizedData.description || localizedData.longDescription || localizedData.extendedDescription || localizedData.shortDescription || null,
      icon,
      actors,
      director,
      season,
      episode,
      start,
      stop
    }

    programs.push(programData)
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
