<?php
// Horaires et commande à emporter en ligne de WOK 888 (voir inc/commandes.php).
// Public :   GET  commande.php?action=etat | suivi&jeton=…    POST commande.php?action=envoyer
// Gestion :  GET  commande.php?action=liste                     POST commande.php?action=statut | reglages

declare(strict_types=1);

require __DIR__ . '/inc/db.php';
require __DIR__ . '/inc/auth.php';
require __DIR__ . '/inc/commandes.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

// Mêmes outils que api.php (inc/auth.php s'en sert aussi).
class HttpError extends Exception
{
    public function __construct(public int $status, string $message, public array $extra = [])
    {
        parent::__construct($message);
    }
}

function fail(int $status, string $message, array $extra = []): never
{
    throw new HttpError($status, $message, $extra);
}

function text_field($value, string $field, int $min, int $max): string
{
    if (!is_string($value)) fail(400, "Le champ « $field » est invalide.");
    $v = trim($value);
    if (mb_strlen($v) < $min) fail(400, "Le champ « $field » est obligatoire.");
    if (mb_strlen($v) > $max) fail(400, "Le champ « $field » dépasse $max caractères.");
    return $v;
}

function int_id($value): int
{
    if (is_string($value) && ctype_digit($value)) $value = (int) $value;
    if (!is_int($value) || $value <= 0) fail(400, 'Identifiant invalide.');
    return $value;
}

function transaction(callable $fn)
{
    $pdo = db();
    $pdo->beginTransaction();
    try {
        $result = $fn();
        $pdo->commit();
        return $result;
    } catch (Throwable $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handle(string $method, string $action, array $body): array
{
    commandes_migrer(db());
    switch ("$method $action") {
        case 'GET etat':
            return etat_public();
        case 'POST envoyer':
            return envoyer_commande($body);
        case 'GET suivi':
            return suivi_commande($_GET['jeton'] ?? null);
    }

    // Écran de réception : connexion requise
    require_user();
    switch ("$method $action") {
        case 'GET liste':
            return liste_commandes();
        case 'POST statut':
            return changer_statut($body);
        case 'POST reglages':
            return changer_reglages($body);
    }
    fail(404, 'Action inconnue.');
}

// ---------- Point d'entrée ----------
try {
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if (!in_array($method, ['GET', 'POST'], true)) fail(405, 'Méthode non autorisée.');
    $action = is_string($_GET['action'] ?? null) ? $_GET['action'] : '';
    $body = [];
    if ($method === 'POST') {
        // Exiger du JSON empêche un autre site d'envoyer des formulaires à la place du client ou du restaurant.
        if (!str_starts_with($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) fail(415, 'Requête mal formée.');
        $raw = file_get_contents('php://input', false, null, 0, 20000);
        $body = $raw === '' ? [] : json_decode($raw, true);
        if (!is_array($body)) fail(400, 'Requête mal formée.');
    }
    echo json_encode(handle($method, $action, $body), JSON_UNESCAPED_UNICODE);
} catch (HttpError $e) {
    http_response_code($e->status);
    echo json_encode(['error' => $e->getMessage()] + $e->extra, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    error_log('[commande] ' . $e);
    http_response_code(500);
    echo json_encode(['error' => 'Erreur interne du serveur.'], JSON_UNESCAPED_UNICODE);
}
