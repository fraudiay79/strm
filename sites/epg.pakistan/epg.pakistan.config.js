const axios = require('axios')
const iconv = require('iconv-lite')
const parser = require('epg-parser')
const { ungzip } = require('pako')
const { default: translate } = require('googletrans')

let cachedContent

async function translateContent(text, targetLang) {
  if (!text) return text
  try {
    let translation = await translate(text, { to: targetLang }, { timeout: 10000 }) // Increase timeout to 10 seconds
    return translation.text
  } catch (error) {
    console.log(`Error translating text: ${error.message}`)
    return text
  }
}

module.exports = {
  site: 'epg.pakistan',
  days: 2,
  url: 'https://www.open-epg.com/files/pakistan.xml.gz',
  request: {
    maxContentLength: 500000000, // 500 MB
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  parser: async function ({ buffer, channel, date, cached }) {
    if (!cached) cachedContent = undefined

    let programs = []
    const items = parseItems(buffer, channel, date)
    for (let item of items) {
      const title = await translateContent(item.title?.[0]?.value, 'ur')
      const description = await translateContent(item.desc?.[0]?.value, 'ur')
      programs.push({
        title: title,
        description: description,
        start: item.start,
        stop: item.stop
      })
    }

    return programs
  },
  async channels() {
    const buffer = await axios
      .get('https://www.open-epg.com/files/pakistan.xml', {
        responseType: 'arraybuffer'
      })
      .then(r => r.data)
      .catch(console.log)

    const data = ungzip(buffer)
    const decoded = iconv.decode(data, 'utf8')
    const { channels } = parser.parse(decoded)

    return channels.map(channel => ({
      lang: 'ur',
      site_id: channel.id,
      name: channel.displayName[0].value
    }))
  }
}

function parseItems(buffer, channel, date) {
  if (!buffer) return []

  if (!cachedContent) {
    const content = ungzip(buffer)
    const encoded = iconv.decode(content, 'utf8')
    cachedContent = parser.parse(encoded)
  }

  const { programs } = cachedContent

  return programs.filter(p => p.channel === channel.site_id && date.isSame(p.start, 'day'))
}
