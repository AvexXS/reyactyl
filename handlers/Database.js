const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
  db.run('CREATE TABLE IF NOT EXISTS `values` (id TEXT PRIMARY KEY, value TEXT)');
});

module.exports = {
  get: async function (id) {
    return new Promise((resolve, reject) => {
      db.get('SELECT value FROM `values` WHERE `id` = ?', [id], (err, row) => {
        if (err) {
          console.error('Error executing SELECT query:', err.message);
          return resolve(null);
        }
        if (!row) {
          return resolve(null);
        }
        let val = row.value;
        try {
          val = JSON.parse(val);
        } catch {
          val = row.value;
        }
        return resolve(val);
      });
    });
  },

  set: async function (key, val) {
    if (typeof val === 'string') {
      val = val;
    } else if (typeof val === 'number') {
      val = `${val}`;
    } else if (typeof val === 'object') {
      val = JSON.stringify(val);
    } else {
      val = `${val}`;
    }

    const t = await this.get(key);
    if (t !== null) {
      db.run('UPDATE `values` SET `value` = ? WHERE `id` = ?', [val, key], (err) => {
        if (err) {
          console.error('Error updating record:', err.message);
        } else {
          if (key !== "time") console.log(`[DB] Updated ${key}`);
        }
      });
    } else {
      db.run('INSERT INTO `values` (id, value) VALUES (?, ?)', [key, val], (err) => {
        if (err) {
          console.error('Error inserting record:', err.message);
        } else {
          console.log(`[DB] Inserted ${key}`);
        }
      });
    }
    return true;
  },

  delete: function (key) {
    db.run('DELETE FROM `values` WHERE `id` = ?', [key], (err) => {
      if (err) {
        console.error('Error deleting record:', err.message);
      }
    });
    return true;
  }
};