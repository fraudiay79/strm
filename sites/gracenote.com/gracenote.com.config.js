const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const timezone = require('dayjs/plugin/timezone')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(customParseFormat)
dayjs.extend(timezone)

module.exports = {
  site: 'gracenote.com',
  days: 7,

  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    method: 'GET',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      Origin: 'https://tvlistings.gracenote.com'
    }
  },

  url({ date, channel }) {
    const unixTime = Math.floor(dayjs(date).utc().valueOf() / 1000)

    const query = new URLSearchParams({
      lineupId: channel.lineupId || 'USA-DISH501-DEFAULT',
      timespan: '2',
      headendId: channel.headendId || 'DISH501',
      country: channel.countryCode || 'USA',
      timezone: channel.timezone || '',
      device: channel.device || 'X',
      postalCode: channel.postalCode || '10001',
      isOverride: 'true',
      time: unixTime.toString(),
      pref: '16,128',
      userId: '-',
      aid: channel.aid || 'tribnyc2dl',
      languagecode: channel.languagecode || 'en-us'
    })

    return `https://tvlistings.gracenote.com/api/grid?${query.toString()}`
  },

  parser({ content, channel }) {
  const data = JSON.parse(content)
  let programs = []

  const matchedChannel = data.channels.find(c => c.channelId?.toString() === channel.site_id)
  if (!matchedChannel || !matchedChannel.events) return []

  matchedChannel.events.forEach(event => {
    const start = dayjs(event.startTime).utc().toISOString()
    const stop = dayjs(event.endTime).utc().toISOString()
    const p = event.program || {}

    const season = p.season ? `S${p.season}` : ''
    const episode = p.episode ? `E${p.episode}` : ''
    const episodeCode = season || episode ? `${season}${episode}` : null

    const flags = event.flag || []
    const isLive = flags.includes('Live')
    let title = p.title || 'Untitled Program'
    if (isLive && !title.startsWith('Live:')) title = `Live: ${title}`

    programs.push({
      title,
      subtitle: p.episodeTitle || null,
      description: p.shortDesc || 'No description available',
      category: event.filter?.join(', ') || 'N/A',
      rating: event.rating || null,
      icon: event.thumbnail
        ? `https://zap2it.tmsimg.com/assets/${event.thumbnail}.jpg`
        : null,
      start,
      stop,
      episode: episodeCode
    })
  })

  return programs
},

  async channels() {
  const unixTime = Math.floor(dayjs().utc().valueOf() / 1000)

  const url = `https://tvlistings.gracenote.com/api/grid?lineupId=USA-DISH501-DEFAULT&timespan=2&headendId=DISH501&country=USA&device=X&postalCode=10001&isOverride=true&time=${unixTime}&pref=16%2C128&userId=-&aid=tribnyc2dl&languagecode=en-us`

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json',
        'Referer': 'https://tvlistings.gracenote.com/',
        'Origin': 'https://tvlistings.gracenote.com'
      }
    })

    const mappings = response.data?.callSignMappings || []

    return mappings.map(item => ({
      lang: 'en',
      site_id: item.channelId?.toString(),
      name: item.callSign
    }))
  } catch (error) {
    console.error('Error fetching Gracenote channel data:', error.message)
    return []
  }
}
}
