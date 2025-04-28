const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'epgmaster.np',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://epgmaster.com/api/channels/${channel.site_id}/epgs?token=1610283054&date=${date.format('YYYY-MM-DD')}`
  },
  parser({ content }) {
    const programs = []
    const data = JSON.parse(content)

    data.forEach(entry => {
      entry.epgTokenList.forEach(program => {
        const start = dayjs.tz(`${program.startDate} ${program.startTime}`, 'Asia/Kathmandu')
        const stop = dayjs.tz(`${program.startDate} ${program.endTime}`, 'Asia/Kathmandu')
        const icon = program.logo || null

        const programData = {
          title: program.programName,
          icon,
          start,
          stop
        }

        programs.push(programData)
      })
    })

    return programs
  },
  async channels() {
    const axios = require('axios')
    try {
      const response = await axios.get(`https://epgmaster.com/api/channels?token=1610283054`)

      return response.data.map(item => {
        return {
          lang: 'np',
          name: item.channel_name,
          site_id: item.channel_code
        }
      })
    } catch (error) {
      console.error('Error fetching channels:', error.message || error)
      return []
    }
  }
}
