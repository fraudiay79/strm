const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'mytv.com.vn',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://apigw.mytv.vn/api/v1/channel/${channel.site_id}/schedule?date=${date.format('YYYY-MM-DD')}&uuid=0c00475c-d5ec-4166-bd56-24fdc053fa1a`
  },
  parser: function ({ content, date }) {
    const programs = []
    const data = JSON.parse(content)
    data.schedule.forEach(program => {
      const start = parseTime(program.time, date)
      const stop = start.add(30, 'm')
      const programData = {
        title: program.title.trim(),
        description: 'No description available',
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
      const response = await axios.get(`https://apigw.mytv.vn/api/v1/channel?cate_id=undefined&uuid=28aa97a6-019d-44c2-bd18-3a44304f9926`)
      return response.data.items.map(item => {
        return {
          lang: 'vi',
          name: item.channel_name,
          site_id: item.id
        }
      })
    } catch (error) {
      console.error('Error fetching channels:', error)
      return []
    }
  }
}

function parseTime(timeString, date) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`;

  const dateString = `${date.format('YYYY-MM-DD')} ${formattedTime}`;

  return dayjs.tz(dateString, 'YYYY-MM-DD HH:mm:ss', 'Asia/Ho_Chi_Minh');
}
