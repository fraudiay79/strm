const axios = require('axios')
const dayjs = require('dayjs')

const configAllenteDk = {
    site: 'allente.dk',
    days: 2,
    request: {
        cache: {
            ttl: 60 * 60 * 1000 // 1 hour
        }
    },
    epgSources: [
        'https://cs-vcb.allente.dk/epg/events'
    ],
    url({ date }) {
        return `https://cs-vcb.allente.dk/epg/events?date=${date.format('YYYY-MM-DD')}`
    },
    parser({ content, channel }) {
        let programs = []
        const items = parseItems(content, channel)
        items.forEach(item => {
            if (!item.details) return
            const start = dayjs(item.time)
            const stop = start.add(item.details.duration, 'm')
            programs.push({
                title: item.title,
                category: item.details.categories,
                description: item.details.description,
                icon: item.details.image,
                season: parseSeason(item),
                episode: parseEpisode(item),
                start,
                stop
            })
        })

        return programs
    },
    async channels() {
        const data = await axios
            .get(`https://cs-vcb.allente.dk/epg/events?date=${dayjs().format('YYYY-MM-DD')}`)
            .then(r => r.data)
            .catch(console.log)

        return data.channels.map(item => ({
            lang: 'da',
            site_id: item.id,
            name: item.name
        }))
    }
}

const configAllenteFi = {
    site: 'allente.fi',
    days: 2,
    request: {
        cache: {
            ttl: 60 * 60 * 1000 // 1 hour
        }
    },
    url({ date }) {
        return `https://cs-vcb.allente.fi/epg/events?date=${date.format('YYYY-MM-DD')}`
    },
    parser({ content, channel }) {
        let programs = []
        const items = parseItems(content, channel)
        items.forEach(item => {
            if (!item.details) return
            const start = dayjs(item.time)
            const stop = start.add(item.details.duration, 'm')
            programs.push({
                title: item.title,
                category: item.details.categories,
                description: item.details.description,
                icon: item.details.image,
                season: parseSeason(item),
                episode: parseEpisode(item),
                start,
                stop
            })
        })

        return programs
    },
    async channels() {
        const data = await axios
            .get(`https://cs-vcb.allente.fi/epg/events?date=${dayjs().format('YYYY-MM-DD')}`)
            .then(r => r.data)
            .catch(console.log)

        return data.channels.map(item => ({
            lang: 'fi',
            site_id: item.id,
            name: item.name
        }))
    }
}

const configAllenteSe = {
    site: 'allente.se',
    days: 2,
    request: {
        cache: {
            ttl: 60 * 60 * 1000 // 1 hour
        }
    },
    url({ date }) {
        return `https://cs-vcb.allente.se/epg/events?date=${date.format('YYYY-MM-DD')}`
    },
    parser({ content, channel }) {
        let programs = []
        const items = parseItems(content, channel)
        items.forEach(item => {
            if (!item.details) return
            const start = dayjs(item.time)
            const stop = start.add(item.details.duration, 'm')
            programs.push({
                title: item.title,
                category: item.details.categories,
                description: item.details.description,
                icon: item.details.image,
                season: parseSeason(item),
                episode: parseEpisode(item),
                start,
                stop
            })
        })

        return programs
    },
    async channels() {
        const data = await axios
            .get(`https://cs-vcb.allente.se/epg/events?date=${dayjs().format('YYYY-MM-DD')}`)
            .then(r => r.data)
            .catch(console.log)

        return data.channels.map(item => ({
            lang: 'sv',
            site_id: item.id,
            name: item.name
        }))
    }
}

const fetchEPGData = async (config) => {
    try {
        const epgData = await Promise.all(config.epgSources.map(async (source) => {
            const response = await axios.get(config.url({ date: dayjs() }))
            const parsedData = config.parser({ content: JSON.stringify(response.data), channel: { site_id: 'some-channel-id' }})
            return parsedData
        }))
        return epgData
    } catch (error) {
        console.error('Error fetching EPG data:', error)
    }
}

fetchEPGData(configAllenteDk).then((data) => {
    console.log('EPG Data DK:', data)
})

fetchEPGData(configAllenteFi).then((data) => {
    console.log('EPG Data FI:', data)
})

fetchEPGData(configAllenteSe).then((data) => {
    console.log('EPG Data SE:', data)
})

module.exports = {
    configAllenteDk,
    configAllenteFi,
    configAllenteSe
}

function parseItems(content, channel) {
    const data = JSON.parse(content)
    if (!data || !Array.isArray(data.channels)) return []
    const channelData = data.channels.find(i => i.id === channel.site_id)

    return channelData && Array.isArray(channelData.events) ? channelData.events : []
}

function parseSeason(item) {
    return item.details.season || null
}

function parseEpisode(item) {
    return item.details.episode || null
}
