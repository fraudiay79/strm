const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const fs = require('fs')
const xml2js = require('xml2js') // For parsing XML

// Extend Day.js plugins
dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

// Set default timezone for consistency
dayjs.tz.setDefault('Asia/Colombo')

const cacheConfig = { ttl: 60 * 60 * 1000 } // 1 hour cache configuration

// Function to get site_id from XML file
const getSiteId = () => {
  const xmlFile = 'guide.lk.channels.xml' // Path to the XML file
  let siteId = null

  try {
    const xmlContent = fs.readFileSync(xmlFile, 'utf-8')
    xml2js.parseString(xmlContent, (err, result) => {
      if (err) {
        console.error("Error parsing XML file: ", err)
        return
      }
      siteId = result?.channels?.site_id?.[0] || null
    })
  } catch (err) {
    console.error("Error reading XML file: ", err)
  }

  return siteId
}

const siteId = getSiteId() // Retrieve the site_id dynamically

module.exports = {
  sites: [
    {
      site: 'guide.lk',
      channels: 'guide.lk.channels.xml',
      days: 2,
      request: {
        cache: cacheConfig
      },
      url({ date }) {
        return `https://derana.lk/api/schedules/${date.format('DD-MM-YYYY')}`
      },
      parser: function ({ content }) {
        if (siteId !== "1") return [] // Skip this configuration if site_id is not "1"

        const programs = []

        let data
        try {
          data = JSON.parse(content)
        } catch (e) {
          console.error("Invalid JSON content: ", content, e)
          return []
        }

        // Validate data structure
        if (!Array.isArray(data?.today_schedule)) {
          console.error("Unexpected format in API response")
          return []
        }

        data.today_schedule.forEach((schedule) => {
          const startTime = dayjs.tz(`${schedule.date}T${schedule.time}`, 'Asia/Colombo')
          const durationParts = schedule.duration?.split(' ') || []
          const durationInMinutes = parseInt(durationParts[0], 10) || 0
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
      site: 'guide.lk',
      channels: 'guide.lk.channels.xml',
      days: 2,
      request: {
        cache: cacheConfig
      },
      url({ date }) {
        return `https://sirasatv.lk/getProgramsByDate?date=${date.format('YYYY-MM-DD')}`
      },
      parser: function ({ content }) {
        if (siteId !== "2") return [] // Skip this configuration if site_id is not "2"

        const programs = []

        let data
        try {
          data = JSON.parse(content)
        } catch (e) {
          console.error("Invalid JSON content: ", content, e)
          return []
        }

        // Validate data structure
        if (!Array.isArray(data)) {
          console.error("Unexpected format in API response")
          return []
        }

        data.forEach((program) => {
          const startTime = dayjs.tz(`${program.startTime}`, 'Asia/Colombo')
          const endTime = dayjs.tz(`${program.endTime}`, 'Asia/Colombo')
          const thumbnail = program.thumbnail?.toLowerCase() !== "default.png" ? program.thumbnail : null

          programs.push({
            title: program.programName,
            genre: program.genre || null,
            icon: thumbnail,
            start: startTime,
            stop: endTime
          })
        })

        return programs
      }
    }
  ]
}
