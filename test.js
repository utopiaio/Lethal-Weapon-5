const test = require('tape');

const lw5 = require('./index');

test('Running', (t) => {
  t.plan(8);

  lw5('Get Out', 2016, 2017).then((movie) => {
    t.equal(movie.name, 'Get Out', 'Movie "Get Out" found between 2016 - 2017');
    t.equal(movie.runtime, '104 minutes', 'Movie "Get Out" Runtime');
    t.equal(movie.release, 'Feb 24, 2017', 'Movie "Get Out" Release');
  });

  lw5('   Get Out    ', 2016, 2017).then((movie) => {
    t.equal(movie.name, 'Get Out', 'Movie "Get Out" [trimmed] found between 2016 - 2017');
  });

  lw5('   Kong: SKULL ISLAND    ', 2016, 2017).then((movie) => {
    t.equal(movie.name, 'Kong: Skull Island', 'Movie "Kong: Skull Island" [trimmed] found between 2016 - 2017');
  });

  lw5('Get Out', 2012, 2014).catch((err) => {
    t.equal(err, null, 'Movie "Get Out" not found between 2014 - 2014');
  });

  lw5('THE TICKET', 2016, 2017).then((movie) => {
    t.equal(movie.name, 'The Ticket', 'Movie "The Ticket" found between 2016 - 2017');
  });

  lw5('Life', 2016, 2017).then((movie) => {
    t.equal(movie.name, 'Life', 'Movie "Life" found between 2016 - 2017');
  });
});
