const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const axios = require('axios')
const cheerio = require('cheerio')

const API_ENDPOINT = 'https://www.foxtel.com.au/webepg/ws/foxtel'

dayjs.extend(utc)
dayjs.extend(timezone)

const tz = 'Australia/Sydney'

module.exports = {
  site: 'foxtel.com.test',
  days: 2,
  url: function ({ date, channel }) {
    const todayEpoch = date.startOf('day').utc().valueOf()
    const nextDayEpoch = date.add(1, 'day').startOf('day').utc().valueOf()
    return `${API_ENDPOINT}/channel/${channel.site_id}/events?movieHeight=110&tvShowHeight=90&startDate=${todayEpoch}&endDate=${nextDayEpoch}&regionId=8336`
  },
  request: {
    headers: {
      'Accept-Language': 'en-US,en;',
      Cookie: 'AAMC_foxtel_0=REGION|6'
    }
  },
  parser: async function ({ content, date }) {
  const programs = []
  const items = JSON.parse(content)

  for (const item of items) {
    if (!item.details) continue
    const start = dayjs(item.scheduledDate)
    const stop = start.add(item.duration, 'm')
    const detail = await loadProgramDetails(item) // corrected
    programs.push({
      title: item.programTitle,
      subtitle: item.episodeTitle,
      category: detail.genre,
      description: detail.shortSynopsis || detail.extendedSynopsis,
      icon: item.imageUrl,
      season: item.seriesNumber,
      episode: item.episodeNumber,
      start,
      stop
    })
  }

  return programs
},
  async channels() {
    const data = await axios
      .get('https://www.foxtel.com.au/webepg/ws/foxtel/channels?regionId=8336', {
        headers: {
          'User-Agent': 'insomnia/2022.7.5'
        }
      })
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      const slug = item.name
        .replace(/\+/g, '-')
        .replace(/&/g, '')
        .replace(/[^a-z0-9\s]/gi, '')
        .replace(/\s/g, '-')

      return {
        lang: 'en',
        name: item.name,
        site_id: `${slug}/${item.channelTag}`
      }
    })
  }
}
  
async function loadProgramDetails(item) {
  if (!item.eventId) return {}
  const url = `${API_ENDPOINT}/event/${item.eventId}?movieHeight=213&tvShowHeight=213&regionId=8336`
  const data = await axios
    .get(url, { headers: {
	'X-Requested-With': 'XMLHttpRequest',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      } })
    .then(r => r.data)
    .catch(console.log)

  return data || {}
}
