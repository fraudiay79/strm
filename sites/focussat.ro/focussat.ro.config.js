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
  site: 'focussat.ro',
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
        Origin: 'https://livetv.focussat.ro',
        Referer: 'https://livetv.focussat.ro/'
      }
    }
  },
  parser: async function ({ content, date }) {
    let programs = []
    const items = parseItems(content, date)
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
            Authorization: `Bearer ${session.token}`,
            Origin: 'https://livetv.focussat.ro',
            Referer: 'https://livetv.focussat.ro/'
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

function parseItems(content, date) {
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
      ssoToken: 'eyJrZXkiOiJtNyIsImFsZyI6ImRpciIsImVuYyI6IkExMjhDQkMtSFMyNTYifQ..711C_BSuYBi2EvgnQQoP4A.5D59RTyNQlK-I1Ucen0R4F1KCvRE8TgtxnFuasfrEdlXaLbibOmBDpk1B2wbRpm8ta36ARsB5bzCTOKAlJygMMJupnMPg1oJ-ff3bPOVXHuZXeAfNpgriHNT9ScQQZhFCBy9bZtHA49CPWy-_rE28Q3_HHCcLM9rzy5McLrsPbikI7JiPw5hB-eyQeN8X2OXl-f9vY5B2ltSTLTc2rJO32LMUaQ9aK1JXSnh2M5xN-mh0bcekNhIsy5_DtmGI7uPVa_dRKYO2KeklW4UwBe5R3idNvXoSb2NRifAW1E8y8W__HmAjzA7jNeTll4fyAI-mPx6f8zUqAj_XN628Oy9JCalD5SjPMXbKnj8_Xr2UdG4TR7CvyuvYgD212MnnfsyI3vWe9hqkv9nbeyu1bArrBd8mPpvKv2P8A8Ovkkpj4P1X1XTk2tKzWEyKMmD1AyQq3NvWLRgVX1gnLziyd6YCqZbBJBq_PYEZZAstH1_T0k5641n_XM8PedRExyhIjy1.3XqcDEyz4jsCAKUIou2OtA',
      osVersion: 'Windows 10',
      deviceModel: 'Chrome',
      deviceType: 'PC',
      deviceSerial: 'w112c2a90-da0a-11ef-b249-ad4a0ed7b0a7',
      deviceOem: 'Chrome',
      devicePrettyName: 'Chrome 128.0.0.0',
      appVersion: '12.1',
      language: 'en_US',
      brand: 'fsro',
      memberId: '0',
      featureLevel: 6,
      provisionData: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3Mzc2OTIyNDgsImJyIjoiZnNybyIsImljIjp0cnVlLCJ1cCI6Im03Y3oiLCJvcCI6IjExNSIsImRlIjoiYnJhbmRNYXBwaW5nIiwiZHMiOiJ3MTEyYzJhOTAtZGEwYS0xMWVmLWIyNDktYWQ0YTBlZDdiMGE3In0.qFa51xG4wb2lYISB1OeweQoA00Edot4B9zQLjEStiuo'
    })
    .then(r => r.data)
    .catch(console.log)
}
