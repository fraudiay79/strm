const dayjs = require('dayjs')
const axios = require('axios')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'go3tv.ee',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    const formattedDate = date.format('YYYY-MM-DD')
    const since = `${formattedDate}T00:00-0500`
    const till = `${formattedDate}T23:59-0500`
    return `https://go3.tv/api/products/lives/programmes?liveId[]=${channel.site_id}&since=${since}&till=${till}&platform=BROWSER&lang=EE&tenant=OM_EE`
  },
  parser: async function ({ content }) {
    try {
      const data = JSON.parse(content)
      return this.parseEPGData(data)
    } catch (error) {
      console.error('Error parsing EPG data:', error)
      return []
    }
  },
  parseEPGData(data) {
    return data.map(program => ({
      id: program.id,
      title: program.title,
      description: program.description || 'No description available',
      start: dayjs(program.since).format('YYYY-MM-DDTHH:mm:ssZ'),
      stop: dayjs(program.till).format('YYYY-MM-DDTHH:mm:ssZ'),
      category: program.genres.map(genre => genre.name),
      icon: program.images && program.images.android_tv && program.images.android_tv.length > 0 ? 'https:' + program.images.android_tv[0].miniUrl : ''
    }))
  },
  async channels() {
  const axios = require('axios')
  try {
    const data = await axios
      .get('https://go3.tv/api/products/sections/v2/live_tv?platform=BROWSER&lang=EE&tenant=OM_EE')
      .then(r => r.data)
      .catch(console.log)

    // Map through the elements array within sections
    return data.elements[0].item.map(element => {
      const { id, title } = element.item
      return {
        lang: 'ee',
        site_id: id,
        name: title
      }
    })
  } catch (error) {
    console.error('Error fetching channels:', error)
    return []
  }
}

}
