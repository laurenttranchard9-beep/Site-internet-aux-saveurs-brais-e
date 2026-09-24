const crypto = require("node:crypto");

const SESSION_COOKIE = "asb_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 h
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// --- Mots de passe (scrypt, sel aléatoire) ---
function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

function verifyPassword(password, stored) {
  const [scheme, saltHex, hashHex] = String(stored).split("$");
  if (scheme !== "scrypt" || !saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, "hex");
  const actual = crypto.scryptSync(password, Buffer.from(saltHex, "hex"), expected.length);
  return crypto.timingSafeEqual(expected, actual);
}

// Un hash factice pour que la vérification prenne le même temps quand l'identifiant n'existe pas.
const DUMMY_HASH = hashPassword(crypto.randomBytes(16).toString("hex"));

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

function parseCookies(header = "") {
  const out = {};
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function createAuth(db, { secureCookies = false } = {}) {
  const q = {
    userByName: db.prepare("SELECT * FROM users WHERE username = ?"),
    userById: db.prepare("SELECT id, username FROM users WHERE id = ?"),
    passwordHash: db.prepare("SELECT password_hash FROM users WHERE id = ?"),
    setPassword: db.prepare("UPDATE users SET password_hash = ? WHERE id = ?"),
    insertSession: db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)"),
    session: db.prepare("SELECT user_id, expires_at FROM sessions WHERE token_hash = ?"),
    deleteSession: db.prepare("DELETE FROM sessions WHERE token_hash = ?"),
    deleteUserSessions: db.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash != ?"),
    purgeExpired: db.prepare("DELETE FROM sessions WHERE expires_at < ?"),
  };

  // Limitation des tentatives de connexion, par adresse IP.
  const failures = new Map();
  const isLocked = (ip) => {
    const f = failures.get(ip);
    if (!f) return false;
    if (Date.now() - f.first > LOCKOUT_MS) {
      failures.delete(ip);
      return false;
    }
    return f.count >= MAX_FAILED_LOGINS;
  };
  const recordFailure = (ip) => {
    const f = failures.get(ip);
    if (!f || Date.now() - f.first > LOCKOUT_MS) failures.set(ip, { count: 1, first: Date.now() });
    else f.count++;
  };

  const cookie = (value, maxAgeSec) =>
    `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}` +
    (secureCookies ? "; Secure" : "");

  function login(req, res) {
    const ip = req.ip;
    if (isLocked(ip)) {
      return res.status(429).json({ error: "Trop de tentatives. Réessayez dans 15 minutes." });
    }
    const { username, password } = req.body || {};
    if (typeof username !== "string" || typeof password !== "string" || !username || !password) {
      return res.status(400).json({ error: "Identifiant et mot de passe requis." });
    }
    const user = q.userByName.get(username.trim());
    const ok = verifyPassword(password, user ? user.password_hash : DUMMY_HASH) && !!user;
    if (!ok) {
      recordFailure(ip);
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect." });
    }
    failures.delete(ip);
    q.purgeExpired.run(Date.now());
    const token = crypto.randomBytes(32).toString("hex");
    q.insertSession.run(sha256(token), user.id, Date.now() + SESSION_TTL_MS);
    res.setHeader("Set-Cookie", cookie(token, SESSION_TTL_MS / 1000));
    res.json({ username: user.username });
  }

  function currentSession(req) {
    const token = parseCookies(req.headers.cookie)[SESSION_COOKIE];
    if (!token) return null;
    const tokenHash = sha256(token);
    const s = q.session.get(tokenHash);
    if (!s) return null;
    if (s.expires_at < Date.now()) {
      q.deleteSession.run(tokenHash);
      return null;
    }
    const user = q.userById.get(s.user_id);
    return user ? { user, tokenHash } : null;
  }

  function requireAuth(req, res, next) {
    const s = currentSession(req);
    if (!s) return res.status(401).json({ error: "Session expirée. Merci de vous reconnecter." });
    req.user = s.user;
    req.tokenHash = s.tokenHash;
    next();
  }

  function logout(req, res) {
    const s = currentSession(req);
    if (s) q.deleteSession.run(s.tokenHash);
    res.setHeader("Set-Cookie", cookie("", 0));
    res.json({ ok: true });
  }

  function changePassword(req, res) {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ error: "Champs manquants." });
    }
    const { password_hash } = q.passwordHash.get(req.user.id);
    if (!verifyPassword(currentPassword, password_hash)) {
      return res.status(400).json({ error: "Le mot de passe actuel est incorrect." });
    }
    if (newPassword.length < 10) {
      return res.status(400).json({ error: "Le nouveau mot de passe doit faire au moins 10 caractères." });
    }
    q.setPassword.run(hashPassword(newPassword), req.user.id);
    q.deleteUserSessions.run(req.user.id, req.tokenHash); // déconnecte les autres appareils
    res.json({ ok: true });
  }

  return { login, logout, requireAuth, currentSession, changePassword };
}

// Crée le compte administrateur au premier démarrage.
function ensureAdmin(db, log = console.log) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM users").get();
  if (n > 0) return;
  const username = process.env.ADMIN_USER || "admin";
  let password = process.env.ADMIN_PASSWORD;
  const generated = !password;
  if (generated) password = crypto.randomBytes(9).toString("base64url");
  db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)").run(username, hashPassword(password));
  log(`\n[admin] Compte créé : identifiant « ${username} »`);
  if (generated) {
    log(`[admin] Mot de passe généré : ${password}`);
    log("[admin] Notez-le maintenant, puis changez-le depuis l'espace de gestion.\n");
  }
}

module.exports = { createAuth, ensureAdmin, hashPassword, verifyPassword };
