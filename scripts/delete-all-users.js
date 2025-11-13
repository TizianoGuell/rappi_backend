const sqlite3 = require('sqlite3').verbose();
const path = process.argv[2] || 'RappiDB.db';
const db = new sqlite3.Database(path, sqlite3.OPEN_READWRITE, (err) => {
  if (err) {
    console.error('Failed to open DB', path, err.message);
    process.exit(1);
  }
});

function getCount() {
  return new Promise((res, rej) => {
    db.get('SELECT COUNT(*) as c FROM usuarios', (err, row) => {
      if (err) return rej(err);
      res(row.c);
    });
  });
}

(async () => {
  try {
    const before = await getCount();
    console.log('Usuarios before:', before);
    await new Promise((res, rej) => {
      db.run('DELETE FROM usuarios', function (err) {
        if (err) return rej(err);
        res();
      });
    });
    const after = await getCount();
    console.log('Usuarios after:', after);
    console.log('All users deleted from', path);
  } catch (e) {
    console.error('Failed to delete users', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    db.close();
  }
})();
