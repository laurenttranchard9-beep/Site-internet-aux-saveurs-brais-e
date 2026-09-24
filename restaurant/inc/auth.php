<?php
// Connexion à l'espace de gestion : sessions PHP, mots de passe chiffrés, limitation des tentatives.

const SESSION_TTL = 8 * 3600;       // 8 h
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_SECONDS = 15 * 60;
const MIN_PASSWORD_LENGTH = 10;
// Déposer ce fichier dans data/ (par FTP ou le gestionnaire de fichiers de l'hébergeur)
// permet de recréer le compte administrateur en cas de mot de passe oublié.
function reset_file(): string
{
    return dirname(db_file()) . '/reinitialiser.txt';
}

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) return;
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name('ASBSESSID');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');
    ini_set('session.gc_maxlifetime', (string) SESSION_TTL);
    session_start();
}

function current_user(): ?array
{
    start_session();
    $s = $_SESSION['auth'] ?? null;
    if (!$s) return null;
    if (time() - $s['login_at'] > SESSION_TTL) {
        logout();
        return null;
    }
    $stmt = db()->prepare('SELECT id, username, password_changed_at FROM users WHERE id = ?');
    $stmt->execute([$s['user_id']]);
    $user = $stmt->fetch();
    // Mot de passe changé depuis un autre appareil : cette session n'est plus valable.
    if (!$user || (int) $user['password_changed_at'] !== $s['pw_version']) {
        logout();
        return null;
    }
    return $user;
}

function require_user(): array
{
    $user = current_user();
    if (!$user) fail(401, 'Session expirée. Merci de vous reconnecter.');
    return $user;
}

function open_session_for(array $user): void
{
    start_session();
    session_regenerate_id(true);
    $_SESSION['auth'] = [
        'user_id' => (int) $user['id'],
        'login_at' => time(),
        'pw_version' => (int) $user['password_changed_at'],
    ];
}

function logout(): void
{
    start_session();
    $_SESSION = [];
    session_regenerate_id(true);
}

function client_ip(): string
{
    return $_SERVER['REMOTE_ADDR'] ?? 'inconnue';
}

function login(array $body): array
{
    $pdo = db();
    $ip = client_ip();
    $pdo->prepare('DELETE FROM login_failures WHERE failed_at < ?')->execute([time() - LOCKOUT_SECONDS]);
    $count = $pdo->prepare('SELECT COUNT(*) FROM login_failures WHERE ip = ?');
    $count->execute([$ip]);
    if ((int) $count->fetchColumn() >= MAX_FAILED_LOGINS) {
        fail(429, 'Trop de tentatives. Réessayez dans 15 minutes.');
    }

    $username = $body['username'] ?? null;
    $password = $body['password'] ?? null;
    if (!is_string($username) || !is_string($password) || $username === '' || $password === '') {
        fail(400, 'Identifiant et mot de passe requis.');
    }
    $stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
    $stmt->execute([trim($username)]);
    $user = $stmt->fetch();
    // Vérifie toujours un hash, même si l'identifiant n'existe pas, pour ne pas le révéler par le temps de réponse.
    $hash = $user['password_hash'] ?? password_hash(random_bytes(16), PASSWORD_DEFAULT);
    if (!password_verify($password, $hash) || !$user) {
        $pdo->prepare('INSERT INTO login_failures (ip, failed_at) VALUES (?, ?)')->execute([$ip, time()]);
        fail(401, 'Identifiant ou mot de passe incorrect.');
    }
    $pdo->prepare('DELETE FROM login_failures WHERE ip = ?')->execute([$ip]);
    open_session_for($user);
    return ['username' => $user['username']];
}

function needs_setup(): bool
{
    return (int) db()->query('SELECT COUNT(*) FROM users')->fetchColumn() === 0 || file_exists(reset_file());
}

// Création du compte administrateur : au premier lancement, ou après dépôt du fichier de réinitialisation.
function setup_admin(array $body): array
{
    if (!needs_setup()) fail(403, 'Le compte administrateur existe déjà.');
    $username = text_field($body['username'] ?? null, 'identifiant', 1, 40);
    $password = $body['password'] ?? null;
    if (!is_string($password) || mb_strlen($password) < MIN_PASSWORD_LENGTH) {
        fail(400, 'Le mot de passe doit faire au moins ' . MIN_PASSWORD_LENGTH . ' caractères.');
    }
    $pdo = db();
    $pdo->beginTransaction();
    $pdo->exec('DELETE FROM users');
    $pdo->prepare('INSERT INTO users (username, password_hash, password_changed_at) VALUES (?, ?, ?)')
        ->execute([$username, password_hash($password, PASSWORD_DEFAULT), time()]);
    $id = (int) $pdo->lastInsertId();
    // Le fichier de réinitialisation doit disparaître, sinon n'importe qui pourrait recommencer.
    if (file_exists(reset_file()) && !@unlink(reset_file())) {
        $pdo->rollBack();
        fail(500, 'Impossible de supprimer data/reinitialiser.txt. Supprimez-le à la main puis recommencez.');
    }
    $pdo->commit();
    $stmt = $pdo->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$id]);
    open_session_for($stmt->fetch());
    return ['username' => $username];
}

function change_password(array $user, array $body): array
{
    $current = $body['currentPassword'] ?? null;
    $new = $body['newPassword'] ?? null;
    if (!is_string($current) || !is_string($new)) fail(400, 'Champs manquants.');
    $stmt = db()->prepare('SELECT * FROM users WHERE id = ?');
    $stmt->execute([$user['id']]);
    $row = $stmt->fetch();
    if (!password_verify($current, $row['password_hash'])) fail(400, 'Le mot de passe actuel est incorrect.');
    if (mb_strlen($new) < MIN_PASSWORD_LENGTH) {
        fail(400, 'Le nouveau mot de passe doit faire au moins ' . MIN_PASSWORD_LENGTH . ' caractères.');
    }
    // time() seul pourrait ne pas changer si deux changements ont lieu dans la même seconde.
    $version = max(time(), (int) $row['password_changed_at'] + 1);
    db()->prepare('UPDATE users SET password_hash = ?, password_changed_at = ? WHERE id = ?')
        ->execute([password_hash($new, PASSWORD_DEFAULT), $version, $user['id']]);
    $row['password_changed_at'] = $version;
    open_session_for($row); // garde cet appareil connecté, déconnecte les autres
    return ['ok' => true];
}
