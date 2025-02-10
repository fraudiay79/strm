const axios = require('axios')
const iconv = require('iconv-lite')
const parser = require('epg-parser')
const { ungzip } = require('pako')

let cachedContent

module.exports = {
  site: 'epgshare01.online',
  days: 2,
  url({ channel }) {
    const [tag] = channel.site_id.split('#')

    return `https://epgshare01.online/epgshare01/epg_ripper_${tag}.xml.gz`
  },
  request: {
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  parser({ buffer, channel, date, cached }) {
    if (!cached) cachedContent = undefined

    let programs = []
    const items = parseItems(buffer, channel, date)
    items.forEach(item => {
      let program = {
        title: item.title?.[0]?.value,
        description: item.desc?.[0]?.value,
        icon: item.icon?.[0]?.value,
        credits: [],
        category: [],
        start: item.start,
        stop: item.stop,
      }

      if (item.credits?.[0]) {
        program.credits = item.credits[0].children.map(credit => ({
          role: credit.tagName,
          name: credit.value
        }))
      }

      if (item.category?.length > 0) {
        program.category = item.category.map(cat => cat.value)
      }

      programs.push(program)
    })

    return programs
  },
  async channels({ tag }) {
    const buffer = await axios
      .get(`https://epgshare01.online/epgshare01/epg_ripper_${tag}.xml.gz`, {
        responseType: 'arraybuffer'
      })
      .then(r => r.data)
      .catch(console.error)

    const content = ungzip(buffer)
    const encoded = iconv.decode(content, 'utf8')
    const { channels } = parser.parse(encoded)

    return channels.map(channel => {
      const displayName = channel.displayName[0]

      return {
        lang: displayName.lang || 'en',
        site_id: `${tag}#${channel.id}`,
        name: displayName.value
      }
    })
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
  const [, channelId] = channel.site_id.split('#')

  return programs.filter(p => p.channel === channelId && date.isSame(p.start, 'day'))
}
