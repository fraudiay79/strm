const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const doFetch = require('@ntlab/sfetch')
const uniqBy = require('lodash.uniqby')

dayjs.extend(utc)

// Configuration
const retryCount = 3
const retryDelay = 2000 // 2 seconds
const concurrentRequests = 5 // Limit concurrent requests

module.exports = {
  site: 'ziggogo.tv',
  days: 2,
  request: {
    cache: {
      ttl: 24 * 60 * 60 * 1000 // 1 day
    },
    timeout: 30000, // 30 second timeout
    retry: retryCount,
    delay: retryDelay
  },
  url({ date, segment = 0 }) {
    return `https://static.spark.ziggogo.tv/eng/web/epg-service-lite/nl/en/events/segments/${date.format(
      'YYYYMMDD'
    )}${segment.toString().padStart(2, '0')}0000`
  },
  async parser({ content, channel, date }) {
    const programs = []
    if (!content) return []
    
    try {
      const parsed = typeof content === 'string' ? JSON.parse(content) : content
      if (!Array.isArray(parsed.entries)) return []
      
      const entries = parsed.entries

      // fetch other segments with error handling
      let segments = [
        module.exports.url({ date, segment: 6 }),
        module.exports.url({ date, segment: 12 }),
        module.exports.url({ date, segment: 18 })
      ]
      
      try {
        await doFetch(segments, (url, res) => {
          if (res && Array.isArray(res.entries)) {
            entries.push(...res.entries)
          }
        })
      } catch (error) {
        console.log(`Error fetching segments: ${error.message}`)
        // Continue with whatever entries we have
      }

      let events = []
      entries
        .filter(item => item.channelId === channel.site_id)
        .forEach(item => {
          if (!Array.isArray(item.events)) return
          events.push(
            ...item.events.map(event => ({
              startTime: event.startTime,
              id: event.id,
              url: `https://spark-prod-nl.gnp.cloud.ziggogo.tv/eng/web/linear-service/v2/replayEvent/${event.id}?returnLinearContent=true&forceLinearResponse=true&language=nl`
            }))
          )
        })

      events = uniqBy(events, 'startTime')

      // fetch detailed guide with concurrency control and error handling
      if (events.length) {
        // Process events in batches to avoid overwhelming the server
        const batchSize = concurrentRequests
        for (let i = 0; i < events.length; i += batchSize) {
          const batch = events.slice(i, i + batchSize)
          const batchPrograms = await Promise.all(
            batch.map(async (event) => {
              try {
                const programData = await fetchWithRetry(event.url, event)
                if (programData) {
                  return {
                    title: programData.title,
                    subTitle: programData.episodeName,
                    description: programData.longDescription ? programData.longDescription : programData.shortDescription,
                    category: programData.genres,
                    season: programData.seasonNumber,
                    episode: programData.episodeNumber,
                    country: programData.countryOfOrigin,
                    actor: programData.actors,
                    director: programData.directors,
                    producer: programData.producers,
                    date: programData.productionDate,
                    start: dayjs.utc(programData.startTime * 1000),
                    stop: dayjs.utc(programData.endTime * 1000)
                  }
                }
                return null
              } catch (error) {
                console.log(`Failed to fetch event ${event.id}: ${error.message}`)
                return null
              }
            })
          )
          
          // Add successful programs
          batchPrograms.forEach(program => {
            if (program) programs.push(program)
          })
          
          // Add delay between batches to avoid rate limiting
          if (i + batchSize < events.length) {
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
        }
      }
      
      // Sort programs by start time
      programs.sort((a, b) => a.start - b.start)
      
    } catch (error) {
      console.log(`Error parsing content for channel ${channel.site_id}: ${error.message}`)
    }

    return programs
  },
  async channels() {
    const channels = []
    const axios = require('axios')
    
    try {
      const res = await axios
        .get(
          'https://spark-prod-nl.gnp.cloud.ziggogo.tv/eng/web/linear-service/v2/channels?cityId=65535&language=en&productClass=Orion-DASH&platform=web',
          {
            timeout: 30000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
              'Accept-Language': 'en-US,en;q=0.9'
            }
          }
        )
        .then(r => r.data)
        .catch(error => {
          console.log(`Error fetching channels: ${error.message}`)
          return null
        })

      if (Array.isArray(res)) {
        channels.push(
          ...res
            .filter(item => !item.isHidden)
            .map(item => {
              return {
                lang: 'nl',
                site_id: item.id,
                name: item.name
              }
            })
        )
      }
      
      console.log(`Found ${channels.length} channels for ziggogo.tv`)
      
    } catch (error) {
      console.log(`Error in channels function: ${error.message}`)
    }

    return channels
  }
}

// Helper function to fetch with retry logic for 504 errors
async function fetchWithRetry(url, event, retries = retryCount) {
  const axios = require('axios')
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Accept-Language': 'en-US,en;q=0.9',
          'Referer': 'https://www.ziggogo.tv/'
        }
      })
      
      if (response.data && response.data.id) {
        // Add start/end times from the event
        return {
          ...response.data,
          startTime: event.startTime,
          endTime: event.startTime + 3600 // Default 1 hour if not provided
        }
      }
      return response.data
      
    } catch (error) {
      if (i === retries - 1) {
        throw error
      }
      
      // For 504 errors, wait longer before retry
      const waitTime = error.response && error.response.status === 504 
        ? retryDelay * 2 
        : retryDelay
      
      console.log(`Retry ${i + 1}/${retries} for event ${event.id} after ${waitTime}ms (${error.message})`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
}
