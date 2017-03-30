const axios = require('axios');
const cheerio = require('cheerio');

const RT_URL = 'https://www.rottentomatoes.com';
const RT_API_URL = 'https://www.rottentomatoes.com/api/private/v2.0/search/';

const now = new Date();
const YS = now.getFullYear() - 1;
const YE = now.getFullYear() + 1;

/**
 * scrapes https://www.rottentomatoes.com/ using their private search API
 * OMDB wasn't cutting it as it gets updates less frequently
 *
 * @param  {String} title
 * @param  {Number} yearStart - year start
 * @param  {Number} yearEnd - year end
 * @return {Promise}
 */
module.exports = (title, yearStart = YS, yearEnd = YE) => new Promise(async (resolve, reject) => {
  try {
    const response = await axios.get(RT_API_URL, {
      params: {
        limit: 2,
        q: title,
      },
    });

    // In Yellow pages we trust - movie title must === match!
    // eslint-disable-next-line
    const moviesWithinRange = response.data.movies.filter(movie => movie.year >= yearStart && movie.year <= yearEnd && movie.name.trim().toLocaleLowerCase() === title.trim().toLocaleLowerCase());

    if (moviesWithinRange.length === 0) {
      reject(null);
      return;
    }

    const movie = moviesWithinRange.pop(); // POP-IT!
    const movie411 = Object.create(null); // all the stolen data will be stored here
    const movieResponse = await axios.get(`${RT_URL}${movie.url}`);
    const $ = cheerio.load(movieResponse.data);
    const { name, contentRating = 'NR', aggregateRating = null, actors, director, author, genre } = JSON.parse($('script#jsonLdSchema').text());
    const [release = null, runtime = null] = $('ul.content-meta.info time[datetime]').toArray();
    const synopsisPlus = $('div#movieSynopsis').text(); // this sometimes™ carries `stars...` info which can be long
    const synopsis = synopsisPlus.search(/stars/i) > -1 ? synopsisPlus.slice(0, synopsisPlus.slice(0, synopsisPlus.search(/stars/i)).lastIndexOf('.') + 1) : synopsisPlus;

    Object.assign(movie411, {
      name,
      release: release ? $(release).text().replace(/\n/g, '').trim() : release,
      runtime: runtime ? $(runtime).text().replace(/\n/g, '').trim() : runtime,
      contentRating,
      aggregateRating,
      actors: actors.slice(0, 5),
      director,
      author,
      genre,
      synopsis,
      poster: $('a#poster_link > img').attr('src') || null,
    });

    // this will always resolve
    const videoClipPromise = url => new Promise((resolveTrailer) => {
      axios
        .get(url, { maxRedirects: 1 })
        .then((directVideo) => {
          resolveTrailer(directVideo);
        }, (err) => {
          resolveTrailer(err.response);
        });
    });

    const videoClips = JSON.parse($.html().match(/var videoClips = (\[.+\]);/)[1]);
    const videosDirectURL = await axios.all(videoClips.map(videoClip => videoClipPromise(videoClip.urls.hls)));

    // this is the part where you fix your face
    // Yes, I'm going to be mutating [enhancing] `videoClips` with `directHls` links
    videosDirectURL.forEach((directVideo, index) => {
      if (directVideo.status === 200) {
        // eslint-disable-next-line
        videoClips[index].urls.directHls = directVideo.request._options.href;
      } else {
        videoClips[index].urls.directHls = null;
      }
    });

    Object.assign(movie411, { trailers: videoClips });
    resolve(movie411);
  } catch (err) {
    reject(err);
  }
});
