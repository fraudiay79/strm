const axios = require('axios')
const dayjs = require('dayjs')
const utc = require('dayjs/plugin/utc')
const timezone = require('dayjs/plugin/timezone')

dayjs.extend(utc)
dayjs.extend(timezone)

module.exports = {
  site: 'roya-tv.com',
  days: 2,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ date }) {
    const diff = date.diff(dayjs.utc().startOf('d'), 'd')
    return `https://backend.roya.tv/api/v01/channels/schedule-pagination?day_number=${diff}`
  },
  parser({ content, date, channel }) {
    const items = parseItems(content, date, channel)
    
    return items.map(item => {
      return {
        title: item.name,
        description: item.description,
        image: item.thumbnail_web,
        start: dayjs.unix(item.start_timestamp),
        stop: dayjs.unix(item.end_timestamp)
      }
    })
  },
  async channels() {
    try {
      const response = await axios.get('https://backend.roya.tv/api/v01/channels/schedule-pagination?day_number=0')
      const data = response.data
      
      // Validate response structure
      if (!data || !data.data || !Array.isArray(data.data) || !data.data[0]) {
        console.error('Unexpected API response structure in channels()')
        return []
      }
      
      const channels = data.data[0].channel
      if (!Array.isArray(channels)) {
        console.error('Channels data is not an array')
        return []
      }
      
      return channels.map(channel => {
        return {
          site_id: channel.id,
          name: channel.title,
          lang: 'ar'
        }
      })
    } catch (error) {
      console.error('Error fetching channels:', error.message)
      return []
    }
  }
}

/**
 * Parse program items from the API response
 * @param {string} content - Raw JSON response
 * @param {Object} date - Dayjs date object
 * @param {Object} channel - Channel object with site_id
 * @returns {Array} Array of program items
 */
function parseItems(content, date, channel) {
  const dateString = date.format('YYYY-MM-DD')
  
  try {
    // Clean invalid JSON if necessary (handles empty tags_ads fields)
    let cleanContent = content
    if (typeof content === 'string') {
      // Fix common JSON issues in the API response
      cleanContent = content
        .replace(/"tags_ads":\s*,/g, '"tags_ads": null,')
        .replace(/"tags_ads_android":\s*,/g, '"tags_ads_android": null,')
        .replace(/"tags_ads_ios":\s*,/g, '"tags_ads_ios": null,')
        .replace(/"tags_ads":\s*}/g, '"tags_ads": null}')
        .replace(/"tags_ads_android":\s*}/g, '"tags_ads_android": null}')
        .replace(/"tags_ads_ios":\s*}/g, '"tags_ads_ios": null}')
    }
    
    const data = JSON.parse(cleanContent)
    
    // Validate main response structure
    if (!data || !data.status || !Array.isArray(data.data)) {
      console.warn(`Invalid response structure for date ${dateString}`)
      return []
    }
    
    // Find the correct day data
    const dayData = data.data.find(item => item.date === dateString)
    if (!dayData) {
      console.warn(`No data found for date ${dateString}`)
      return []
    }
    
    // Validate channel data
    if (!Array.isArray(dayData.channel)) {
      console.warn(`No channel array for date ${dateString}`)
      return []
    }
    
    // Find the specific channel
    const channelData = dayData.channel.find(item => item.id == channel.site_id)
    if (!channelData) {
      console.warn(`Channel ${channel.site_id} not found for date ${dateString}`)
      return []
    }
    
    // Validate programs array
    if (!Array.isArray(channelData.programs)) {
      console.warn(`No programs array for channel ${channel.site_id}`)
      return []
    }
    
    // OPTION 1: Return all programs for the day (original behavior)
    return channelData.programs
    
    // OPTION 2: Return only programs that haven't ended yet (uncomment to use)
    // const now = dayjs().unix()
    // return channelData.programs.filter(program => 
    //   program.end_timestamp > now
    // )
    
    // OPTION 3: Return only programs that are currently showing (uncomment to use)
    // const now = dayjs().unix()
    // return channelData.programs.filter(program => 
    //   program.start_timestamp <= now && program.end_timestamp > now
    // )
    
  } catch (error) {
    console.error(`Error parsing programs for channel ${channel.site_id}:`, error.message)
    return []
  }
}
