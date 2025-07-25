const axios = require('axios')
const cheerio = require('cheerio')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

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
    return `https://mi.tv/${country}/async/channel/${id}/${date.format('YYYY-MM-DD')}/0`
  },
  parser({ content, date }) {
    const programs = []
    const items = parseItems(content)
    items.forEach(item => {
      const prev = programs[programs.length - 1]
      const $item = cheerio.load(item)
      let start = parseStart($item, date)
      if (!start) return
      if (prev && start.isBefore(prev.start)) {
        start = start.add(1, 'd')
        date = date.add(1, 'd')
        prev.stop = start
      } else if (prev) {
        prev.stop = start
      }
      const stop = start.add(1, 'h')
      programs.push({
        title: parseTitle($item),
        category: parseCategory($item),
        description: parseDescription($item),
        icon: parseImage($item),
        start,
        stop
      })
    })
    return programs
  },
  async channels({ country }) {
    let lang = country === 'br' ? 'pt' : 'es'
    const url = `https://mi.tv/${country}/sitemap`

    const data = await customAxios
      .get(url)
      .then(r => r.data)
      .catch(console.log)

    const $ = cheerio.load(data)
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
