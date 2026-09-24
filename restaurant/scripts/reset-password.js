// Réinitialise (ou crée) le compte administrateur.
// Usage : npm run reset-password -- <identifiant> <nouveau-mot-de-passe>
const { openDatabase } = require("../db");
const { hashPassword } = require("../auth");

const [username, password] = process.argv.slice(2);
if (!username || !password || password.length < 10) {
  console.error("Usage : npm run reset-password -- <identifiant> <mot-de-passe d'au moins 10 caractères>");
  process.exit(1);
}

const db = openDatabase();
const hash = hashPassword(password);
const user = db.prepare("SELECT id FROM users WHERE username = ?").get(username);
if (user) {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
  console.log(`Mot de passe de « ${username} » mis à jour. Toutes ses sessions ont été fermées.`);
} else {
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hash);
  console.log(`Compte « ${username} » créé.`);
}
