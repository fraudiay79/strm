const axios = require('axios')
const iconv = require('iconv-lite')
const parser = require('epg-parser')

let cachedContent

module.exports = {
  site: 'epg.pakistan',
  days: 2,
  url: 'https://www.open-epg.com/files/pakistan.xml',
  request: {
    maxContentLength: 100000000, // 100 MB
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
      const buffers = await Promise.all(
        this.urls.map(url => axios.get(url, { responseType: 'arraybuffer' }).then(r => r.data))
      )

      const decodedBuffers = buffers.map(buffer => iconv.decode(buffer, 'utf8').trim())
      const parsedData = decodedBuffers.map(decoded => parser.parse(decoded))

      let channels = []
      parsedData.forEach(data => {
        channels = channels.concat(data.channels)
      })

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
      console.log('First few lines of the XML data:', encoded.slice(0, 500)) // Log the first 500 characters of the XML data for inspection
      cachedContent = parser.parse(encoded)
    } catch (err) {
      console.error('Failed to parse EPG data:', err.message)
      console.error('Error details:', err)
      console.error('Problematic XML snippet:', buffer.toString().slice(0, 200)) // Log the problematic XML snippet
      return []
    }
  }

  const { programs } = cachedContent

  return programs.filter(p => p.channel === channel.site_id && date.isSame(p.start, 'day'))
}
