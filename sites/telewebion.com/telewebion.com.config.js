const dayjs = require('dayjs')

module.exports = {
  site: 'telewebion.com',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://gateway.telewebion.com/kandoo/channel/getChannelEpisodesByDate/?ChannelDescriptor=${channel.site_id}&FromDate=${date.startOf('day').format('YYYY-MM-DDTHH:mm:ss')}&ToDate=${date.endOf('day').format('YYYY-MM-DDTHH:mm:ss')}&IsClip=false&First=24&Offset=0`
  },
  parser({ content }) {
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      if (!item.details) return
      const start = dayjs(item.time)
      const stop = start.add(item.details.duration, 'm')
      programs.push({
        title: item.title,
        category: item.details.categories,
        description: item.details.description,
        image: item.details.image,
        season: parseSeason(item),
        episode: parseEpisode(item),
        start,
        stop
      })
    })

    return programs
  },
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get(`https://gateway.telewebion.com/kandoo/channel/getChannelsList/?NumOfItems=300&v=1.6.9`)
      .then(r => r.data)
      .catch(console.log)

    return data.body.queryChannel.map(item => {
      return {
        lang: 'fa',
        site_id: item.descriptor,
        name: item.name
      }
    })
  }
}

function parseItems(content, channel) {
  const data = JSON.parse(content)
  if (!data || !Array.isArray(data.channels)) return []
  const channelData = data.channels.find(i => i.id === channel.site_id)

  return channelData && Array.isArray(channelData.events) ? channelData.events : []
}

function parseSeason(item) {
  return item.details.season || null
}
function parseEpisode(item) {
  return item.details.episode || null
}
