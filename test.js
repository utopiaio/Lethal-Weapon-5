const test = require('tape');

const lw5 = require('./index');

test('Running', (t) => {
  t.plan(2);

  lw5('Get Out', 2016, 2017).then((movie) => {
    t.equal(movie.name, 'Get Out', 'Movie "Get Out" found between 2016 - 2017');
  });

  lw5('Get Out', 2012, 2014).catch((err) => {
    t.equal(err, null, 'Movie "Get Out" not found between 2014 - 2014');
  });
});
