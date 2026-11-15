// Only server-validated session hashes reach these functions; HTTP mutations must also pass CSRF.
async function recordActivity(db, sessionHash) {
  const result = await db.query(`
    UPDATE users u SET last_active_at = statement_timestamp()
    FROM sessions s
    WHERE s.id_hash = $1 AND s.user_id = u.id
      AND s.expires_at > statement_timestamp()
      AND u.last_active_at > statement_timestamp() - INTERVAL '168 hours'
    RETURNING u.id`, [sessionHash]);
  return result.rows.length === 1;
}

async function deleteOwnAccount(db, sessionHash, confirmed) {
  if (confirmed !== true) return false;
  const result = await db.query(`
    DELETE FROM users u USING sessions s
    WHERE s.id_hash = $1 AND s.user_id = u.id
      AND s.expires_at > statement_timestamp()
      AND s.authenticated_at >= statement_timestamp() - INTERVAL '5 minutes'
      AND s.authenticated_at <= statement_timestamp()
      AND u.last_active_at > statement_timestamp() - INTERVAL '168 hours'
    RETURNING u.id`, [sessionHash]);
  return result.rows.length === 1;
}

async function countInactiveAccounts(db) {
  const result = await db.query(`SELECT COUNT(*)::integer AS count FROM users
    WHERE last_active_at <= statement_timestamp() - INTERVAL '168 hours'`);
  return result.rows[0].count;
}

async function deleteInactiveAccounts(db) {
  // Lock candidates so simultaneous activity/cleanup cannot delete from a stale application-side list.
  const result = await db.query(`
    DELETE FROM users WHERE id IN (
      SELECT id FROM users
      WHERE last_active_at <= statement_timestamp() - INTERVAL '168 hours'
      ORDER BY last_active_at, id LIMIT 100
      FOR UPDATE SKIP LOCKED
    ) AND last_active_at <= statement_timestamp() - INTERVAL '168 hours'
    RETURNING id`);
  return result.rows.length;
}

module.exports = { recordActivity, deleteOwnAccount, countInactiveAccounts, deleteInactiveAccounts };
