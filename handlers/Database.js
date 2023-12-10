const mysql = require('mysql2');
const con = mysql.createConnection({
    host: "us-phx-1.halex.gg",
    user: "tazorUser",
    password: "3986234dljfdsj3872",
    database: "tazor"
});

con.connect(function (err) {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
    } else {
        console.log('Connected to MySQL');
        con.query('CREATE TABLE IF NOT EXISTS `values` (id TEXT, value TEXT);', async function (err, result) {
            if (err) {
                console.error('Error creating table:', err.message);
            } else {
                console.log('Database is working');
            }
        });
    }
});

module.exports = {
    get: async function (id) {
        return new Promise(resolve => {
            con.query('SELECT value FROM `values` WHERE `id` = ?;', [id], function (err, result) {
                if (err) {
                    console.error('Error executing SELECT query:', err.message);
                    return resolve(null);
                }

                if (result.length < 1) return resolve(null);

                let val = result[0].value;

                try {
                    val = JSON.parse(val);
                } catch {
                    val = result[0].value;
                }

                return resolve(val);
            });
        });
    },
    set: async function (key, val) {
        if (typeof val == 'string') {
            val = val;
        } else if (typeof val == 'number') {
            val = `${val}`;
        } else if (typeof val == 'object') {
            val = JSON.stringify(val);
        } else {
            val = `${val}`;
        }

        let t = await this.get(`${key}`);
        if (t !== null) {
            con.query('UPDATE `values` SET `value` = ? WHERE `id` = ?;', [val, key], function (err, result) {
                if (err) {
                    console.error('Error updating record:', err.message);
                } else {
                    if (key !== "time") console.log(`[DB] Updated ${key}`);
                }
            });
        } else {
            con.query('INSERT INTO `values` (id,value) VALUES (?,?)', [key, val], function (err, result) {
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
        con.query('DELETE FROM `values` WHERE `id` = ?;', [key], function (err, result) {
            if (err) {
                console.error('Error deleting record:', err.message);
            }
        });
        return true;
    }
};
