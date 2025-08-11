const axios = require('axios')
const cheerio = require('cheerio')
const { DateTime } = require('luxon')

module.exports = {
  site: 'tv.dir.bg',
  days: 2,
  url({ channel, date }) {
    return `https://tv.dir.bg/programa/${channel.site_id}&date=${date.format('YYYY-MM-DD')}`
  },
  parser({ content, date }) {
    const programs = []
    const items = parseItems(content)
    
    items.forEach(item => {
      const $item = cheerio.load(item)
      const prev = programs[programs.length - 1]
      let start = parseStart($item, date)
      if (!start) return
      
      if (prev) {
        if (start < prev.start) {
          start = start.plus({ days: 1 })
          date = date.add(1, 'd')
        }
        prev.stop = start
      }
      
      const stop = start.plus({ minutes: 30 }) // Default duration if not specified
      programs.push({
        title: parseTitle($item),
        start,
        stop
      })
    })

    return programs
  },
  async channels() {
    const html = await axios
      .get('https://tv.dir.bg/programa')
      .then(r => r.data)
      .catch(console.log)

    const $ = cheerio.load(html)
    const channels = []
    
    $('#channels-list a').each(function() {
      const $link = $(this)
      const href = $link.attr('href')
      const match = href.match(/channel=(\d+)/)
      
      if (match) {
        channels.push({
          lang: 'bg',
          site_id: match[1],
          name: $link.find('img').attr('alt')
        })
      }
    })

    return channels
  }
}

function parseStart($item, date) {
  const timeText = $item('span.time').text().trim()
  if (!timeText) return null
  
  const [hours, minutes] = timeText.split(':').map(Number)
  return DateTime.fromObject({
    year: date.year,
    month: date.month,
    day: date.day,
    hour: hours,
    minute: minutes,
    zone: 'Europe/Sofia'
  }).toUTC()
}

function parseTitle($item) {
  return $item('span.title').text().trim()
}

function parseItems(content) {
  const $ = cheerio.load(content)
  return $('div.program-list li').toArray()
}
