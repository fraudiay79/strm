const axios = require('axios')
const dayjs = require('dayjs')
const cheerio = require('cheerio')
const utc = require('dayjs/plugin/utc')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(customParseFormat)

const API_ENDPOINT = 'https://www.sat.tv/wp-admin/admin-ajax.php'
const API_ENDPOINT_2 = 'https://www.sat.tv/wp-content/themes/twentytwenty-child/ajax_chaines.php'

module.exports = {
  site: 'sat.tv',
  days: 2,
  url: API_ENDPOINT,
  request: {
    method: 'POST',
    maxContentLength: 100 * 1024 * 1024, // 100Mb
    headers({ channel }) {
      return {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Cookie: `pll_language=${channel.lang}`
      };
    },
    data({ channel, date }) {
      const [satSatellite, satLineup] = channel.site_id.split('#')
      const params = new URLSearchParams()
      params.append('dateFiltre', '0')
      params.append('hoursFiltre', '0')
      params.append('action', 'block_tv_program')
      params.append('ajax', 'true')
      params.append('postId', '2162')
      params.append('lineupId', satLineup)
      params.append('sateliteId', satSatellite)
      params.append('userDateTime', date.valueOf())
      params.append('userTimezone', 'Europe/London')

      return params;
    },
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    },
    axiosConfig: {
      maxContentLength: 10 * 1024 * 1024 // Increase the limit to 10 MB
    }
  },
  parser: function ({ content, date, channel }) {
    let programs = [];
    const items = parseItems(content, channel);
    items.forEach(item => {
      let $item = cheerio.load(item);
      let start = parseStart($item, date);
      let duration = parseDuration($item);
      let stop = start.add(duration, 'm');

      programs.push({
        title: parseTitle($item),
        description: parseDescription($item),
        icon: parseImage($item),
        start,
        stop
      });
    });

    return programs;
  },
  async channels({ lang }) {
    const satellites = [
      { satellite: 2, lineup: 55, name: "13°E. Arabesque" },
      { satellite: 2, lineup: 58, name: "13°E. Farsi" },
      { satellite: 2, lineup: 53, name: "13°E. International" },
      { satellite: 2, lineup: 57, name: "13°E. Italia" },
      { satellite: 2, lineup: 54, name: "13°E. Maroc" },
      { satellite: 2, lineup: 56, name: "13°E. Slav" },
      { satellite: 1, lineup: 1, name: "8°W. Ethiopia" },
      { satellite: 1, lineup: 48, name: "7°W. Algérie" },
      { satellite: 1, lineup: 44, name: "7°W. Bahrain" },
      { satellite: 1, lineup: 42, name: "7°W. Egypt" },
      { satellite: 1, lineup: 39, name: "7°W. Iraq" },
      { satellite: 1, lineup: 37, name: "7°W. Jordan" },
      { satellite: 1, lineup: 38, name: "7°W. KSA" },
      { satellite: 1, lineup: 68, name: "7°W. Kurdish" },
      { satellite: 1, lineup: 47, name: "7°W. Kuwait" },
      { satellite: 1, lineup: 41, name: "7°W. Libya" },
      { satellite: 1, lineup: 49, name: "7°W. Maroc" },
      { satellite: 1, lineup: 46, name: "7°W. Oman" },
      { satellite: 1, lineup: 35, name: "7°W. Palestine" },
      { satellite: 1, lineup: 43, name: "7°W. Qatar" },
      { satellite: 1, lineup: 45, name: "7°W. Sudan" },
      { satellite: 1, lineup: 50, name: "7°W. Tunisie" },
      { satellite: 1, lineup: 71, name: "7°W. UAE" },
      { satellite: 1, lineup: 40, name: "7°W. Yemen" },
      { satellite: 1, lineup: 74, name: "7°W- Ramadan" },
      { satellite: 1, lineup: 72, name: "Best-Of Maghreb" },
      { satellite: 1, lineup: 33, name: "Best-Of Mashreq" },
      { satellite: 8, lineup: 70, name: "Channel Sat 16°E" },
      { satellite: 8, lineup: 62, name: "Benin First" },
      { satellite: 8, lineup: 63, name: "Cameroon First" },
      { satellite: 8, lineup: 64, name: "Côte d'Ivoire First" },
      { satellite: 8, lineup: 65, name: "Nigeria First" },
      { satellite: 8, lineup: 66, name: "Sénégal First" },
      { satellite: 8, lineup: 67, name: "Togo First" }
    ]

    let channels = []
    for (let sat of satellites) {
      const params = new URLSearchParams()
      params.append('dateFiltre', dayjs().format('YYYY-MM-DD'))
      params.append('hoursFiltre', '0')
      params.append('satLineup', sat.lineup)
      params.append('satSatellite', sat.satellite)
      params.append('userDateTime', dayjs().valueOf())
      params.append('userTimezone', 'Europe/London')
      const data = await axios
        .post(API_ENDPOINT_2, params, {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Cookie: `pll_language=${lang}`
          }
        })
        .then(r => r.data)
        .catch(console.log)

      const $ = cheerio.load(data)
      $('.main-container-channels-events > .container-channel-events').each((i, el) => {
        const name = $(el).find('.channel-title').text().trim()
        const channelId = name.replace(/\s&\s/gi, ' &amp; ')

        if (!name) return

        channels.push({
          lang,
          site_id: `${sat.satellite}#${sat.lineup}#${channelId}`,
          name
        })
      })
    }

    return channels
  }
}

function parseImage($item) {
  const src = $item('.event-logo img').attr('src')

  return src ? `https://sat.tv${src}` : null
}

function parseTitle($item) {
  return $item('.event-data-title').text()
}

function parseDescription($item) {
  return $item('.event-data-desc').text()
}

function parseStart($item, date) {
  let eventDataDate = $item('.event-data-date').text().trim()
  let [, time] = eventDataDate.match(/(\d{2}:\d{2})/) || [null, null]
  if (!time) return null

  return dayjs.utc(`${date.format('YYYY-MM-DD')} ${time}`, 'YYYY-MM-DD HH:mm')
}

function parseDuration($item) {
  let eventDataInfo = $item('.event-data-info').text().trim()
  let [, h, m] = eventDataInfo.match(/(\d{2})h(\d{2})/) || [null, 0, 0]

  return parseInt(h) * 60 + parseInt(m)
}

function parseItems(content, channel) {
  const [, , site_id] = channel.site_id.split('#')
  const $ = cheerio.load(content)
  const channelData = $('.main-container-channels-events > .container-channel-events')
    .filter((index, el) => {
      return $(el).find('.channel-title').text().trim() === site_id
    })
    .first()
  if (!channelData) return []

  return $(channelData).find('.container-event').toArray()
}
