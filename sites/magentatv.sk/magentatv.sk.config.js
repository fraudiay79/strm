const axios = require('axios')
const dayjs = require('dayjs')

const API_ENDPOINT = 'https://skgo.magio.tv/v2/television'

const headers = {
  Referer: 'https://magiogo.sk/',
  Origin: 'https://magiogo.sk',
  Authorization: 'Bearer eyJhbGciOiJSUzI1NiJ9.eyJhdWQiOiJBUFBfTUNPUkUiLCJpYXQiOjE3Mzc2NDk3NTYsImV4cCI6MTczNzY2MDU1NiwiZGV2aWNlSWQiOjc5Njg4Mjc3LCJkZXZpY2VUeXBlIjoiT1RUX1dJTiIsImRldmljZVBsYXRmb3JtIjoiR08iLCJwbGF0Zm9ybSI6IkdPIiwibGFuZyI6IlNLIiwiZGF2Ijp0cnVlLCJraWQiOjE5MDEzMn0.bJjOx2ea7ptQvgv31X6Zp4M2N32j-kQHZjUYXtAY9MVyIm_7cBJ9SjY7UeSTmQKzrEgUVWuq5uMiT4LQDavkotWz4MJY_cmB1zVPGlfNPkEUI2U0p-fE6QzU8fUtjEihUtIrel6NH7xSeDmvwsoq-FdOy67HALmllCvhrtMphSz6DYPHT7nRJLV6Gi3LhdSZmmEdLgj4D4_1uwsra0_bBJzwNrD-AJZAb4kTq28NuVKzHSiT90b2ZdJTyO28xK77A8xJzZr0OsTzxl29uAI7ftpFko9q3H-v3AWLLfFSnKv5NChpfSyYfO3I0cMSIRB8SFEBoBYXJuTUJe5BGKho2A'
}

module.exports = {
  site: 'magentatv.sk',
  days: 2,
  request: {
    headers,
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    }
  },
  url({ channel, date }) {
    return `${API_ENDPOINT}/epg?filter=channel.id=in=(${channel.site_id});startTime=ge=${date.format('YYYY-MM-DDTHH:mm:ss.000')};startTime=le=${date.add(1, 'days').subtract(1, 's').format('YYYY-MM-DDTHH:mm:ss.000')}&lang=SK`
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
        lang: 'sk',
        site_id: item.channel.channelId,
        name: item.channel.name
      }
    })
  }
}
