const axios = require('axios')
const dayjs = require('dayjs')

const API_ENDPOINT = 'https://czgo.magio.tv/v2/television'

const headers = {
  Referer: 'https://tvgo.t-mobile.cz/',
  Origin: 'https://tvgo.t-mobile.cz',
  Authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJBUFBfTUNPUkUiLCJpYXQiOjE3Mzc2NDMxNzYsImV4cCI6MTczNzY1Mzk3NiwiZGV2aWNlSWQiOjI5MDU1NjYwLCJkZXZpY2VUeXBlIjoiT1RUX1dJTiIsImRldmljZVBsYXRmb3JtIjoiR08iLCJwbGF0Zm9ybSI6IkdPIiwibGFuZyI6IkNaIiwiZGF2Ijp0cnVlLCJraWQiOjE4NTEzNn0.nCPsbHKHHj3CPyuJwL1ltMrxKhqxbbM6BRJbjp1qpPj6PbW4HHxmW5drhei6HCyVkgBR3zn-s3Qc8IENeSQfKP9zF9hHbnvSvoN7jJMlApCwYIHDyirz1V_0lanS-iF0jAeH86d9qXWGPlXz-b_8QJYCUTM79UHkJKVgK13tYlFJlNfmpXxSYNRPyq5MVgA1nkxn7T7d7vGtqcuuKq-V6EI-n7uujqLlyTORKj2VH_DEu20hG978bbWDUQ9ujjwW5ogBY1zkSs_-GRK0OnG_CqgUYNfjFqEtyVO48PUEwu5M9BtQAA2njIc7WKVzspFpkY73SXUACcXebX3nhXxL5A'
}

module.exports = {
  site: 'magentatv.cz',
  days: 2,
  request: {
    headers,
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  url({ channel, date }) {
    return `${API_ENDPOINT}/epg?filter=channel.id=in=(${channel.site_id});startTime=ge=${date.format('YYYY-MM-DDTHH:mm:ss.000')};startTime=le=${date.add(1, 'days').subtract(1, 's').format('YYYY-MM-DDTHH:mm:ss.000')}&lang=CZ`
  },
  parser({ content }) {
    try {
      const programs = []
      const data = JSON.parse(content)
      for (const channelItem of data.items) {
        const channelId = channelItem.channel.channelId
        if (Array.isArray(channelItem.programs)) {
          channelItem.programs.forEach(item => {
            programs.push({
              title: item.program.title,
              subtitle: item.program.episodeTitle,
              description: item.program.description,
              icon: item.program.images[0],
              season: item.program.programValue.seasonNumber,
              episode: item.program.programValue.episodeId,
              actors: item.program.programRole.actors.map(actor => actor.fullName).join(', '),
              directors: item.program.programRole.directors.map(director => director.fullName).join(', '),
              start: dayjs(item.startTime),
              stop: dayjs(item.endTime)
            })
          })
        }
      }

      return programs
    } catch (error) {
      console.error('Error parsing content:', error)
      return []
    }
  },
  async channels() {
    const data = await axios
      .get(`${API_ENDPOINT}/channels?list=LIVE&queryScope=LIVE`, { headers })
      .then(r => r.data)
      .catch(console.log)

    return data.items.map(item => {
      return {
        lang: 'cz',
        site_id: item.channel.channelId,
        name: item.channel.name
      }
    })
  }
}
