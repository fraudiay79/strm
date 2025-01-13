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
        const url = 'https://live-data-store-cdn.api.pldt.firstlight.ai/content/epg?start=2025-01-13T05%3A00:00Z&end=2025-01-14T05%3A00:00Z&reg=ph&dt=all&client=pldt-cignal-web&pageNumber=1&pageSize=100';
        const response = await axios.get(url, {
            headers: {
                'Accept-Encoding': 'gzip, deflate, br'
            }
        })

        const parsedData = response.data
        const data = parsedData.data
        const channels = []

        // Ensure data is an array
        if (!Array.isArray(data)) {
            console.error('Data is not an array:', data)
            return channels
        }

        data.forEach(item => {
            item.airing.forEach(airing => {
                channels.push({
                    lang: 'en',
                    name: airing.ch.acs ? airing.ch.acs.replace(/_/g, ' ') : 'Unknown',
                    site_id: airing.ch.cs
                })
            })
        })

        return channels
    }

}
