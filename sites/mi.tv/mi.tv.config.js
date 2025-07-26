const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(customParseFormat)

const customAxios = axios.create({
  headers: {
    'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/138 Safari/537.36',
    'X-Requested-With': 'XMLHttpRequest'
  }
})

module.exports = {
  site: 'mi.tv',
  days: 2,
  url({ date, channel }) {
    const [country, id] = channel.site_id.split('#')
    return `https://mi.tv/${country}/canales/${id}/${date.format('YYYY-MM-DD')}`
  },
  async parser({ date, channel }) {
    const url = module.exports.url({ date, channel })
    const html = await customAxios.get(url).then(r => r.data).catch(console.error)
    const $ = cheerio.load(html)
    const programs = []

    // Adapted for América 24-style listings
    $('.channel-schedule .program').each((i, el) => {
      const $el = $(el)

      const timeString = $el.find('.program-time').text().trim()
      const title = $el.find('.program-title').text().trim()
      const description = $el.find('.program-description').text().trim()

      if (!timeString || !title) return

      const start = dayjs.utc(`${date.format('MM/DD/YYYY')} ${timeString}`, 'MM/DD/YYYY HH:mm')
      const stop = start.add(1, 'hour') // You may adjust duration if detailed data is available

      programs.push({
        title,
        category: '', // No clear category info in this layout
        description,
        icon: extractImage($el),
        start,
        stop
      })
    })

    return programs
  },
  async channels({ country }) {
    let lang = country === 'br' ? 'pt' : 'es'
    const sitemapUrl = `https://mi.tv/${country}/sitemap`

    const html = await customAxios.get(sitemapUrl).then(r => r.data).catch(console.error)
    const $ = cheerio.load(html)
    const channels = []

    $(`#page-contents a[href*="${country}/canales"], a[href*="${country}/canais"]`).each((i, el) => {
      const name = $(el).text().trim()
      const url = $(el).attr('href')
      const [, , , channelId] = url.split('/')
      channels.push({
        lang,
        name,
        site_id: `${country}#${channelId}`
      })
    })

    return channels
  }
}

function extractImage($el) {
  const bg = $el.find('.image').css('background-image')
  const [, image] = bg.match(/url\(['"]?(.*?)['"]?\)/) || [null, null]
  return image
}
