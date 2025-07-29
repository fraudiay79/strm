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
    method: 'POST',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
      'Content-Type': 'application/x-www-form-urlencoded',
      Origin: 'https://tvlistings.gracenote.com'
    }
  },

  url({ date }) {
    return 'https://tvlistings.gracenote.com/api/sslgrid'
  },

  body({ date, channel }) {
    const timestamp = dayjs(date).utc().format('YYYY-MM-DD')
    return `IsSSLinkNavigation=true&timespan=336&timestamp=${timestamp}&prgsvcid=${channel.lineupId}&headendId=${channel.headendId}&countryCode=${channel.countryCode}&postalCode=${channel.postalCode}&device=${channel.device}&userId=-&aid=cha&isOverride=true&languagecode=en`
  },

  parser({ content }) {
    const data = JSON.parse(content)
    let programs = []

    if (Array.isArray(data.gridPrograms)) {
      data.gridPrograms.forEach(p => {
        const start = dayjs(p.startTime).utc().toISOString()
        const stop = dayjs(p.endTime).utc().toISOString()
        const season = p.season ? `S${p.season}` : ''
        const episode = p.episode ? `E${p.episode}` : ''
        const episodeCode = season || episode ? `${season}${episode}` : null

        programs.push({
          title: p.title?.includes('Live') ? p.title : `Live: ${p.title}`,
          subtitle: p.episodeTitle || null,
          description: p.shortDesc || 'No description available',
          category: p.seriesGenres?.join(', ') || 'N/A',
          rating: p.rating || null,
          icon: p.thumbnail
            ? `https://zap2it.tmsimg.com/assets/${p.thumbnail}.jpg`
            : null,
          start,
          stop,
          episode: episodeCode
        })
      })
    }

    return programs
  },

  async channels() {
    const lineupId = '10001-directv'
    const headendId = '12345'
    const country = 'USA'
    const device = 'default'
    const postalCode = '10001'
    const time = dayjs().utc().format('YYYY-MM-DD')

    const url = `https://tvlistings.gracenote.com/api/grid?lineupId=${lineupId}&timespan=2&headendId=${headendId}&country=${country}&device=${device}&postalCode=${postalCode}&isOverride=true&time=${time}&pref=m%2Cp%2C16%2C256&userId=-&aid=cha&languagecode=en`

    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0',
          Accept: 'application/json'
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
