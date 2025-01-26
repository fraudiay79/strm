const axios = require('axios')
const iconv = require('iconv-lite')
const parser = require('epg-parser')
const { ungzip } = require('pako')
const { default: translate } = require('googletrans')

let cachedContent

async function translateContent(text, targetLang) {
  if (!text) return text
  try {
    let translation = await translate(text, { to: targetLang })
    return translation.text
  } catch (error) {
    console.log(`Error translating text: ${error.message}`)
    return text
  }
}

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
  parser: async function ({ buffer, channel, date, cached }) {
    if (!cached) cachedContent = undefined

    let programs = []
    try {
      const items = parseItems(buffer, channel, date)
      console.log(`Parsed ${items.length} items`) // Log number of parsed items
      for (let item of items) {
        let title = item.title?.[0]?.value
        let description = item.desc?.[0]?.value
        // Check if lang is 'ur' before translating
        if (item.lang === 'ur') {
          title = await translateContent(title, 'ur')
          description = await translateContent(description, 'ur')
        }
        programs.push({
          title: title,
          description: description,
          start: item.start,
          stop: item.stop
        })
      }
    } catch (error) {
      console.log(`Error parsing items: ${error.message}`)
    }

    return programs
  },
  async channels() {
    try {
      const data = await axios.get('https://www.open-epg.com/files/pakistan.xml')
      const { channels } = parser.parse(data)

      return channels.map(channel => ({
        lang: 'ur',
        site_id: channel.id,
        name: channel.displayName?.[0]?.value
      }))
    } catch (error) {
      console.log(`Error fetching channels: ${error.message}`)
      return []
    }
  }
}

function parseItems(buffer, channel, date) {
  if (!buffer) return []

  try {
    if (!cachedContent) {
      const content = ungzip(buffer)
      const encoded = iconv.decode(content, 'utf8')
      cachedContent = parser.parse(encoded)
      console.log(`Cached content parsed`) // Log when cached content is parsed
    }

    const { programs } = cachedContent
    console.log(`Programs: ${programs.length}`) // Log number of programs in cached content

    return programs.filter(p => p.channel === channel.site_id && date.isSame(p.start, 'day'))
  } catch (error) {
    console.log(`Error parsing items: ${error.message}`)
    return []
  }
}
