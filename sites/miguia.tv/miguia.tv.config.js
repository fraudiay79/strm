const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'miguia.tv',
  days: 4,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel }) {
    return `https://api.miguia.tv/1/es/channel/${channel.site_id}.json`
  },
  parser: function ({ content }) {
    const programs = []

    const data = JSON.parse(content)
    data.data.forEach(item => {
        const start = dayjs.unix(item[9]).utc()
        const stop = dayjs.unix(item[10]).utc()
        const programData = {
            title: item[4],
	    subTitle: item[5],
            description: item[6],
	    image: item[8],
            start,
            stop
        }

        programs.push(programData)
    })

    return programs
},
  async channels() {
    const axios = require('axios')
    try {
      const response = await axios.get(`https://api.miguia.tv/1/es/channels.json`)
	  const data = response.data
      return data.data.channels.map(item => {
        return {
          lang: 'es',
          name: item[1],
          site_id: item[0]
        }
      })
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}
