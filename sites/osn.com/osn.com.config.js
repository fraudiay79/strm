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
  async parser({ content, channel }) {
    const programs = []
    const items = JSON.parse(content) || []
    if (Array.isArray(items)) {
      for (const item of items) {
        const detail = await loadProgramDetails(item)
        //const title = channel.lang === 'ar' ? item.Arab_Title : item.Title
        const start = dayjs.tz(item.StartDateTime, 'DD MMM YYYY, HH:mm', tz)
        const duration = parseInt(item.TotalDivWidth / 4.8)
        const stop = start.add(duration, 'm')
        programs.push({ 
          title: parseTitle(detail, channel),
          subtitle: parseSubtitle(detail, channel),
          description: parseDescription(detail, channel),
          date: parseDate(detail),
          category: parseCategory(detail, channel),
          icon: parseImage(detail),
          season: parseSeason(detail),
          episode: parseEpisode(detail),
          start, 
          stop 
        })
      }
    }

    return programs
  },
  async channels({ lang = 'ar' }) {
    const result = {}
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

function parseTitle(detail, channel) {
  return channel.lang === 'ar' ? detail.Arab_Title : detail.Title
}

function parseSubtitle(detail, channel) {
  return channel.lang === 'ar' ? detail.EpisodeAr : detail.EpisodeEn
}

function parseDescription(detail, channel) {
  return channel.lang === 'ar' ? detail.Arab_Synopsis : detail.Synopsis
}

function parseCategory(detail, channel) {
  return channel.lang === 'ar' ? detail.GenreArabicName : detail.GenreEnglishName
}

function parseSeason(detail) {
  return detail.SeasonNo
}

function parseEpisode(detail) {
  return detail.EpisodeNo
}

function parseDate(detail) {
  return detail && detail.Year ? detail.Year.toString() : null
}

function parseImage(detail) {
  return detail.ProgramImage
}
