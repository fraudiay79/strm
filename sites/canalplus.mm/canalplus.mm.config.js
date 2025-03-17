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
	    'eyJrZXkiOiJjcG1tIiwiYWxnIjoiZGlyIiwiZW5jIjoiQTEyOENCQy1IUzI1NiJ9..Hv9DXW8Chj7o4lPeIgcOog.iB78ltUZEFYodvQ7qteUZPv19sZ0zrfHrIibzgbBqu0Qy-0kJ1gvYqQMXN1X2mAwzReIckbqv_-NzpJqXpKc1CAOcb8gLXa8GGJOAa1JRjiBQbHK4hu33qgFokFQamyZbqv1XOy4g81nKpxhhWOoA3xvPn1bNwsr6Owf98Ai66ODcWp7bW9KR7moDPIj0gsxIIGWV-zjO3aNvu0GDmODykrTS3BjAe7LJWKwZ4TpLCq_WAJ1-U4lMj1iSv5fkTanLGD3hdrL1Xz2O-EOij43LwCdqY9sf7l9CIDDkzjLeWN6ESkv3dG-_oc3mcjp2CmVqtmXcbKKkbfSLJ8_yTfWykwyrtt6UagyE0hrGaq6ehWkFrnPpyVFfIe-nFE5GsYJmuTlYlnM9wIFioeNVuiLUdP8zDbhuMOIjrNhOC9TqLsSvH3Wz56ThVawzIeukAXI2DVITdDoQBIi6vmq4XYENg.RNzodqJyAjgfzrcWThE_mQ',
      osVersion: 'Windows 10',
      deviceModel: 'Chrome',
      deviceType: 'PC',
      deviceSerial: 'w125adcd0-035a-11f0-8b10-5bfd4f4cf159',
      deviceOem: 'Chrome',
      devicePrettyName: 'Chrome 134.0.0.0',
      appVersion: '12.2',
      language: 'en_US',
      brand: 'cpmm',
      memberId: '0',
      featureLevel: 6,
      provisionData:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJiciI6ImNwbW0iLCJpYyI6dHJ1ZSwiaWF0IjoxNzQyMjM0NjI2LCJkcyI6IncxMjVhZGNkMC0wMzVhLTExZjAtOGIxMC01YmZkNGY0Y2YxNTkiLCJ1cCI6ImNwaSIsImRlIjoiYnJhbmRNYXBwaW5nIn0.n7Uw4_7kdmoMF4NtwocB7wXE2HXku7kOQNeeUm2e--g'
    })
    .then(r => r.data)
    .catch(console.log)
}
