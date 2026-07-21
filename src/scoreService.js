export async function incrementUserScore(db, userId) {
  if (!db || !userId) {
    return false
  }

  await db
    .prepare('UPDATE Users SET score = score + 1 WHERE id = ?1')
    .bind(userId)
    .run()

  return true
}
