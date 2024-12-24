const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc);
dayjs.extend(timezone);

module.exports = {
  site: 'a1.si',
  days: 7,
  timezone: 'Europe/Ljubljana',
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'Accept-Encoding': 'gzip, deflate, br, zstd'
    }
  },
  url({ date }) {
    return `https://spored.a1.si/api/epg/channels?startDate=${date.format('YYYY-MM-DD')}&endDate=${date.format('YYYY-MM-DD')}`
  },
  parser: function ({ content }) {
    const data = JSON.parse(content)
    const programs = data.flatMap(channel => 
      channel.schedules.flatMap(schedule => 
        schedule.programs.map(program => ({
          title: program.title,
          start: dayjs(`${schedule.schedule} ${program.startTime}`, 'YYYY-MM-DD HH:mm').toISOString(),
          stop: dayjs(`${schedule.schedule} ${program.startTime}`, 'YYYY-MM-DD HH:mm').add(60, 'minutes').toISOString(), // Assuming each program is 60 minutes
        }))
      )
    )

    return programs
  },
  async channels() {
    const response = await axios.get('https://spored.a1.si/api/epg/channels', {
      headers: this.request.headers,
      params: {
        startDate: dayjs().format('YYYY-MM-DD'),
        endDate: dayjs().format('YYYY-MM-DD')
      }
    })

    const data = response.data

    return data.map(channel => ({
      lang: 'sl',
      name: channel.name,
      site_id: channel.id
    }))
  }
}
