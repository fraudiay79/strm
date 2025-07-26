const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(customParseFormat)

function buildAxios(channelId) {
  return axios.create({
    headers: {
      'Accept': 'text/html,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': `https://mi.tv/ar/canales/${channelId}` // 💡 Added to bypass 403
    }
  })
}

module.exports = {
  site: 'mi.tv',
  days: 2,
  url({ date, channel }) {
    const [country, id] = channel.site_id.split('#')
    return `https://mi.tv/${country}/canales/${id}/${date.format('YYYY-MM-DD')}`
  },
  async parser({ date, channel }) {
    const [country, channelId] = channel.site_id.split('#')
    const url = module.exports.url({ date, channel })
    const axiosInstance = buildAxios(channelId)

    let html
    try {
      const response = await axiosInstance.get(url)
      html = response.data
    } catch (err) {
      console.error(`❌ Failed fetching ${channel.site_id} @ ${date.format('YYYY-MM-DD')}`)
      console.error('Status:', err.response?.status)
      console.error('Headers:', err.response?.headers)
      return []
    }

    const $ = cheerio.load(html)
    const programs = []

    const programElements = $('.channel-schedule .program').length > 0
      ? $('.channel-schedule .program') // 🆕 América 24-style
      : $('#page-contents .listing')     // 🧓 Older layout fallback

    programElements.each((i, el) => {
      const $el = $(el)

      const timeString =
        $el.find('.program-time').text().trim() ||
        $el.find('.time').first().text().trim()

      if (!timeString) return

      const start = dayjs.utc(`${date.format('MM/DD/YYYY')} ${timeString}`, 'MM/DD/YYYY HH:mm')
      const stop = start.add(1, 'hour') // ⏱️ Default 1-hour duration

      programs.push({
        title:
          $el.find('.program-title').text().trim() ||
          $el.find('h2').text().trim(),
        category: $el.find('.sub-title').text().trim() || '',
        description:
          $el.find('.program-description').text().trim() ||
          $el.find('.synopsis').text().trim(),
        icon: extractImage($el),
        start,
        stop
      })
    })

    return programs
  },
  async channels({ country }) {
    const lang = country === 'br' ? 'pt' : 'es'
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
