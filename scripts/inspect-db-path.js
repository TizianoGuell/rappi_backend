const sqlite3 = require('sqlite3').verbose();
const path = process.argv[2] || 'RappiDB.db';
const db = new sqlite3.Database(path, sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open DB', path, err.message);
    process.exit(1);
  }
});

function q(sql, label) {
  return new Promise((res, rej) => {
    db.all(sql, (err, rows) => {
      if (err) return rej(err);
      console.log('\n== ' + label + ' ==');
      console.log(JSON.stringify(rows, null, 2));
      res(rows);
    });
  });
}

(async () => {
  try {
    await q("SELECT name FROM sqlite_master WHERE type='table'", 'tables');
    await q('SELECT id, nombre FROM roles LIMIT 100', 'roles (first 100)');
    await q('SELECT id, nombre, email, rol_id FROM usuarios ORDER BY id DESC LIMIT 20', 'usuarios (last 20)');
  } catch (e) {
    console.error('Query failed', e && e.message ? e.message : e);
    process.exit(1);
  } finally {
    db.close();
  }
})();
