const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(timezone)

const packages = { 'OSNTV CONNECT': 3720, 'OSNTV PRIME': 3733, 'ALFA': 1281, 'OSN PINOY PLUS EXTRA': 3519 }
const country = 'SA'
const tz = 'Asia/Riyadh'

module.exports = {
  site: 'osn.com',
  days: 2,
  url({ channel, date }) {
    return `https://www.osn.com/api/TVScheduleWebService.asmx/time?dt=${
      encodeURIComponent(date.format('MM/DD/YYYY'))
    }&co=${country}&ch=${
      channel.site_id
    }&mo=false&hr=0`
  },
  request: {
    headers({ channel }) {
      return {
        Referer: `https://www.osn.com/${channel.lang}-${country.toLowerCase()}/watch/tv-schedule`
      }
    }
  },
  parser: async function ({ content, channel }) {
    const programs = []
    const items = JSON.parse(content) || []
    for (const item of items) {
      const title = channel.lang === 'ar' ? item.Arab_Title : item.Title
      const start = dayjs.tz(item.StartDateTime, 'DD MMM YYYY, HH:mm', tz)
      const duration = parseInt(item.TotalDivWidth / 4.8)
      const stop = start.add(duration, 'm')
      const details = await loadProgramDetails(item)
      programs.push({
        title,
        description: details.description,
        icon: details.icon,
        category: details.category,
        sub_title: details.sub_title,
        season: details.season,
        episode: details.episode,
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
          .get(`https://www.osn.com/api/TVScheduleWebService.asmx/chnl?pg=${page}&pk=${pkg}&gn=0&cu=en-US&bx=2&dt=${encodeURIComponent(date.format('MM/DD/YYYY'))}`)
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
  const url = `https://www.osn.com/api/TVScheduleWebService.asmx/GetProgramDetails?prgmEPGUNIQID=${item.EPGUNIQID}&countryCode=SA`
  const data = await axios
    .get(url)
    .then(r => r.data)
    .catch(console.log)

  if (!data || typeof data !== 'string') return {}

  let jsonData
  try {
    jsonData = JSON.parse(data)
  } catch (error) {
    console.error('Error parsing JSON:', error)
    return {}
  }
  
  const subTitle = item.lang === 'ar' ? jsonData.EpisodeAr : jsonData.EpisodeEn
  const description = item.lang === 'ar' ? jsonData.Arab_Synopsis : jsonData.Synopsis
  const category = item.lang === 'ar' ? jsonData.GenreArabicName : jsonData.GenreEnglishName
  const imageUrl = jsonData.ProgramImage
  const season = jsonData.SeasonNo
  const episode = jsonData.EpisodeNo
  
  return {
    icon: imageUrl,
    description: description,
    category: category,
    sub_title: subTitle,
    season: season,
    episode: episode
  }
}
