//= laz r
//= 02-23-2026 15:23
//= database.js

//= Dependencies =//
import Database from "better-sqlite3";
import { createClient } from '@libsql/client';

function initDB(database) {
    const db = new Database(`${database}.db`);
    db.prepare(`
        CREATE TABLE IF NOT EXISTS event_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volume INTEGER NOT NULL,
            l_frequency DOUBLE NOT NULL,
            m_frequency DOUBLE NOT NULL,
            h_frequency DOUBLE NOT NULL,
            pain TINYINT NOT NULL,
            dull TINYINT NOT NULL,
            env_tags VARCHAR(999) NOT NULL DEFAULT "",
            env_dB INTEGER NOT NULL,
            date_added DATETIME NOT NULL,
            date_modified DATETIME NOT NULL
        )`
    ).run();
    console.log(`Table ${database}:event_data ready. `);

    db.prepare(`
        CREATE TABLE IF NOT EXISTS PT_gain (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volume INTEGER NOT NULL,
            l_frequency DOUBLE NOT NULL,
            m_frequency DOUBLE NOT NULL,
            h_frequency DOUBLE NOT NULL,
            date_added DATETIME NOT NULL
        )`
    ).run();
    console.log(`Table ${database}:PT_gain ready. `);

    db.prepare(`
        CREATE TABLE IF NOT EXISTS CB_gain (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            volume INTEGER NOT NULL,
            l_frequency DOUBLE NOT NULL,
            m_frequency DOUBLE NOT NULL,
            h_frequency DOUBLE NOT NULL,
            date_added DATETIME NOT NULL
        )`
    ).run();
    console.log(`Table ${database}:CB_gain ready. `);

    return db;
}

export function connectToDatabase(database) {
    const sqlite = initDB(database);

    return {
        listEvents() {
            return sqlite.prepare("SELECT * FROM event_data").all();
        },

        getItem(id) {
            return sqlite.prepare(
                "SELECT * FROM event_data WHERE id = ?"
            ).get(id);
        },

        createItem(volume, l_frequency, m_frequency, h_frequency, pain,
            dull, env_tags, env_dB, date_added, date_modified) {
            return sqlite.prepare(
                `INSERT INTO event_data (
                    volume, l_frequency, m_frequency, h_frequency, pain,
                    dull, env_tags, env_dB, date_added, date_modified) 
                VALUES (
                    ?, ?, ?, ?, ?,
                    ?, ?, ?, ?, ?)`
            ).run(volume, l_frequency, m_frequency, h_frequency, pain,
                dull, env_tags, env_dB, date_added, date_modified);
        },

        updateItem(id, volume, l_frequency, m_frequency, h_frequency,
            pain, dull, env_tags, env_dB, date_added, date_modified) {
            return sqlite.prepare(
                `UPDATE event_data 
                    SET volume = ?, l_frequency = ?, m_frequency = ?,
                    h_frequency = ?, pain = ?, dull = ?,
                    env_tags = ?, env_dB = ?, date_added = ?, date_modified = ?
                WHERE id = ?`
            ).run(volume, l_frequency, m_frequency, h_frequency,
                pain, dull, env_tags, env_dB, date_added, date_modified, id);
        },

        deleteItem(id) {
            return sqlite.prepare(
                "DELETE FROM event_data WHERE id = ?"
            ).run(id);
        }
    };
}