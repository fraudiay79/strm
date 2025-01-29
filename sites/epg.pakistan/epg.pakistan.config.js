const axios = require('axios')
const parser = require('epg-parser')

module.exports = {
  site: 'epg.pakistan',
  days: 1,
  url: 'https://www.open-epg.com/files/pakistan.xml',
  request: {
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  parser: function ({ content, channel, date }) {
    let programs = []
    const items = parseItems(content, channel, date)
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
    const data = await axios
      .get('https://www.open-epg.com/files/pakistan.xml')
      .then(r => r.data)
      .catch(console.log)
    const { channels } = parser.parse(data)

    return channels.map(channel => ({
      lang: 'ur',
      site_id: channel.id,
      name: channel.displayName[0].value
    }))
  }
}

function parseItems(content, channel, date) {
  const { programs } = parser.parse(content)

  return programs.filter(p => p.channel === channel.site_id && date.isSame(p.start, 'day'))
}
