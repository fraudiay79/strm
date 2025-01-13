const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
    site: 'cignalplay.com',
    days: 7, // maxdays=7
    request: {
        cache: {
            ttl: 60 * 60 * 1000 // 1 hour
        },
        headers: {
            'Accept-Encoding': 'gzip, deflate, br'
        }
    },
    url({
        channel,
        date
    }) {
        const start = date.format('YYYY-MM-DD[T]HH:mm:ss[Z]')
        const end = date.add(1, 'day').format('YYYY-MM-DD[T]HH:mm:ss[Z]')
        return `https://live-data-store-cdn.api.pldt.firstlight.ai/content/epg?start=${start}&end=${end}&reg=ph&dt=all&client=pldt-cignal-web&pageNumber=1&pageSize=100`
    },
    async parser({
        content,
        channel
    }) {
        const shows = []
        let parsedData

        try {
            if (content.trim().length === 0) {
                throw new Error('Empty response content')
            }
            parsedData = JSON.parse(content)
        } catch (error) {
            console.error('Error parsing JSON:', error)
            return shows; // Return empty shows array if parsing fails
        }

        // Access the 'data' key in the parsed JSON
        const data = parsedData.data

        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error('Data is not an array:', data)
            return shows
        }

        data.forEach(item => {
            if (item.cs === channel.site_id) {
                item.airing.forEach(airing => {
                    const show = {
                        title: airing.pgm.lon[0].n || '',
                        description: airing.pgm.lod[0].n || 'No description available',
                        category: airing.genre || '',
                        start: dayjs(airing.sc_st_dt).utc().format(),
                        stop: dayjs(airing.sc_ed_dt).utc().format()
                    }
                    shows.push(show)
                })
            }
        })

        return shows
    },
    async channels() {
        const url = 'https://catalog-service-cdn.api.pldt.firstlight.ai/catalog/storefront/2DB25A6A-7F9C-4ACE-9DFA-B63E7264BAA9/7C5DC10D-980E-4373-8D2F-A5015FB7834E/containers?policy_evaluate=false&pageNumber=1&pageSize=100&reg=row&dt=web&client=pldt-cignal-web'
        const response = await axios.get(url, {
            headers: {
                'Accept-Encoding': 'gzip, deflate, br'
            }
        })

        const {
            data: parsedData
        } = response
        const {
            data
        } = parsedData
        const channels = []

        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error('Data is not an array:', data);
            return channels
        }

        data.forEach(item => {
            if (Array.isArray(item.data)) {
                item.data.forEach(data => {
                    channels.push({
                        lang: 'en',
                        name: data.lon[0]?.n, // Extracting the name from the 'lon' array
                        site_id: data.cs
                    })
                })
            } else {
                console.error('Nested data is not an array:', item.data)
            }
        })

        return channels
    }
}
