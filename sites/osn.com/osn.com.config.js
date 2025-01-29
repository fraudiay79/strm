const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const axios = require('axios')

const API_ENDPOINT = 'https://www.osn.com/api/TVScheduleWebService.asmx'

dayjs.extend(utc)
dayjs.extend(timezone)

const packages = { 'OSNTV CONNECT': 3720, 'OSNTV PRIME': 3733, 'ALFA': 1281, 'OSN PINOY PLUS EXTRA': 3519 }
const country = 'SA'
const tz = 'Asia/Riyadh'

module.exports = {
  site: 'osn.com',
  days: 2,
  url({ channel, date }) {
    return `${API_ENDPOINT}/time?dt=${encodeURIComponent(date.format('MM/DD/YYYY'))}&co=${country}&ch=${channel.site_id}&mo=false&hr=0`
  },
  request: {
    headers({ channel }) {
      return {
        Referer: `https://www.osn.com/${channel.lang}-${country.toLowerCase()}/watch/tv-schedule`
      }
    }
  },
  async parser({ content, channel, date }) {
    let programs = []
    if (!content) return programs

    let items = JSON.parse(content)
    if (!items.length) return programs
	
    for (let item of items) {
      const title = channel.lang === 'ar' ? item.Arab_Title : item.Title
      const start = dayjs.tz(item.StartDateTime, 'DD MMM YYYY, HH:mm', tz)
      const duration = parseInt(item.TotalDivWidth / 4.8)
      const stop = start.add(duration, 'm')
      const detail = await loadProgramDetails(item)
      programs.push({
        title,
        description: channel.lang === 'ar' ? detail.Arab_Synopsis : detail.Synopsis,
        icon: detail.ProgramImage,
        category: channel.lang === 'ar' ? detail.GenreArabicName : detail.GenreEnglishName,
        subtitle: channel.lang === 'ar' ? detail.EpisodeAr : detail.EpisodeEn,
        season: detail.SeasonNo,
        episode: detail.EpisodeNo,
        start,
        stop
      })
    }

    return programs
  },
  async channels({ lang = 'ar' }) {
    const result = {}
    for (const pkg of Object.values(packages)) {
      let page = 1
      let hasMorePages = true

      while (hasMorePages) {
        const channels = await axios
          .get(`${API_ENDPOINT}/chnl?pg=${page}&pk=${pkg}&gn=0&cu=en-US&bx=2&dt=${encodeURIComponent(date.format('MM/DD/YYYY'))}`)
          .then(response => response.data)
          .catch(console.error)

      if (Array.isArray(channels) && channels.length > 0) {
        for (const ch of channels) {
          if (result[ch.channelCode] === undefined) {
            result[ch.channelCode] = {
              lang,
              site_id: ch.channelCode,
              name: ch.channeltitle
            }
          }
        }
        page++
      } else {
        hasMorePages = false
      }
    }
    }

    return Object.values(result)
  }
}

async function loadProgramDetails(item) {
  if (!item.EPGUNIQID) return {}
  const url = `${API_ENDPOINT}/GetProgramDetails?prgmEPGUNIQID=${item.EPGUNIQID}&countryCode=SA`
  const data = await axios
    .get(url, { headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
      } })
    .then(r => r.data)
    .catch(console.log)

  return data || {}
}
