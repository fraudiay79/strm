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
    return `${API_ENDPOINT}/schedule?channels=${channel.site_id}&from=${date.format('YYYY-MM-DDTHH:mm:ss.SSS')}Z&until=${date.add(1, 'days').format('YYYY-MM-DDTHH:mm:ss.SSS')}Z`
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
  parser: async function ({ content }) {
    let programs = []
    const items = parseItems(content)
    for (const item of items) {
      const detail = await loadProgramDetails(item.id)
      programs.push({
        id: item.id,
        title: detail.title || item.title,
        description: detail.description || '',
        icon: parseImages(item) || '',
        actors: parseRoles(detail, 'sg.ui.role.Cast') || [],
        directors: parseRoles(detail, 'sg.ui.role.Producer') || [],
        season: item.params ? item.params.seriesSeason : null,
        episode: item.params ? item.params.seriesEpisode : null,
        start: parseStart(item),
        stop: parseStop(item)
      })
    }

    return programs
  },
  async channels() {
    const session = await loadSessionDetails()
    if (!session || !session.token) throw new Error('The session token is missing')

    const data = await axios.get(`${API_ENDPOINT}/bouquet`, {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    }).then(r => r.data).catch(console.error)

    return data.channels.map(item => ({
      lang: 'ro',
      site_id: item.assetInfo.id,
      name: item.assetInfo.title
    }))
  }
}

async function loadProgramDetails(id) {
  if (!id) return {}
  const url = `${API_ENDPOINT}/assets/${id}`
  const data = await axios.get(url, { headers: {
    Authorization: `Bearer ${session.token}`,
    Origin: 'https://livetv.focussat.ro',
    Referer: 'https://livetv.focussat.ro/'
  } }).then(r => r.data).catch(error => {
    console.log(error)
    return null
  })

  const landscapeImage = data.images.find(img => img.type === 'la')?.url

  return {
    id: data.id,
    title: data.title,
    description: data.desc,
    icon: landscapeImage,
    actors: data.params.credits
      .filter(credit => credit.roleLabel === 'sg.ui.role.Cast')
      .map(credit => credit.person),
    directors: data.params.credits
      .filter(credit => credit.roleLabel === 'sg.ui.role.Director')
      .map(credit => credit.person)
  }
}

function parseImages(item) {
  return Array.isArray(item.images)
    ? item.images.find(i => i.type === 'la')?.url || ''
    : ''
}

function parseStart(item) {
  return item?.params?.start ? dayjs.utc(item.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]') : null
}

function parseStop(item) {
  return item?.params?.end ? dayjs.utc(item.params.end, 'YYYY-MM-DDTHH:mm:ss[Z]') : null
}

function parseRoles(detail, role_name) {
  if (!detail.credits) return []
  return detail.credits
    .filter(role => role.roleLabel === role_name)
    .map(role => role.person)
}

function parseItems(content) {
  const parsed = JSON.parse(content)
  return Array.isArray(parsed) ? parsed : []
}

async function loadSessionDetails() {
  let retryCount = 0
  const maxRetries = 5
  let backoffDelay = 1000 // Start with 1 second delay

  while (retryCount < maxRetries) {
    try {
      const response = await axios.post(`${API_ENDPOINT}/session`, {
        ssoToken: 'eyJrZXkiOiJtNyIsImFsZyI6ImRpciIsImVuYyI6IkExMjhDQkMtSFMyNTYifQ..711C_BSuYBi2EvgnQQoP4A.5D59RTyNQlK-I1Ucen0R4F1KCvRE8TgtxnFuasfrEdlXaLbibOmBDpk1B2wbRpm8ta36ARsB5bzCTOKAlJygMMJupnMPg1oJ-ff3bPOVXHuZXeAfNpgriHNT9ScQQZhFCBy9bZtHA49CPWy-_rE28Q3_HHCcLM9rzy5McLrsPbikI7JiPw5hB-eyQeN8X2OXl-f9vY5B2ltSTLTc2rJO32LMUaQ9aK1JXSnh2M5xN-mh0bcekNhIsy5_DtmGI7uPVa_dRKYO2KeklW4UwBe5R3idNvXoSb2NRifAW1E8y8W__HmAjzA7jNeTll4fyAI-mPx6f8zUqAj_XN628Oy9JCalD5SjPMXbKnj8_Xr2UdG4TR7CvyuvYgD212MnnfsyI3vWe9hqkv9nbeyu1bArrBd8mPpvKv2P8A8Ovkkpj4P1X1XTk2tKzWEyKMmD1AyQq3NvWLRgVX1gnLziyd6YCqZbBJBq_PYEZZAstH1_T0k5641n_XM8PedRExyhIjy1.3XqcDEyz4jsCAKUIou2OtA',
        osVersion: 'Windows 10',
        deviceModel: 'Chrome',
        deviceType: 'PC',
        deviceSerial: 'w112c2a90-da0a-11ef-b249-ad4a0ed7b0a7',
        deviceOem: 'Chrome',
        devicePrettyName: 'Chrome 131.0.0.0',
        appVersion: '12.0',
        language: 'en_US',
        brand: 'fsro',
        memberId: '0',
        featureLevel: 6,
        provisionData: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpYXQiOjE3Mzc2OTIyNDgsImJyIjoiZnNybyIsImljIjp0cnVlLCJ1cCI6Im03Y3oiLCJvcCI6IjExNSIsImRlIjoiYnJhbmRNYXBwaW5nIiwiZHMiOiJ3MTEyYzJhOTAtZGEwYS0xMWVmLWIyNDktYWQ0YTBlZDdiMGE3In0.qFa51xG4wb2lYISB1OeweQoA00Edot4B9zQLjEStiuo'
      })

      return response.data
    } catch (error) {
      console.error('Load session details error:', error)

      if (error.response && error.response.status === 429) {
        const retryAfter = error.response.headers['retry-after']
        console.log(`Rate limit exceeded. Retrying after ${retryAfter || backoffDelay}ms...`)
        await new Promise(resolve => setTimeout(resolve, retryAfter ? parseInt(retryAfter) * 1000 : backoffDelay))
        backoffDelay *= 2 // Exponential backoff
        retryCount += 1
      } else {
        throw error // Throw other errors
      }
    }
  }

  throw new Error('Max retries exceeded')
}
