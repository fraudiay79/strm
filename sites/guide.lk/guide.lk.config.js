const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  sites: [
    {
      site: 'derana.lk',
      channels: 'guide.lk.channels.xml',
      days: 2,
      request: {
        cache: {
          ttl: 60 * 60 * 1000 // 1 hour
        }
      },
      url({ date }) {
        return `https://derana.lk/api/schedules/${date.format('DD-MM-YYYY')}`
      },
      parser: function ({ content }) {
        const programs = []

        let data
        try {
          data = JSON.parse(content)
        } catch (e) {
          console.error("Invalid JSON content", e)
          return []
        }

        data.today_schedule.forEach(schedule => {
          const startTime = dayjs.tz(`${schedule.date}T${schedule.time}`, 'Asia/Colombo')
          const durationParts = schedule.duration.split(' ')
          const durationInMinutes = parseInt(durationParts[0]) || 0
          const endTime = startTime.add(durationInMinutes, 'minute')

          programs.push({
            title: schedule.dramaName,
            icon: schedule.imageUrl || null,
            start: startTime,
            stop: endTime
          })
        })

        return programs
      }
    },
    {
      site: 'sirasatv.lk',
      channels: 'guide.lk.channels.xml',
      days: 2,
      request: {
        cache: {
          ttl: 60 * 60 * 1000 // 1 hour
        }
      },
      url({ date }) {
        return `https://sirasatv.lk/getProgramsByDate?date=${date.format('YYYY-MM-DD')}`
      },
      parser: function ({ content }) {
        const programs = []

        let data
        try {
          data = JSON.parse(content)
        } catch (e) {
          console.error("Invalid JSON content", e)
          return []
        }

        data.forEach(program => {
          const startTime = dayjs.tz(`${program.startTime}`, 'Asia/Colombo')
          const endTime = dayjs.tz(`${program.endTime}`, 'Asia/Colombo')

          programs.push({
            title: program.programName,
            genre: program.genre || null,
            icon: program.thumbnail !== "default.png" ? program.thumbnail : null,
            start: startTime,
            stop: endTime
          })
        })

        return programs
      }
    }
  ]
}
