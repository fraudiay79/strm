const axios = require('axios');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'yes.co.il',
  days: 3,
  request: {
    cache: {
      ttl: 60 * 60 * 1000 // 1 hour
    }
  },
  url({ channel, date }) {
    return `https://www.yes.co.il/o/yes/servletlinearsched/getscheduale?startdate=${date.format('YYYYMMDD')}&p_auth=${channel.p_auth}`;
  },
  async parser({ content }) {
    const shows = [];
    const data = JSON.parse(content);

    data.forEach(program => {
      const show = {
        channel: program.channelID,
        title: program.scheduleItemName,
        description: program.scheduleItemSynopsis || 'No description available',
        start: dayjs(program.startDate).utc().format(),
        stop: dayjs(program.startDate).add(dayjs.duration(program.broadcastItemDuration)).utc().format()
      };
      shows.push(show);
    });

    return shows;
  },
  async getAuthToken() {
    try {
      const url = 'https://www.yes.co.il/content/tvguide';
      const response = await axios.get(url);
      const textToSearch = ';Liferay.authToken=';
      const mainPageHtml = response.data;
      const idx = mainPageHtml.indexOf(textToSearch);
      if (idx === -1) {
        throw new Error('Auth token not found');
      }
      const val = mainPageHtml.substring(idx + textToSearch.length);
      const authToken = val.split(';')[0].trim();
      return authToken;
    } catch (error) {
      console.error('Error fetching auth token:', error);
      return null;
    }
  },
  async channels() {
    const authToken = await this.getAuthToken();
    if (!authToken) {
      console.error('No auth token available');
      return [];
    }

    const url = `https://www.yes.co.il/o/yes/servletlinearsched/getchannels?p_auth=${authToken}`;

    try {
      const response = await axios.get(url);

      if (response.data && Array.isArray(response.data)) {
        const channels = response.data.map(channel => {
          return {
            lang: 'he',
            name: channel.channelName,
            site_id: channel.channelID,
            p_auth: authToken
          };
        });
        return channels;
      } else {
        console.error('Response data is not an array:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching channels:', error);
      return [];
    }
  }
};
