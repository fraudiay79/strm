const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const axios = require('axios')

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

    if (data.data && Array.isArray(data.data.schedule)) {
      data.data.schedule.forEach(program => {
        const start = parseTime(program.time, date)
        const stop = start.add(30, 'm')
        const programData = {
          title: program.title.trim(),
          start,
          stop
        };

        programs.push(programData);
      });
    } else {
      console.error('Error: data.data.schedule is not an array or is undefined')
    }

    return programs;
  },
  async channels() {
    try {
      const response = await axios.get('https://apigw.mytv.vn/api/v1/channel?cate_id=undefined&uuid=28aa97a6-019d-44c2-bd18-3a44304f9926')
      return response.data.data.map(item => {
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
  const [hours, minutes] = timeString.split(':').map(Number)
  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`

  const dateString = `${date.format('YYYY-MM-DD')} ${formattedTime}`

  return dayjs.tz(dateString, 'YYYY-MM-DD HH:mm:ss', 'Asia/Ho_Chi_Minh')
}
