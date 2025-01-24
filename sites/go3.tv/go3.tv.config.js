const dayjs = require('dayjs')
const axios = require('axios')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'go3.tv',
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
    return [
      `https://go3.lv/api/products/lives/programmes?liveId[]=${channel.site_id}&since=${since}&till=${till}&platform=BROWSER`,
      `https://go3.lt/api/products/lives/programmes?liveId[]=${channel.site_id}&since=${since}&till=${till}&platform=BROWSER`,
      `https://go3.tv/api/products/lives/programmes?liveId[]=${channel.site_id}&since=${since}&till=${till}&platform=BROWSER`
    ]
  },
  async parser({ content, channel }) {
    const urls = this.url({ channel, date: dayjs() })
    for (const url of urls) {
      try {
        const response = await axios.get(url)
        const data = response.data
        
        // Log and check types
        console.log('Data:', data)
        console.log('Description type:', typeof data[0]?.description)
        
        if (Array.isArray(data) && data.length > 0 && typeof data[0].description === 'string') {
          return this.parseEPGData(data)
        }
      } catch (error) {
        console.error(`Error fetching EPG data from ${url}:`, error)
      }
    }
    return []
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
    try {
      const response = await axios.get('https://go3.tv/api/products/sections/v2/live_tv?platform=BROWSER&lang=EE&tenant=OM_EE')
      return response.data.sections[0].items.map(item => ({
        lang: 'ee',
        name: item.title,
        site_id: item.id
      }))
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}
