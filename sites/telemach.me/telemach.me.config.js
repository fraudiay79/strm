const dayjs = require('dayjs');
const axios = require('axios');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
const customParseFormat = require('dayjs/plugin/customParseFormat');
const doFetch = require('@ntlab/sfetch');

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(customParseFormat);

module.exports = {
  site: 'telemach.me',
  days: 10,
  url({ channel, date }) {
    return `https://api-web.ug-be.cdn.united.cloud/v1/public/events/epg?fromTime=${date.format('YYYY-MM-DDTHH:mm:ssZ')}&toTime=${date.add(10, 'days').format('YYYY-MM-DDTHH:mm:ssZ')}&communityId=5&languageId=10001&cid=${channel.site_id}`;
  },
  request: {
    headers: {
      Referer: 'https://epg.telemach.me/',
      Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsidWMtaW5mby1zZXJ2aWNlIl0sInNjb3BlIjpbInJlYWQiXSwiZXhwIjoxNzM3MzU2MTUxLCJhdXRob3JpdGllcyI6WyJST0xFX1BVQkxJQ19FUEciXSwianRpIjoiM1VjbXUzWmN2Tnc0bHJlVFlqYVRPNEppVWZJIiwiY2xpZW50X2lkIjoiMjdlMTFmNWUtODhlMi00OGU0LWJkNDItOGUxNWFiYmM2NmY1In0.RPTFKDirB2OxWREV1ECLCqKmCiAOntwnvaJ60NsK-CyWxla54Vd2Fa2XF_XdL3jQmeq3cYIbieUTXtW_83z6YyQFkUcZwGLwmHlC8Ui21MX_yFL9FVL-gQuQMzUi6uS11wZD-oFIzMxuF7wHzLKnTFj2qfvH_ffqsV0nf4oxuWyJSL2W9JobOtyXPeUQz08uKCR13V2XV2xTy4ZJNxz7GKSX_zqF1vxifAra6iovnXZ-DfqAiimfB4pqIR2tEtY8HFm0EfrFMheaSFpycimv5SYwy3FArHFxtRXf2UiDgHezkrCytb6Rnmrs3No8HCkJ4P0sCE1kOV59yNzKmLiMzQ'
    }
  },
  parser: function ({ content, date }) {
    let programs = [];
    const items = parseItems(content, date);
    items.forEach(item => {
      programs.push({
        title: item.title,
        description: item.shortDescription,
        categories: item.categories || null,
        icon: parseImages(item),
        season: item.seasonNumber || null,
        episode: item.episodeNumber || null,
        start: item.startTime,
        stop: item.endTime
      });
    });

    return programs;
  },
  async channels() {
    const data = await axios
      .get(`https://api-web.ug-be.cdn.united.cloud/v1/public/channels?channelType=TV&communityId=5&languageId=10001&imageSize=L`,{ headers: { Authorization: 'Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdWQiOlsidWMtaW5mby1zZXJ2aWNlIl0sInNjb3BlIjpbInJlYWQiXSwiZXhwIjoxNzM3MzU2MTUxLCJhdXRob3JpdGllcyI6WyJST0xFX1BVQkxJQ19FUEciXSwianRpIjoiM1VjbXUzWmN2Tnc0bHJlVFlqYVRPNEppVWZJIiwiY2xpZW50X2lkIjoiMjdlMTFmNWUtODhlMi00OGU0LWJkNDItOGUxNWFiYmM2NmY1In0.RPTFKDirB2OxWREV1ECLCqKmCiAOntwnvaJ60NsK-CyWxla54Vd2Fa2XF_XdL3jQmeq3cYIbieUTXtW_83z6YyQFkUcZwGLwmHlC8Ui21MX_yFL9FVL-gQuQMzUi6uS11wZD-oFIzMxuF7wHzLKnTFj2qfvH_ffqsV0nf4oxuWyJSL2W9JobOtyXPeUQz08uKCR13V2XV2xTy4ZJNxz7GKSX_zqF1vxifAra6iovnXZ-DfqAiimfB4pqIR2tEtY8HFm0EfrFMheaSFpycimv5SYwy3FArHFxtRXf2UiDgHezkrCytb6Rnmrs3No8HCkJ4P0sCE1kOV59yNzKmLiMzQ' } })
      .then(r => r.data)
      .catch(console.log)

    return data.map(item => {
      return {
        lang: 'cnr',
        site_id: item.id,
        name: item.name
      }
    })
  }
}

function parseImages(item) {
  const baseURL = 'https://images-web.ug-be.cdn.united.cloud/';
  return Array.isArray(item?.images)
    ? item.images.map(i => `${baseURL}${i.path}&width=640&height=360`)
    : [];
}

function parseItems(content, date) {
  try {
    const data = JSON.parse(content);
    if (!data || !Array.isArray(data[channelId])) return [];

    return data[channelId].filter(
      p => p?.startTime && date.isSame(dayjs.utc(p.startTime, 'YYYY-MM-DDTHH:mm:ssZ'), 'd')
    );
  } catch (err) {
    console.log(err);
    return [];
  }
}
