const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
  site: 'edem.tv',
  channels: 'edem.tv.channels.xml',
  days: 1,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    headers: {
      'cookie': 'cf_clearance=5kbZVJTTEx3XXnqHPSCDmfx.OYsDmwrz._plf8m0Gu0-1733763951-1.2.1.1-c3ruiaHnuLbnb8Mm2C7zhzi0sXtHpQgXRYzAncvSkKrVhH_V8rfyiplBWd7ehmyMLeDjc7as3eqaza1dC2XeODdmIf1CmXPOrlzY6AqF0B75HAHNFq1h0GI2GmlFvOrTd1z9kwYvD.v7TwruiAUfJqiwMPV8eRO7sE10kzMEIXV0bBRQRRjbMM39o1tRqFbUu.QMWZfMQ.NyjXMsQvQ61c6bxT5J2z5voqurCDX_4QXEMUBg.TjdH2Xh1VFz4WkOimJQJDhXCiyl.E2pETUGpyZouPtwX8CBt_dzD7nUBd02pmTF7P_nqYrO0rr4uun9lpP_rF9um18Jseii3sDkCbD.rS.yS1vzc_Uk9AJrUOH.UlX0TWqhQh6J4GOvLwm56CWKTeEfcJeDIYrH7xoXk4UgQdUlB30nZwGULDdqaXipr.HyYXG6Rfks4g_x4CHM',
      'accept-encoding': 'gzip, deflate, br, zstd',
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    }
  },
  url({ channel, date }) {
    return `http://epg.drm-play.com/cbilling%2Fepg%2F${channel.site_id}.json`
  },
  parser: function ({ content }) {
    const data = JSON.parse(content)
    const programs = []

  data.forEach(item => {
    programs.push({
      name: item.epg_data.name,
      description: item.epg_data.descr || 'No description available',
      start: dayjs.unix(item.epg_data.time),
      stop: dayjs.unix(item.epg_data.time_to)
    })
  })

  return programs
  }
}
