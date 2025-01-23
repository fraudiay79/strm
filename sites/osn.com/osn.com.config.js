const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

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
  async parser({ content, channel }) {
    const programs = []
    const items = JSON.parse(content) || []
    if (Array.isArray(items)) {
      for (const item of items) {
        const detail = await loadProgramDetails(item)
        const title = channel.lang === 'ar' ? item.Arab_Title : item.Title
        const start = dayjs.tz(item.StartDateTime, 'DD MMM YYYY, HH:mm', tz)
        const duration = parseInt(item.TotalDivWidth / 4.8)
        const stop = start.add(duration, 'm')
        programs.push({ 
		  title,
		  subtitle: parseSubtitle(detail),
		  description: parseDescription(detail),
          date: parseDate(item),
		  category: parseCategory(item),
		  icon: parseImage(item),
		  season: parseSeason(item),
          episode: parseEpisode(item),
		  start, 
		  stop 
		})
      }
    }

    return programs
  },
  async channels({ lang = 'ar' }) {
    const result = {}
    const axios = require('axios')
    for (const pkg of Object.values(packages)) {
      const channels = await axios
        .get(`https://www.osn.com/api/tvchannels.ashx?culture=en-US&packageId=${pkg}&country=${country}`)
        .then(response => response.data)
        .catch(console.error)

      if (Array.isArray(channels)) {
        for (const ch of channels) {
          if (result[ch.channelCode] === undefined) {
            result[ch.channelCode] = {
              lang,
              site_id: ch.channelCode,
              name: ch.channeltitle
            }
          }
        }
      }
    }

    return Object.values(result)
  }
}

async function loadProgramDetails(item) {
  if (!item.program_id) return {}
  const url = `https://www.osn.com/api/TVScheduleWebService.asmx/GetProgramDetails?prgmEPGUNIQID=${item.program_id}&countryCode=SA`
  const data = await axios
    .get(url, { headers })
    .then(r => r.data)
    .catch(console.log)

  return data || {}
}

function parseSubtitle(item) {
  if (channel.lang === 'ar' && !item.EpisodeAr || !item.EpisodeEn) {
    return null
  }
  return channel.lang === 'ar' ? item.EpisodeAr : item.EpisodeEn
}


function parseDescription(item) {
  if (channel.lang === 'ar' && !item.Arab_Synopsis || !item.Synopsis) {
    return null
  }
  return channel.lang === 'ar' ? item.Arab_Synopsis : item.Synopsis
}

function parseCategory(item) {
  if (channel.lang === 'ar' && !item.GenreArabicName || !item.GenreEnglishName) {
    return null
  }
  return channel.lang === 'ar' ? item.GenreArabicName : item.GenreEnglishName
}

function parseSeason(item) {
  return item.SeasonNo
}

function parseEpisode(item) {
  return item.EpisodeNo
}

function parseDate(item) {
  return item && item.Year ? item.Year.toString() : null
}

function parseImage(item) {
  return item.ProgramImage
}
