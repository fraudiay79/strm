const axios = require('axios')
const dayjs = require('dayjs')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(timezone)

const API_ENDPOINT = 'https://mtel.ba/hybris/ecommerce/b2c/v1/products/channels'

module.exports = {
  site: 'mtel.ba_test',
  days: 2,
  url({ date }) {
    return `${API_ENDPOINT}/epg?platform=tv-iptv&currentPage=0&date=${date.format('YYYY-MM-DD')}`
  },
  request: {
    headers: {
      maxContentLength: 10000000, // 10 Mb
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  parser: function ({ content, channel }) {
    let programs = []
    const items = parseItems(content, channel)
    items.products.forEach(product => {
        product.programs.forEach(item => {
            programs.push({
                title: item.title,
                description: item.description,
                category: item.category,
                icon: item.picture ? item.picture.url : null,
                duration: item.durationMinutes,
                start: parseStart(item).toJSON(),
                stop: parseStop(item).toJSON()
            })
        })
    })

    return programs
},
  
  async channels() {
    let channels = []
    const totalPages = await getTotalPageCount()
    const pages = Array.from(Array(totalPages).keys())

    for (let page of pages) {
      const data = await axios
        .get(`${API_ENDPOINT}/search`, {
          params: {
            pageSize: 20,
            currentPage: page,
            query: ':relevantno:tv-kategorija:tv-iptv:tv-iptv-paket:Svi+kanali'
          },
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        })
        .then(r => r.data)
        .catch(console.log)

      data.products.forEach(item => {
        channels.push({
          lang: 'bs',
          site_id: item.code,
          name: item.name
        })
      })
    }

    return channels
  }
}

async function getEpgTotalPageCount() {
  const data = await axios
    .get(`${API_ENDPOINT}/epg`, {
      params: {
        platform: 'tv-iptv',
        currentPage: 0,
        date: dayjs().format('YYYY-MM-DD')
      },
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(r => r.data)
    .catch(error => {
      console.error(error)
    })

  return data ? data.pagination.totalPages : 0
}

async function getTotalPageCount() {
  const data = await axios
    .get(`${API_ENDPOINT}/search`, {
      params: {
        pageSize: 20,
        currentPage: 0,
        query: ':relevantno:tv-kategorija:tv-iptv:tv-iptv-paket:Svi+kanali'
      },
      headers: {
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
    .then(r => r.data)
    .catch(error => {
      console.error(error)
    })

  return data ? data.pagination.totalPages : 0
}

function parseItems(content, channel) {
  try {
    const data = JSON.parse(content)
    if (!data || !Array.isArray(data.products)) return []

    const channelData = data.products.find(c => c.code === channel.site_id)
    if (!channelData || !Array.isArray(channelData.programs)) return []

    return channelData.programs
  } catch (error) {
    console.error(error)
    return []
  }
}
