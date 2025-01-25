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
  const data = await axios.get(url, {
    headers: {
      Authorization: `Bearer ${session.token}`,
      Origin: 'https://livetv.focussat.ro',
      Referer: 'https://livetv.focussat.ro/'
    }
  }).then(r => r.data).catch(error => {
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

async function fetchSessionData() {
  const url = 'https://tvapi.solocoo.tv/v1/session'
  const payload = {
    "userName": "Demo Chrome 131.0.0.0",
    "demo": true,
    "userLogin": "demo_fsro_fNxR2lPk118zQE9K3d9uWg",
    "userId": "9c6e0419-f77f-0b59-f309-9cfc8175b954",
    "countryCode": "RO",
    "communityName": "Focus Sat",
    "ssoToken": "eyJrZXkiOiJtNyIsImFsZyI6ImRpciIsImVuYyI6IkExMjhDQkMtSFMyNTYifQ..B85_TTkG73-dYqeJV_D2ig.deqR9YaejycRRYOGkSsG6DMfAgEt4YU9aRMMoStdXspyR5EjAgoD95NgJvrJekQGpVaEBFPYfTuzxAUnfW2QOu8S7HB0RmtZdakAqPfNkO2Jw_LHj7SKS5pfPuAkEMT-rtAzSnDBPwXfHRwONKpb46U9YN5hV4CTYQkVIwNYQ1K3kyijLpeImxDNUw9jcowUBNZGCGrQUZUGfdSczz5qSkADaEHl_JfpuaTL4OJLesRFSo2PqsQZ3KRD_-1fBiXzC_TrNeru257TKJIVdX_G4cI7IIHS8MwIPtk3aBieVKP3cqLtWv4rAnHmxNkh-GkSpDx9JvbE5v-ek6eiwr4Vtp7FlIBtfPYBN19hL5fL9IVJxG4DDdSfSLjLAsnC95ommc75U7FLeBl4Cm6NdI89sJVZhPQPpTX5ccjrcjeRl--wGPnSiUA5S-ULadMp-hWNFq76PUB_5GtEK8D12mxzZ4QzNWoSVbRfVN1MB2kByVFtRpT-sHybY1xozySyLuSv.9wsWHIs_mZpo4y0ydeSHow",
    "update": true,
    "language": "en_US",
    "brandName": "Focus Sat",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0di5zb2xvY29vLmF1dGgiOnsicyI6IncxMTJjMmE5MC1kYTBhLTExZWYtYjI0OS1hZDRhMGVkN2IwYTciLCJ1IjoiR1FSdW5IXzNXUXZ6Q1p6OGdYVzVWQSIsImwiOiJlbl9VUyIsImQiOiJQQyIsImRtIjoiQ2hyb21lIiwib20iOiJPIiwiYyI6Ik9OcEVfSU9MSURId3ZjZHVkYlVBNDNMMFU4eWZLV2JrcVBFUWg3VFNXdXciLCJzdCI6ImZ1bGwiLCJnIjoiZXlKaWNpSTZJbVp6Y204aUxDSmtZaUk2Wm1Gc2MyVXNJbTl3SWpvaU1URTFJaXdpWkdVaU9pSmljbUZ1WkUxaGNIQnBibWNpTENKd2RDSTZabUZzYzJVc0luVndJam9pYlRkamVpSjkiLCJmIjo2LCJiIjoiZnNybyJ9LCJuYmYiOjE3Mzc4MzI1NjEsImV4cCI6MTczNzgzNDU1MCwiaWF0IjoxNzM3ODMyNTYxLCJhdWQiOiJtN2N6In0.gZ4-rbonUDZKHcuuLSBdIXRIRPbNgPWy4pPwOu7ZTYc",
    "consent": false
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })

    if (!response.ok) {
      throw new Error('Network response was not ok')
    }

    const data = await response.json()
    const ssoToken = data.ssoToken
    const provisionData = data.token // Assigning token to provisionData

    console.log('Fetched session data successfully:', { ssoToken, provisionData })
    return[_{{{CITATION{{{_1{](https://github.com/iptv-org/epg/tree/69294d7c48c4c99091d20e7ed6c977f3e24fc506/sites%2Fhd-plus.de.config.js)
