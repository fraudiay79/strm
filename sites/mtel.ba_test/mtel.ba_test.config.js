const axios = require('axios')
const dayjs = require('dayjs')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(timezone)

module.exports = {
  site: 'mtel.ba_test',
  days: 2,
  url: function ({ date, page }) {
    return `https://mtel.ba/hybris/ecommerce/b2c/v1/products/channels/epg?platform=tv-iptv&date=${date.format('YYYY-MM-DD')}&currentPage=0`
  },
  request: {
    headers: {
      maxContentLength: 10000000, // 10 Mb
      'X-Requested-With': 'XMLHttpRequest'
    }
  },
  parser({ content, channel }) {
    const items = parseItems(content, channel)

    return items.map(item => {
      return {
        title: item.title,
        category: item.category,
        description: item.description,
        icon: item?.picture?.url || null,
        start: dayjs(item.start),
        stop: dayjs(item.end)
      }
    })
  },
  async channels() {
    let channels = []
    const totalPages = await getTotalPageCount()
    const pages = Array.from(Array(totalPages).keys()) // Creates an array [0, 1, 2, ... totalPages-1]

    for (let page of pages) {
      const data = await axios
        .get(`https://mtel.ba/hybris/ecommerce/b2c/v1/products/channels/search`, {
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

async function getTotalPageCount() {
  const data = await axios
    .get(`https://mtel.ba/hybris/ecommerce/b2c/v1/products/channels/search`, {
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
    .catch(console.log)

  return data.pagination.totalPages
}

function parseItems(content, channel) {
  try {
    const data = JSON.parse(content)
    if (!data || !Array.isArray(data.products)) return []

    const channelData = data.products.find(c => c.code === channel.site_id)
    if (!channelData || !Array.isArray(channelData.programs)) return []

    return channelData.programs
  } catch {
    return []
  }
}
