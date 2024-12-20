const dayjs = require('dayjs')

module.exports = {
  site: 'galamtv.kz',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel }) {
    return `https://galam.server-api.lfstrm.tv/channels/${channel.site_id}/programs?app.version=3.3.7`
  },
  parser: function ({ content }) {
    let programs = []
    const items = parseItems(content)
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.description,
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get(`https://galam.server-api.lfstrm.tv/channels-now?app.version=3.3.7`)
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'kk',
        site_id: item.channels.id,
        name: item.channels.info.metaInfo.title
      }
    })
  }
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.channels)) return []
  const channelData = data.channels.find(i => i.id === channel.site_id)

  return channelData && Array.isArray(channelData.programs) ? channelData.programs : []
}
