const dayjs = require('dayjs')
const axios = require('axios')
const cheerio = require('cheerio')
const { DateTime } = require('luxon')

module.exports = {
  delay: 5000,
  site: 'tv.yandex.ru',
  days: 3,
  url: function ({ date, channel }) {
    const currDate = DateTime.now().toUTC().startOf('day')
    const day = date.diff(currDate, 'd')

    return `https://tv.yandex.ru/channel/${channel.site_id}?date=${date.format('YYYY-MM-DD')}`
  },
  parser: async function ({ content, date }) {
    const programs = []
    const items = parseItems(content)
    for (const item of items) {
      const prev = programs[programs.length - 1]
      const $item = cheerio.load(item)
      let start = parseStart($item, date)
      if (prev) {
        if (start < prev.start) {
          start = start.plus({ days: 1 })
          date = date.add(1, 'd')
        }
        prev.stop = start
      }
      const stop = start.plus({ hours: 1 })
      const details = await loadProgramDetails($item)
      programs.push({
        title: details.description,
        description: details.description,
        actors: details.actors,
        director: details.director,
        icon: details.icon,
        category: details.category,
        sub_title: details.sub_title,
        start: details.description,
        stop: details.description
      })
    }

    return programs
  },
  async channels() {
    const countries = {
      ba: { communityId: '12', languageId: '59', lang: 'bs' },
      me: { communityId: '5', languageId: '10001', lang: 'cnr' },
      rs: { communityId: '1', languageId: '404', lang: 'sr' },
      si: { communityId: '8', languageId: '386', lang: 'sl' }
    }
    const session = await loadSessionDetails()
    if (!session || !session.access_token) return null

    let channels = []
    for (let country in countries) {
      const config = countries[country]
      const lang = config.lang

      try {
        const data = await axios.get(
          `https://api-web.ug-be.cdn.united.cloud/v1/public/channels?channelType=TV&communityId=${config.communityId}&languageId=${config.languageId}&imageSize=L`,
          {
            headers: {
              Authorization: `Bearer ${session.access_token}`
            }
          }
        )

        const channelData = data.data.map(item => ({
          lang,
          site_id: item.id,
          name: item.name
        }))

        channels = [...channels, ...channelData]
      } catch (error) {
        console.error(`Error fetching channels for ${country}:`, error)
      }
    }

    return channels
  }
}

async function loadProgramDetails($item) {
  const programId = $item('a').attr('href')
  const data = await axios
    .get(`https://tv.yandex.ru/${programId}`)
    .then(r => r.data)
    .catch(console.error)
  if (!data) return Promise.resolve({})

  const $ = cheerio.load(data)

  // Extract the JSON data from window.__INITIAL_STATE__
  const scriptContent = $('script').filter((i, el) => $(el).html().includes('window.__INITIAL_STATE__ =')).html()
  if (!scriptContent) return Promise.resolve({})
  const jsonData = JSON.parse(scriptContent.split('window.__INITIAL_STATE__ =')[1].split(';')[0].trim())

  // Ensure jsonData contains the expected structure
  const title = jsonData.meta?.title : null
  const start = jsonData.program?.schedules[0]?.schedule?.Сегодня?.items[0]?.start : null 
  const stop = jsonData.program?.schedules[0]?.schedule?.Сегодня?.items[0]?.finish : null
  const imageUrl = jsonData.gallery?.[0]?.sizes?.['200']?.src ? `https:${jsonData.gallery[0].sizes['200'].src}` : null
  const actors = jsonData.personsMap?.actor ? jsonData.personsMap.actor.slice(0, 3) : null
  const director = jsonData.personsMap?.director : null
  const description = jsonData.meta?.description : null
  const category = jsonData.meta?.type?.name : null
  const subTitle = jsonData.program?.schedules[0]?.schedule?.Сегодня?.items[0]?.title : null

  return Promise.resolve({
    icon: imageUrl,
    actors: actors,
    director: director,
    description: description,
    category: category,
    sub_title: subTitle,
    start: start,
    stop: stop
  })
}

function parseStart($item, date) {
  const timeString = $item('.channel-schedule__time').text()
  const dateString = `${date.format('MM/DD/YYYY')} ${timeString}`

  return DateTime.fromFormat(dateString, 'MM/dd/yyyy HH:mm', { zone: 'Europe/Moscow' }).toUTC()
}

function parseTitle($item) {
  return $item('.channel-schedule__text').text().trim()
}

function parseItems(content) {
  const $ = cheerio.load(content)

  return $('#channelTV > section > div.emissions > ul > li').toArray()
}
