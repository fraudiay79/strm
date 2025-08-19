const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
    site: 'galamtv.kz',
    timezone: 'Asia/Almaty',
    days: 2,
    request: {
        method: 'GET',
        headers: {
            Referer: 'https://galamtv.kz/',
            Origin: 'https://galamtv.kz',
            Accept: '*/*',
            'Accept-Encoding': 'gzip, deflate, br, zstd',
        }
    },
    url({ channel, date }) {
        return `https://galam.server-api.lfstrm.tv/epg/v2/schedules/${channel.site_id}/spread?centralPageId=${date.format('YYYY-MM-DD')}t12d12h`
    },
    parser: function({ content }) {
        let programs = []
        const data = JSON.parse(content)
        
        // Check if pagesWithEvents exists and has data
        if (!data.pagesWithEvents || !Array.isArray(data.pagesWithEvents)) {
            return programs
        }

        // Process each page with events
        data.pagesWithEvents.forEach(page => {
            if (page.events && Array.isArray(page.events)) {
                page.events.forEach(event => {
                    const start = dayjs(event.scheduledFor.begin)
                    const stop = dayjs(event.scheduledFor.end)

                    programs.push({
                        title: event.title,
                        description: event.eventDescriptionMedium,
                        icon: event.logoUrl,
                        start,
                        stop
                    })
                })
            }
        })

        return programs
    },
    async channels() {
        try {
            const response = await axios.get(`https://galam.server-api.lfstrm.tv/channels-now`)
            return response.data.channels.map(item => {
                return {
                    lang: 'kk',
                    site_id: item.channels.id,
                    name: item.channels.info.metaInfo.title
                }
            })
        } catch (error) {
            console.error('Error fetching channels:', error)
            return []
        }
    }
}
