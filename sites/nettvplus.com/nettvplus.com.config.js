const dayjs = require('dayjs')
const axios = require('axios')

const BASIC_TOKEN =
  'YjhkOWFkZTQtMTA5My00NmE3LWE0ZjctMGU0N2JlNDYzYzEwOjF3NGRtd3c4N3gxZTlsODllc3NxdmM4MXBpZHJxc2EwbGkxcnZhMjM='

let session

module.exports = {
  site: 'nettvplus.com',
  days: 3,
  url({ channel, date }) {
    return `https://api-web.nettv.cdn.united.cloud/v1/public/events/epg?fromTime=${date.format(
      'YYYY-MM-DDTHH:mm:ss-00:00'
    )}&toTime=${date
      .add(1, 'days')
      .subtract(1, 's')
      .format('YYYY-MM-DDTHH:mm:ss-00:00')}&cid=${channel.site_id}`
  },
  request: {
    async headers() {
      if (!session) {
        session = await loadSessionDetails()
        if (!session || !session.access_token) return null
      }

      return {
        Authorization: `Bearer ${session.access_token}`
      }
    }
  },
  parser({ content }) {
    try {
      const programs = []
      const data = JSON.parse(content)
      for (const channelId in data) {
        if (Array.isArray(data[channelId])) {
          data[channelId].forEach(item => {
            programs.push({
              title: item.title,
              description: item.shortDescription,
              image: parseImage(item),
              season: item.seasonNumber,
              episode: item.episodeNumber,
              start: dayjs(item.startTime),
              stop: dayjs(item.endTime)
            })
          })
        }
      }

      return programs
    } catch {
      return []
    }
  },
  async channels() {
    const session = await loadSessionDetails()
    if (!session || !session.access_token) return null

    const data = await axios
      .get(
        'https://api-web.nettv.cdn.united.cloud/v3/channels?channelType=TV',
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        }
      )
      .then(r => r.data)
      .catch(console.error)

    return data.map(item => ({
      lang: 'si',
      site_id: item.id,
      name: item.name
    }))
  }
}

function parseImage(item) {
  const baseURL = 'https://images-web.nettv.cdn.united.cloud'

  return Array.isArray(item?.images) && item.images[0] ? `${baseURL}${item.images[0].path}` : null
}

function loadSessionDetails() {
  return axios
    .post(
      'https://api-web.nettv.cdn.united.cloud/oauth/token?grant_type=client_credentials',
      {},
      {
        headers: {
          Authorization: `Basic ${BASIC_TOKEN}`
        }
      }
    )
    .then(r => r.data)
    .catch(console.log)
}
