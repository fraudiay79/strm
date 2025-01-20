const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const axios = require('axios')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'cyta.com.cy',
  days: 7,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url: function ({ date, channel }) {
    // Get the epoch timestamp
    const todayEpoch = date.startOf('day').utc().valueOf()
    // Get the epoch timestamp for the next day
    const nextDayEpoch = date.add(1, 'day').startOf('day').utc().valueOf()
    return `https://epg.cyta.com.cy/api/mediacatalog/fetchEpg?startTimeEpoch=${todayEpoch}&endTimeEpoch=${nextDayEpoch}&language=1&channelIds=${channel.site_id}`
  },
  parser: async function ({ content }) {
    const data = JSON.parse(content)
    const programs = []

    for (const channel of data.channelEpgs) {
      for (const epg of channel.epgPlayables) {
        const start = new Date(epg.startTime).toISOString()
        const stop = new Date(epg.endTime).toISOString()
        const details = await loadProgramDetails(epg)

        programs.push({
          title: epg.name,
          description: parseDescription(details),
          icon: parseImage(details),
          category: parseCategory(details),
          start,
          stop
        })
      }
    }

    return programs
  },
  async channels() {
    const data = await axios
      .get('https://epg.cyta.com.cy/api/mediacatalog/fetchChannels?language=1')
      .then(r => r.data)
      .catch(console.log)

    return data.channels.map(item => {
      return {
        lang: 'el',
        site_id: item.id,
        name: item.name
      }
    })
  }
}

function parseDescription(details) {
  return details ? details.playbillDetail.introduce : null
}

function parseImage(details) {
  return details ? details.playbillDetail.picture.icons : null
}

function parseCategory(details) {
  return details ? details.playbillDetail.genres.genreName : null
}

async function loadProgramDetails(epg) {
  const url = `https://epg.cyta.com.cy/api/mediacatalog/fetchEpgDetails?language=1&id=${epg.ID}`

  return axios
    .get(url)
    .then(r => r.data)
    .catch(console.error)
}
