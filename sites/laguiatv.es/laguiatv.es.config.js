const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'laguiatv.es',
  days: 1, // Adjust the number of days as needed
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br'
    }
  },
  url({ channel }) {
    return `https://www.laguiatv.es/programacion-hoy/${channel.site_id}`
  },
  async parser({ content }) {
    const $ = cheerio.load(content)
    const scriptContent = $('script[type="application/ld+json"]').html()
    const data = JSON.parse(scriptContent)

    const programs = data.map(event => ({
      title: event.name,
      start: dayjs(event.startDate).toISOString(),
      stop: dayjs(event.endDate).toISOString(),
      description: event.description
    }))

    return programs
  },
  async channels() {
    const response = await axios.get('https://www.laguiatv.es/canales', {
      headers: {
        'Accept-Encoding': 'gzip, deflate, br'
      }
    })
    const $ = cheerio.load(response.data)
    const channels = []

    $('div.row div.channel-block-item').each((index, element) => {
      const $element = $(element)
      const name = $element.find('img').attr('alt')
      const site_id = $element.find('a').attr('href').split('/').pop()
      const logo = $element.find('img').attr('src')

      channels.push({
        lang: 'es',
        name: name,
        site_id: site_id
      })
    })

    return channels
  }
}
