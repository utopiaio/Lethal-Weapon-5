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
      videoPoster: $('div#heroImageContainer > a > .heroImage').attr('style') ? $('div#heroImageContainer > a > .heroImage').attr('style').match(/'(.+)'/i)[1] : null,
    });

    // Protect SUMMER at all times, we'll be following the link to get the trailer video...
    // TODO:
    // abort link without waiting for .then which is triggered after movie data is dumped
    if ($('div#heroImageContainer > a').attr('data-mp4-url') === undefined) {
      Object.assign(movie411, { trailer: null });
      resolve(movie411);
      return;
    }

    const videoResponse = await axios.get($('div#heroImageContainer > a').attr('data-hls-url'), { maxRedirects: 1 });

    // eslint-disable-next-line
    Object.assign(movie411, { trailer: videoResponse.request._options.href });
    resolve(movie411);
  } catch (err) {
    reject(err);
  }
});
