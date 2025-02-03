const dayjs = require('dayjs')

module.exports = {
  site: 'zap2it.com',
  days: 2,
  request: {
    method: 'POST',
    headers: {
	  'Accept': '*/*',
	  'Accept-Encoding': 'gzip, deflate, br, zstd',
	  'Origin': 'https://tvlistings.zap2it.com',
	  'Referer': 'https://tvlistings.zap2it.com/ss-list.html?aid=gapzap',
	  'X-Requested-With': 'XMLHttpRequest',
	  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
    }
  },
  url: function ({ date, channel }) {
    const todayEpoch = Math.floor(date.startOf('day').utc().valueOf() / 1000)
    return `https://tvlistings.zap2it.com/api/sslgrid?IsSSLinkNavigation=true&timespan=336&timestamp=${todayEpoch}&prgsvcid=${channel.site_id}&headendId=DITV&countryCode=USA&postalCode=32825&device=X&userId=-&aid=gapzap&DSTUTCOffset=-240&STDUTCOffset=-300&languagecode=en-us`
  },
  parser({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    items.forEach(item => {
      if (!item.startTime || !item.endTime) return
      const start = dayjs(item.startTime)
      const stop = dayjs(item.endTime)
      programs.push({
        title: item.program.title,
        category: item.program.seriesGenres,
        description: item.program.shortDesc,
        image: item.program.thumbnail ? `https://zap2it.tmsimg.com/assets/${item.program.thumbnail}.jpg` : null,
        season: parseSeason(item.program),
        episode: parseEpisode(item.program),
        start,
        stop
      })
    })

    return programs
  },
  async channels() {
    const axios = require('axios')
    const data = await axios
      .get(`https://tvlistings.zap2it.com/api/grid?lineupId=USA-DITV-DEFAULT&timespan=2&headendId=DITV&country=USA&timezone=&device=X&postalCode=32825&isOverride=true&time=1738591200&pref=64%2C128&userId=-&aid=gapzap&languagecode=en-us`)
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'en',
        site_id: item.channelId,
        name: item.callSign
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
  const match = item.episode && item.episode.match(/S(\d+)/)
  return match ? match[1] : null
}

function parseEpisode(item) {
  const match = item.episode && item.episode.match(/E(\d+)/)
  return match ? match[1] : null
}
