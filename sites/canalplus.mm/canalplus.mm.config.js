const dayjs = require('dayjs')
const axios = require('axios')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const doFetch = require('@ntlab/sfetch')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

let session

module.exports = {
  site: 'canalplus.mm',
  days: 2,
  url({ channel, date }) {
    return `https://tvapi-sgn.solocoo.tv/v1/assets?query=schedule,forrelated,${
      channel.site_id
    }&from=${date.format('YYYY-MM-DDTHH:mm:ss[Z]')}&limit=1000`
  },
  request: {
    async headers() {
      if (!session) {
        session = await loadSessionDetails()
        if (!session || !session.token) return null
      }

      return {
        authorization: `Bearer ${session.token}`
      }
    }
  },
  parser: function ({ content, date }) {
    let programs = []
    const items = parseItems(content, date)
    items.forEach(item => {
      programs.push({
        title: item.title,
        categories: parseCategories(item),
        images: parseImages(item),
        start: parseStart(item),
        stop: parseStop(item)
      })
    })

    return programs
  },
  async channels() {
    const session = await loadSessionDetails()
    if (!session || !session.token) throw new Error('The session token is missing')

    const data = await axios.get(`https://tvapi-sgn.solocoo.tv/v1/bouquet`, {
      headers: {
        Authorization: `Bearer ${session.token}`
      }
    }).then(r => r.data).catch(console.error)

    return data.channels.map(item => ({
      lang: 'my',
      site_id: item.assetInfo.id,
      name: item.assetInfo.title
    }))
  }
}

function parseCategories(item) {
  return Array.isArray(item?.params?.genres) ? item.params.genres.map(i => i.title) : []
}

function parseImages(item) {
  return Array.isArray(item?.images)
    ? item.images
        .filter(i => i.url.indexOf('orientation=landscape') > 0)
        .map(i => `${i.url}&w=460&h=260`)
    : []
}

function parseStart(item) {
  return item?.params?.start ? dayjs.utc(item.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]') : null
}

function parseStop(item) {
  return item?.params?.end ? dayjs.utc(item.params.end, 'YYYY-MM-DDTHH:mm:ss[Z]') : null
}

function parseItems(content, date) {
  try {
    const data = JSON.parse(content)
    if (!data || !Array.isArray(data.assets)) return []

    return data.assets.filter(
      p => p?.params?.start && date.isSame(dayjs.utc(p.params.start, 'YYYY-MM-DDTHH:mm:ss[Z]'), 'd')
    )
  } catch (err) {
    console.log(err)
    return []
  }
}

function loadSessionDetails() {
  return axios
    .post('https://tvapi-sgn.solocoo.tv/v1/session', {
      ssoToken:
	    'eyJrZXkiOiJjcG1tIiwiZW5jIjoiQTEyOENCQy1IUzI1NiIsImFsZyI6ImRpciJ9..Dcmv6UxSyoNg1RrxoaE2Fw.v3wZIg4_f1cWqCDvKNxkaMRb-39FrTvJVY9vK35z2W8oqppsSLId0qdFm9sUxMXz_Gn5RfURktzK0RgdiAAEL6fWGJyKoVAsRb74obEsfQSLyPG2gLB2LuWI4R3WCFCHay_Ofg0M9rdZsoJQBd2YRAKnBa8IdAc-IuD7a8jeWLzTzx4_JT_1GUjoEcksjbcF6feKKGytDnQufj9PgtIUKhi6ItCnwO-CuztuQ5uqMUyrCPe9O6j2zm8FgwkNFK_6pWRxgl8EseE6t2qZRVWjiZ3tlEdEVmzb7mDUs96Jk9ILkt4qqf7ewiWpntPYvlkd7uFhn3clDY3IqSH0IAuHbdtWCMbvxPE6XwlYhK-2_E2GV2qnmL7UhDT877yI7VB0SC47akpDZGPPP6irHTa30Vg-X43MRjzq4b4MLMJJSl8O8eg463PUZl61aZ-0wD2bDBa5XFhAChKR9F58er3CSjBprhR2AdCw1NPV-NA5hEQ.18LzJB0dLBjIfUAJzYqqxA',
      osVersion: 'Windows 10',
      deviceModel: 'Chrome',
      deviceType: 'PC',
      deviceSerial: 'wfd9ee490-e5a8-11ef-b608-45bab0c9fee8',
      deviceOem: 'Chrome',
      devicePrettyName: 'Chrome 132.0.0.0',
      appVersion: '11.6.1',
      language: 'en_US',
      brand: 'cpmm',
      memberId: '0',
      featureLevel: 6,
      provisionData:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3MzkxOTQ3NzksImJyIjoiY3BtbSIsInVwIjoiY3BpIiwiaWMiOnRydWUsImRzIjoid2ZkOWVlNDkwLWU1YTgtMTFlZi1iNjA4LTQ1YmFiMGM5ZmVlOCIsImRlIjoiYnJhbmRNYXBwaW5nIn0.zOZSURwS1W0UQWgxsdcAOLDGkzS9LpvBPsLm_dJ6fq8'
    })
    .then(r => r.data)
    .catch(console.log)
}
