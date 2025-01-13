const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')
const customParseFormat = require('dayjs/plugin/customParseFormat')
const doFetch = require('@ntlab/sfetch')

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(customParseFormat)

module.exports = {
    site: 'galamtv.kz',,
    timezone: 'Asia/Almaty',
    days: 2,
    request: {
        cache: {
            ttl: 60 * 60 * 1000 // 1 hour
        }
    },
    url({
        channel,
        date
    }) {
        const todayEpoch = date.startOf('day').utc().valueOf()
        const nextDayEpoch = date.add(1, 'day').startOf('day').utc().valueOf()
        return `https://galam.server-api.lfstrm.tv/channels/${channel.site_id}/programs?period=${todayEpoch}:${nextDayEpoch}&app.version=3.5.12`
    },
    parser: function({ content }) {
        let programs = []
        const data = JSON.parse(content)
        const programsData = data.programs || []

        programsData.forEach(program => {
            const start = dayjs.unix(program.scheduleInfo.start)
            const stop = dayjs.unix(program.scheduleInfo.end)

            programs.push({
                title: program.metaInfo.title,
                description: program.metaInfo.description,
                image: program.mediaInfo.thumbnails[0].url,
                start,
                stop
            })
        })

        return programs
    },
    async channels() {
        const data = await axios
            .get(`https://galam.server-api.lfstrm.tv/channels-now?app.version=3.3.7`)
            .then(r => r.data)
            .catch(console.log)

        return data.channels.map(item => {
            return {
                lang: 'kk',
                site_id: item.channels.id,
                name: item.channels.info.metaInfo.title
            }
        })
    }
}
