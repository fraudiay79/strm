const axios = require('axios')
const cheerio = require('cheerio')
const { DateTime } = require('luxon')

module.exports = {
  delay: 5000,
  site: 'programtv.onet.pl',
  days: 2,
  url: function ({ date, channel }) {
    const currDate = DateTime.now().toUTC().startOf('day')
    const day = date.diff(currDate, 'd')

    return `https://programtv.onet.pl/program-tv/${channel.site_id}?dzien=${day}`
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
        title: parseTitle($item),
        description: details.description,
        actors: details.actors,
        director: details.director,
        icon: details.icon,
        category: details.category,
        sub_title: details.sub_title,
        season: details.season,
        episode: details.episode,
        start,
        stop
      })
    }

    return programs
  },
  async channels() {
    const data = await axios
      .get('https://programtv.onet.pl/stacje')
      .then(r => r.data)
      .catch(console.log)

    let channels = []

    const $ = cheerio.load(data)
    $('ul.channelList a').each((i, el) => {
      const name = $(el).text()
      const url = $(el).attr('href')
      const [, site_id] = url.match(/^\/program-tv\/(.*)$/i)

      channels.push({
        lang: 'pl',
        site_id,
        name
      })
    })

    return channels
  }
}

async function loadProgramDetails($item) {
  const programId = $item('a').attr('href')
  const data = await axios
    .get(`https://programtv.onet.pl${programId}`)
    .then(r => r.data)
    .catch(console.error)
  if (!data) return Promise.resolve({})
  
  const $ = cheerio.load(data)

  // Find the JSON-LD script containing the data
  const script = $('script[type="application/ld+json"]').html()
  if (!script) return Promise.resolve({})
  const jsonData = JSON.parse(script)

  // Ensure jsonData contains the expected structure
  const imageUrl = jsonData.image ? jsonData.image.url : null;
  const actors = jsonData.workPerformed && jsonData.workPerformed.director
    ? jsonData.workPerformed.director.map(director => director.name)
    : []
  const description = jsonData.description || null
  const category = jsonData.workPerformed ? jsonData.workPerformed.genre : null
  const subTitle = jsonData.name || null
  const season = jsonData.workPerformed && jsonData.workPerformed.partOfSeason
    ? jsonData.workPerformed.partOfSeason.seasonNumber
    : null
  const episode = jsonData.workPerformed ? jsonData.workPerformed.episodeNumber : null

  return Promise.resolve({
    icon: $('img').attr('src'),
    actors: $('ul.cast li.header:contains("Obsada:")').nextAll().slice(0, 3).map((i, el) => $(el).text().trim()).get(),
    director: $('ul.cast li.header:contains("Reżyseria:")').next().text().trim(),
    description: description,
    category: category,
    sub_title: subTitle,
    season: season,
    episode: episode
  })
}

function parseStart($item, date) {
  const timeString = $item('.hours > .hour').text()
  const dateString = `${date.format('MM/DD/YYYY')} ${timeString}`

  return DateTime.fromFormat(dateString, 'MM/dd/yyyy HH:mm', { zone: 'Europe/Warsaw' }).toUTC()
}

function parseTitle($item) {
  return $item('.titles > a').text().trim()
}

function parseItems(content) {
  const $ = cheerio.load(content)

  return $('#channelTV > section > div.emissions > ul > li').toArray()
}
