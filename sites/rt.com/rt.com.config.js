const dayjs = require('dayjs')

module.exports = {
  site: 'rt.com',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ date }) {
    return `https://www.rt.com/schedulejson/news/${date.format('DD-MM-YYYY')}`
  },
  parser: function ({ content }) {
    const programs = []

    const items = JSON.parse(content)
    items.forEach(item => {
      const start = dayjs.unix(item.time)
      const stop = start.add(30, 'm')
      programs.push({
        title: item.programTitle,
		    subtitle: item.telecastTitle,
        description: item.summary,
        start,
        stop
      })
    })

    return programs
  }
}
