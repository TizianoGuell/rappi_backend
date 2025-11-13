const sqlite3 = require('sqlite3').verbose();
const dbFile = 'RappiDB.db';
const db = new sqlite3.Database(dbFile, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Failed to open DB', dbFile, err && err.message);
    process.exit(1);
  }
});

const categories = [
  { name: 'Pizzería', description: 'Pizzerías y pizzas artesanales' },
  { name: 'Hamburguesería', description: 'Hamburguesas y sándwiches' },
  { name: 'Restaurante', description: 'Restaurantes diversos' },
  { name: 'Cafetería', description: 'Cafeterías y cafés' },
  { name: 'Sushi Bar', description: 'Sushi y comida japonesa' },
];

(async () => {
  try {
    let created = 0;
    let skipped = 0;
    for (const c of categories) {
      const exists = await new Promise((res, rej) => {
        db.get('SELECT id FROM categories WHERE name = ? LIMIT 1', [c.name], (err, row) => {
          if (err) return rej(err);
          res(!!row);
        });
      });

      if (exists) {
        console.log('Skipping existing:', c.name);
        skipped++;
        continue;
      }

      await new Promise((res, rej) => {
        db.run(
          'INSERT INTO categories (name, description) VALUES (?, ?)',
          [c.name, c.description],
          function (err) {
            if (err) return rej(err);
            res(this.lastID);
          },
        );
      });
      console.log('Inserted:', c.name);
      created++;
    }

    console.log('\nDone. Created:', created, 'Skipped:', skipped);
  } catch (e) {
    console.error('Error seeding categories:', e && e.message ? e.message : e);
  } finally {
    db.close();
  }
})();
