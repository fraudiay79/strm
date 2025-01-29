const axios = require('axios')
const iconv = require('iconv-lite')
const parser = require('epg-parser')

let cachedContent

module.exports = {
  site: 'epg.pakistan',
  days: 2,
  url: 'https://www.open-epg.com/files/pakistan.xml',
  request: {
    maxContentLength: 500000000, // 500 MB
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  parser: function ({ buffer, channel, date, cached }) {
    if (!cached) cachedContent = undefined

    let programs = []
    const items = parseItems(buffer, channel, date)
    items.forEach(item => {
      programs.push({
        title: item.title?.[0]?.value || 'No Title',
        description: item.desc?.[0]?.value || 'No Description',
        start: item.start,
        stop: item.stop
      })
    })

    return programs
  },
  async channels() {
    try {
      const buffer = await axios
        .get('https://www.open-epg.com/files/pakistan.xml', {
          responseType: 'arraybuffer'
        })
        .then(r => r.data)

      const decoded = iconv.decode(buffer, 'utf8').trim()
      const { channels } = parser.parse(decoded)

      return channels.map(channel => ({
        lang: 'ur',
        site_id: channel.id,
        name: channel.displayName[0].value
      }))
    } catch (err) {
      console.error('Failed to fetch or process channel data:', err.message)
      throw err
    }
  }
}

function parseItems(buffer, channel, date) {
  if (!buffer) return []

  if (!cachedContent) {
    try {
      const encoded = iconv.decode(buffer, 'utf8').trim()
      cachedContent = parser.parse(encoded)
    } catch (err) {
      console.error('Failed to parse EPG data:', err.message)
      return []
    }
  }

  const { programs } = cachedContent

  return programs.filter(p => p.channel === channel.site_id && date.isSame(p.start, 'day'))
}
