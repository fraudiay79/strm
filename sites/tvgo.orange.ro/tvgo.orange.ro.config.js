const dayjs = require('dayjs')
const axios = require('axios')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

const API_ENDPOINT = 'https://tvapi.solocoo.tv/v1'

let session

module.exports = {
  site: 'tvgo.orange.ro',
  days: 2,
  delay: 5000,
  url({ channel, date }) {
    return `${API_ENDPOINT}/schedule?channels=${
      channel.site_id
    }&from=${date.format('YYYY-MM-DDTHH:mm:ss.SSS')}Z&until=${date.add(1, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`
  },
  request: {
    async headers() {
      if (!session) {
        session = await loadSessionDetails()
        if (!session || !session.token) return null
      }

      return {
        Authorization: `Bearer ${session.token}`,
        Origin: 'https://tvgo.orange.ro',
        Referer: 'https://tvgo.orange.ro/'
      }
    }
  },
  parser: async function ({ content }) {
    let programs = []
    const items = parseItems(content)
    for (const item of items) {
      const detail = await loadProgramDetails(item)
      programs.push({
        title: item.title,
        description: detail.desc,
        categories: parseCategories(item),
        icon: parseImages(item),
        actors: parseRoles(detail, 'Actor'),
        directors: parseRoles(detail, 'Director'),
        season: item.params ? item.params.seriesSeason : null,
        episode: item.params ? item.params.seriesEpisode : null,
        start: item?.params?.start ? dayjs.utc(item.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]') : null,
        stop: item?.params?.end ? dayjs.utc(item.params.end, 'YYYY-MM-DDTHH:mm:ss[Z]') : null
      })
    }

    return programs
  },
  async channels() {
    const session = await loadSessionDetails()
    if (!session || !session.token) throw new Error('The session token is missing')

    const data = await axios
      .get(`${API_ENDPOINT}/bouquet`, {
        headers: {
          Authorization: `Bearer ${session.token}`
        }
      })
      .then(r => r.data)
      .catch(console.error)

    return data.channels.map(item => ({
      lang: 'ro',
      site_id: item.assetInfo.id,
      name: item.assetInfo.title
    }))
  }
}

async function loadProgramDetails(item) {
  if (!item.id) return {}
  const url = `${API_ENDPOINT}/assets/${item.id}`
  const data = await axios
    .get(url, { headers: {
            Authorization: `Bearer ${session.access_token}`,
            Origin: 'https://tvgo.orange.ro',
            Referer: 'https://tvgo.orange.ro/'
          } })
    .then(r => r.data)
    .catch(error => {
      console.log(error)
      return null
    })

  return data || {}
}

function parseCategories(item) {
  return Array.isArray(item?.params?.genres) ? item.params.genres.map(i => i.title) : []
}

function parseImages(item) {
  return Array.isArray(item?.images)
    ? item.images
        .filter(i => i.type === 'la')
        .map(i => `${i.url}&w=460&h=260`)
    : []
}

function parseRoles(detail, role_name) {
  if (!detail.params || !detail.params.credits) return null
  return detail.params.credits.filter(role => role.role === role_name).map(role => role.person)
}

function parseItems(content) {
  try {
    if (!content || !content.epg) return []

    const items = []
    Object.keys(content.epg).forEach(channelId => {
      content.epg[channelId].forEach(program => {
        if (program?.params?.start && date.isSame(dayjs.utc(program.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]'), 'd')) {
          items.push(program)
        }
      })
    })

    return items
  } catch (err) {
    console.log(err)
    return []
  }
}

function loadSessionDetails() {
  return axios
    .post(`${API_ENDPOINT}/session`, {
      sapiToken: 'sol:2:TfBJ4XZ0-3a5uhbDUlr8MZyEIcvR34GuXevPAhTWsRk:e3RzOjE3Mzc3NDQ4MjU1OTAsdToiMGViM2Y1MjAtN2Q2YS1lYTVhLTI1MDUtYzMwNWE1MzAxNjJhIn0',
	  osVersion: 'Windows 10',
      deviceModel: 'Chrome',
      deviceType: 'PC',
      deviceSerial: 'wa042f170-c19e-11ef-85bd-4bb8a519e081',
      deviceOem: 'Chrome',
      devicePrettyName: 'Chrome 131.0.0.0',
      appVersion: '12.0',
      language: 'en_US',
      brand: 'oro',
      memberId: '0',
      featureLevel: 6,
      provisionData: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJiciI6Im9ybyIsImlhdCI6MTczNzc0NDgyMywiZHMiOiJ3YTA0MmYxNzAtYzE5ZS0xMWVmLTg1YmQtNGJiOGE1MTllMDgxIiwidXAiOiJzb2wiLCJpYyI6dHJ1ZSwiZGUiOiJicmFuZE1hcHBpbmcifQ.cULbH2hy1SGC8U8Z51U30PeCM8nJS8fX8DhZvr6D3Gc'
	})
    .then(r => r.data)
    .catch(console.log)
}
