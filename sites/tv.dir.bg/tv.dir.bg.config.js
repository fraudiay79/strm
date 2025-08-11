const axios = require('axios')
const cheerio = require('cheerio')
const { DateTime } = require('luxon')

module.exports = {
  site: 'tv.dir.bg',
  days: 2,

  url() {
    return 'https://tv.dir.bg/programa'
  },

  async channels() {
    const html = await axios
      .get('https://tv.dir.bg/programa')
      .then(r => r.data)
      .catch(console.log)

    const $ = cheerio.load(html)
    const items = $('#programa-left > div > div > div > a').toArray()

    return items.map(item => {
      const $item = $(item)
      return {
        lang: 'bg',
        site_id: $item.attr('href').replace('tv_channel.php?id=', ''),
        name: $item.find('div.thumbnail > img').attr('alt')
      }
    })
  },

  parser({ content, date, channel }) {
    const programs = []
    const $ = cheerio.load(content)

    const channelBlock = $(`#events-${channel.site_id}`)
    const items = channelBlock.find('li').toArray()

    items.forEach(item => {
      const $item = cheerio.load(item)
      const prev = programs[programs.length - 1]
      let start = parseStart($item, date)
      if (!start) return

      if (prev && start < prev.start) {
        start = start.plus({ days: 1 })
        date = date.plus({ days: 1 })
        prev.stop = start
      }

      const stop = start.plus({ minutes: 30 }) // default duration
      programs.push({
        title: parseTitle($item),
        start,
        stop
      })
    })

    return programs
  }
}

function parseStart($item, date) {
  const time = $item('i').text().trim()
  if (!time) return null

  const dateString = `${date.toFormat('MM/dd/yyyy')} ${time}`
  return DateTime.fromFormat(dateString, 'MM/dd/yyyy HH.mm', { zone: 'Europe/Sofia' }).toUTC()
}

function parseTitle($item) {
  return $item.text().replace(/^\d{2}.\d{2}/, '').trim()
}
