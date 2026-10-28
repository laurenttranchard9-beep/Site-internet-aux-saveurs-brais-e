<?php
// Horaires du restaurant et commande à emporter en ligne (propres à WOK 888 ; le moteur de carte commun est dans api.php).
// La commande en ligne n'est proposée que pendant qu'un écran « Commandes en ligne » de l'espace de gestion est ouvert :
// il se signale toutes les 15 secondes, et sans signal la page propose d'appeler. Aucune commande ne peut arriver sans
// que quelqu'un la voie. Les prix sont toujours recalculés ici, à partir de la carte.

const TELEPHONE = '05 61 58 06 97';
const RECEPTION_DELAI = 75;                 // secondes sans signal de l'écran de réception : commande en ligne suspendue
const PREPARATION_MINUTES = 20;             // délai minimum entre la commande et le retrait
const CRENEAU_MINUTES = 15;                 // un créneau de retrait toutes les 15 minutes
const DERNIER_RETRAIT_MINUTES = 15;         // dernier retrait 15 minutes avant la fermeture
const LIGNES_MAX = 40;
const QUANTITE_MAX = 30;
const OPTIONS_MAX = 6;
const ENVOIS_PAR_HEURE = 5;                 // commandes par appareil et par heure
const COMMANDES_CONSERVATION = 92 * 86400;  // 3 mois, puis effacées avec le nom et le téléphone du client
const STATUTS = ['nouvelle', 'acceptee', 'prete', 'retiree', 'annulee'];
const STATUTS_EN_COURS = ['nouvelle', 'acceptee', 'prete'];
const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

// Horaires d'ouverture, heure de Paris : 0 = dimanche … 6 = samedi, créneaux [début, fin] en minutes depuis minuit.
// Si les horaires changent, modifier aussi index.html (tableau, pied de page et fiche Google).
function horaires(): array
{
    $journee = [[12 * 60, 22 * 60 + 30]];
    return [$journee, [], $journee, $journee, $journee, $journee, $journee];
}

function commandes_migrer(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS commandes (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            jour        TEXT NOT NULL,              -- date de la commande (heure de Paris), pour le numéro du jour
            numero      INTEGER NOT NULL,           -- 1, 2, 3… chaque jour
            cree_le     INTEGER NOT NULL,           -- horodatage Unix
            retrait     INTEGER NOT NULL,           -- heure de retrait choisie (horodatage)
            nom         TEXT NOT NULL,
            telephone   TEXT NOT NULL,
            note        TEXT NOT NULL DEFAULT '',
            articles    TEXT NOT NULL,              -- JSON : [{id, options, nom, details, quantite, prixCents}]
            total_cents INTEGER NOT NULL,
            statut      TEXT NOT NULL DEFAULT 'nouvelle',
            jeton       TEXT NOT NULL UNIQUE,       -- permet au client de suivre sa commande
            maj_le      INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_commandes_jour ON commandes(jour, numero);
        CREATE TABLE IF NOT EXISTS commandes_envois (
            empreinte TEXT NOT NULL,                -- empreinte de l'adresse IP (jamais l'adresse elle-même)
            quand     INTEGER NOT NULL
        );
    ");
}

// Heure de Paris. Les tests fixent l'heure avec la variable d'environnement WOK_MAINTENANT (horodatage).
function maintenant(): DateTimeImmutable
{
    $fixe = getenv('WOK_MAINTENANT');
    return (new DateTimeImmutable($fixe ? '@' . (int) $fixe : 'now'))->setTimezone(new DateTimeZone('Europe/Paris'));
}

function hm(int $minutes): string
{
    return intdiv($minutes, 60) . 'h' . str_pad((string) ($minutes % 60), 2, '0', STR_PAD_LEFT);
}

function heure_de(int $horodatage): string
{
    $t = (new DateTimeImmutable('@' . $horodatage))->setTimezone(new DateTimeZone('Europe/Paris'));
    return hm((int) $t->format('G') * 60 + (int) $t->format('i'));
}

// « Ouvert · jusqu'à 22h30 », « Fermé · ouvre demain à 12h00 »…
function statut_ouverture(DateTimeImmutable $t): array
{
    $h = horaires();
    $jour = (int) $t->format('w');
    $minutes = (int) $t->format('G') * 60 + (int) $t->format('i');
    foreach ($h[$jour] as [$debut, $fin]) {
        if ($minutes >= $debut && $minutes < $fin) {
            $texte = $fin - $minutes <= 30 ? 'Ferme bientôt · à ' . hm($fin) : "Ouvert · jusqu'à " . hm($fin);
            return ['ouvert' => true, 'texte' => $texte];
        }
    }
    for ($d = 0; $d <= 7; $d++) {
        $j = ($jour + $d) % 7;
        foreach ($h[$j] as [$debut]) {
            if ($d === 0 && $debut <= $minutes) continue;
            $quand = match ($d) {
                0 => 'à ' . hm($debut),
                1 => 'demain à ' . hm($debut),
                default => JOURS_FR[$j] . ' à ' . hm($debut),
            };
            return ['ouvert' => false, 'texte' => "Fermé · ouvre $quand"];
        }
    }
    return ['ouvert' => false, 'texte' => 'Fermé'];
}

// Créneaux de retrait du jour, au plus tôt 20 minutes après la commande.
function creneaux_retrait(DateTimeImmutable $t): array
{
    $plusTot = $t->getTimestamp() + PREPARATION_MINUTES * 60;
    $creneaux = [];
    foreach (horaires()[(int) $t->format('w')] as [$debut, $fin]) {
        for ($m = $debut + CRENEAU_MINUTES; $m <= $fin - DERNIER_RETRAIT_MINUTES; $m += CRENEAU_MINUTES) {
            // setTime plutôt que minuit + N secondes : juste aussi les jours de changement d'heure.
            $ts = $t->setTime(intdiv($m, 60), $m % 60)->getTimestamp();
            if ($ts >= $plusTot) $creneaux[] = ['valeur' => $ts, 'libelle' => hm($m)];
        }
    }
    return $creneaux;
}

function reglage(string $cle, string $defaut = ''): string
{
    $stmt = db()->prepare('SELECT value FROM settings WHERE key = ?');
    $stmt->execute([$cle]);
    $valeur = $stmt->fetchColumn();
    return $valeur === false ? $defaut : (string) $valeur;
}

function definir_reglage(string $cle, string $valeur): void
{
    db()->prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)')->execute([$cle, $valeur]);
}

// La commande en ligne est-elle possible maintenant ? Sinon, pourquoi.
function etat_commande(): array
{
    $t = maintenant();
    $creneaux = creneaux_retrait($t);
    $receptionVue = (int) reglage('reception_vue', '0');
    $raison = match (true) {
        reglage('commandes_actives', '1') !== '1' => 'desactivee',
        !$creneaux => 'fermee',
        $t->getTimestamp() - $receptionVue > RECEPTION_DELAI => 'reception',
        default => null,
    };
    return ['possible' => $raison === null, 'raison' => $raison, 'creneaux' => $raison === null ? $creneaux : []];
}

function message_indisponible(?string $raison): string
{
    return match ($raison) {
        'fermee' => "La commande en ligne ouvre aux heures d'ouverture du restaurant.",
        default => "La commande en ligne n'est pas disponible pour le moment.",
    } . ' Appelez-nous au ' . TELEPHONE . '.';
}

// État public : ouverture, jour de la semaine (pour le tableau des horaires) et commande en ligne.
function etat_public(): array
{
    $t = maintenant();
    return ['statut' => statut_ouverture($t), 'jour' => (int) $t->format('w'), 'commande' => etat_commande()];
}

// Clé de comparaison des étiquettes : minuscules, sans accents (« Supplément » = « supplement »).
function cle_texte(string $texte): string
{
    return strtr(mb_strtolower(trim($texte)), [
        'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ç' => 'c', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
        'î' => 'i', 'ï' => 'i', 'í' => 'i', 'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u', 'ú' => 'u',
        'œ' => 'oe', 'æ' => 'ae',
    ]);
}

function etiquettes(array $produit): array
{
    return array_values(array_filter(array_map('cle_texte', explode(',', $produit['tags'])), fn($t) => $t !== ''));
}

function produit_visible(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM products WHERE id = ? AND visible = 1');
    $stmt->execute([$id]);
    return $stmt->fetch() ?: null;
}

// Bases et suppléments proposés dans une catégorie (le wok à composer), par identifiant.
function options_categorie(int $categoryId): array
{
    static $cache = [];
    if (isset($cache[$categoryId])) return $cache[$categoryId];
    $stmt = db()->prepare('SELECT * FROM products WHERE category_id = ? AND visible = 1');
    $stmt->execute([$categoryId]);
    $options = ['base' => [], 'supplement' => []];
    foreach ($stmt as $p) {
        $tags = etiquettes($p);
        if (in_array('base', $tags, true)) $options['base'][(int) $p['id']] = $p;
        elseif (in_array('supplement', $tags, true)) $options['supplement'][(int) $p['id']] = $p;
    }
    return $cache[$categoryId] = $options;
}

// Vérifie le panier envoyé par le site et calcule les prix à partir de la carte.
// Renvoie [articles, total en centimes, quantités par produit (pour les stocks)].
function composer_articles(array $lignes): array
{
    $articles = [];
    $total = 0;
    $besoins = [];
    foreach ($lignes as $ligne) {
        if (!is_array($ligne)) fail(400, 'Commande mal formée.');
        $id = int_id($ligne['id'] ?? null);
        $quantite = $ligne['quantite'] ?? null;
        if (!is_int($quantite) || $quantite < 1 || $quantite > QUANTITE_MAX) fail(400, 'Quantité invalide.');
        $p = produit_visible($id);
        if (!$p) fail(409, "Un produit de votre commande n'est plus à la carte. Mettez la page à jour.");
        $tags = etiquettes($p);
        if (in_array('sur place', $tags, true)) fail(409, "« {$p['name']} » se déguste sur place : il n'est pas proposé à emporter.");
        if (in_array('base', $tags, true) || in_array('supplement', $tags, true)) fail(400, 'Commande mal formée.');
        if ($p['price_cents'] === null) fail(409, "Le prix de « {$p['name']} » est donné sur demande : commandez-le par téléphone au " . TELEPHONE . '.');

        $choix = $ligne['options'] ?? [];
        if (!is_array($choix) || count($choix) > OPTIONS_MAX) fail(400, 'Options invalides.');
        $choix = array_map('int_id', array_values($choix));
        if (count(array_unique($choix)) !== count($choix)) fail(400, 'Options invalides.');
        $proposees = options_categorie((int) $p['category_id']);
        $bases = array_values(array_filter($choix, fn($o) => isset($proposees['base'][$o])));
        $supplements = array_filter($choix, fn($o) => isset($proposees['supplement'][$o]));
        if (count($bases) + count($supplements) !== count($choix)) fail(409, "Une option de « {$p['name']} » n'est plus proposée. Mettez la page à jour.");
        if ($proposees['base'] && count($bases) !== 1) fail(400, "Choisissez une base pour « {$p['name']} ».");

        $prix = (int) $p['price_cents'];
        $details = [];
        $besoins[$id] = ($besoins[$id] ?? 0) + $quantite;
        foreach ([...$bases, ...$supplements] as $o) {
            $option = $proposees['base'][$o] ?? $proposees['supplement'][$o];
            $prix += (int) $option['price_cents'];
            $details[] = $option['name'];
            $besoins[$o] = ($besoins[$o] ?? 0) + $quantite;
        }
        $articles[] = [
            'id' => $id,
            'options' => [...$bases, ...array_values($supplements)],
            'nom' => $p['name'],
            'details' => implode(' · ', $details),
            'quantite' => $quantite,
            'prixCents' => $prix,
        ];
        $total += $prix * $quantite;
    }
    return [$articles, $total, $besoins];
}

// Retire les quantités commandées des stocks suivis ; refuse la commande s'il n'en reste pas assez.
function reserver_stocks(array $besoins): void
{
    $retirer = db()->prepare("UPDATE products SET stock = stock - ?, updated_at = datetime('now') WHERE id = ? AND stock IS NOT NULL AND stock >= ?");
    $lire = db()->prepare('SELECT name, stock FROM products WHERE id = ?');
    foreach ($besoins as $id => $n) {
        $retirer->execute([$n, $id, $n]);
        if ($retirer->rowCount()) continue;
        $lire->execute([$id]);
        $p = $lire->fetch();
        if ($p && $p['stock'] !== null) {
            $reste = (int) $p['stock'];
            fail(409, $reste === 0 ? "« {$p['name']} » est épuisé." : "Il ne reste que $reste « {$p['name']} ». Modifiez la quantité.");
        }
    }
}

function rendre_stocks(array $commande): void
{
    $rendre = db()->prepare("UPDATE products SET stock = stock + ?, updated_at = datetime('now') WHERE id = ? AND stock IS NOT NULL");
    foreach (json_decode($commande['articles'], true) as $a) {
        foreach ([$a['id'], ...$a['options']] as $id) $rendre->execute([$a['quantite'], $id]);
    }
}

// Au plus ENVOIS_PAR_HEURE commandes par appareil et par heure (contre les envois en rafale).
function limiter_envois(int $maintenant): void
{
    $pdo = db();
    $sel = reglage('commandes_sel');
    if ($sel === '') {
        $sel = bin2hex(random_bytes(16));
        definir_reglage('commandes_sel', $sel);
    }
    $empreinte = hash('sha256', $sel . '|' . client_ip());
    $pdo->prepare('DELETE FROM commandes_envois WHERE quand < ?')->execute([$maintenant - 3600]);
    $compte = $pdo->prepare('SELECT COUNT(*) FROM commandes_envois WHERE empreinte = ?');
    $compte->execute([$empreinte]);
    if ((int) $compte->fetchColumn() >= ENVOIS_PAR_HEURE) {
        fail(429, 'Trop de commandes envoyées depuis cet appareil. Appelez-nous au ' . TELEPHONE . '.');
    }
    $pdo->prepare('INSERT INTO commandes_envois (empreinte, quand) VALUES (?, ?)')->execute([$empreinte, $maintenant]);
}

function telephone_valide($valeur): string
{
    if (!is_string($valeur)) fail(400, 'Indiquez votre numéro de téléphone.');
    $n = preg_replace('/[\s.\-()]/', '', trim($valeur));
    if (preg_match('/^(?:\+33|0033)([1-9]\d{8})$/', $n, $m)) $n = '0' . $m[1];
    if (preg_match('/^0[1-9]\d{8}$/', $n)) return trim(chunk_split($n, 2, ' '));
    if (preg_match('/^\+[1-9]\d{7,14}$/', $n)) return $n;
    fail(400, 'Indiquez un numéro de téléphone valide, par exemple 06 12 34 56 78.');
}

function envoyer_commande(array $body): array
{
    // Champ invisible pour les personnes : rempli, c'est un robot.
    if (($body['site'] ?? '') !== '') fail(400, 'Commande refusée.');
    $etat = etat_commande();
    if (!$etat['possible']) fail(409, message_indisponible($etat['raison']), ['raison' => $etat['raison']]);
    $nom = text_field($body['nom'] ?? null, 'nom', 2, 60);
    $telephone = telephone_valide($body['telephone'] ?? null);
    $note = text_field($body['note'] ?? '', 'précisions', 0, 300);
    $retrait = $body['retrait'] ?? null;
    if (!is_int($retrait) || !in_array($retrait, array_column($etat['creneaux'], 'valeur'), true)) {
        fail(409, "Cette heure de retrait n'est plus disponible : choisissez-en une autre.", ['creneaux' => $etat['creneaux']]);
    }
    $lignes = $body['articles'] ?? null;
    if (!is_array($lignes) || !$lignes || !array_is_list($lignes)) fail(400, 'Votre commande est vide.');
    if (count($lignes) > LIGNES_MAX) fail(400, 'Votre commande contient trop de lignes : appelez-nous au ' . TELEPHONE . '.');

    $t = maintenant();
    return transaction(function () use ($lignes, $nom, $telephone, $note, $retrait, $t) {
        [$articles, $total, $besoins] = composer_articles($lignes);
        reserver_stocks($besoins);
        limiter_envois($t->getTimestamp());
        $pdo = db();
        $jour = $t->format('Y-m-d');
        $suivant = $pdo->prepare('SELECT COALESCE(MAX(numero), 0) + 1 FROM commandes WHERE jour = ?');
        $suivant->execute([$jour]);
        $numero = (int) $suivant->fetchColumn();
        $jeton = bin2hex(random_bytes(16));
        $pdo->prepare(
            'INSERT INTO commandes (jour, numero, cree_le, retrait, nom, telephone, note, articles, total_cents, jeton, maj_le)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        )->execute([$jour, $numero, $t->getTimestamp(), $retrait, $nom, $telephone, $note,
            json_encode($articles, JSON_UNESCAPED_UNICODE), $total, $jeton, $t->getTimestamp()]);
        return ['numero' => $numero, 'jeton' => $jeton, 'retrait' => $retrait, 'retraitTexte' => heure_de($retrait), 'totalCents' => $total];
    });
}

function commande_par(string $colonne, $valeur): ?array
{
    $stmt = db()->prepare("SELECT * FROM commandes WHERE $colonne = ?");
    $stmt->execute([$valeur]);
    return $stmt->fetch() ?: null;
}

function articles_publics(array $c): array
{
    return array_map(fn($a) => [
        'nom' => $a['nom'], 'details' => $a['details'], 'quantite' => $a['quantite'], 'prixCents' => $a['prixCents'],
    ], json_decode($c['articles'], true));
}

// Ce que voit le client qui suit sa commande (ni le téléphone, ni les précisions).
function commande_publique(array $c): array
{
    return [
        'numero' => (int) $c['numero'],
        'statut' => $c['statut'],
        'retrait' => (int) $c['retrait'],
        'retraitTexte' => heure_de((int) $c['retrait']),
        'articles' => articles_publics($c),
        'totalCents' => (int) $c['total_cents'],
    ];
}

function suivi_commande($jeton): array
{
    $c = is_string($jeton) && preg_match('/^[a-f0-9]{32}$/', $jeton) ? commande_par('jeton', $jeton) : null;
    if (!$c) fail(404, 'Commande introuvable.');
    return commande_publique($c);
}

function commande_gestion(array $c): array
{
    return commande_publique($c) + [
        'id' => (int) $c['id'],
        'nom' => $c['nom'],
        'telephone' => $c['telephone'],
        'note' => $c['note'],
        'creeLe' => (int) $c['cree_le'],
        'creeTexte' => heure_de((int) $c['cree_le']),
    ];
}

// Écran « Commandes en ligne » : chaque lecture signale que quelqu'un regarde les commandes.
function liste_commandes(): array
{
    $t = maintenant();
    $pdo = db();
    definir_reglage('reception_vue', (string) $t->getTimestamp());
    $pdo->prepare('DELETE FROM commandes WHERE cree_le < ?')->execute([$t->getTimestamp() - COMMANDES_CONSERVATION]);
    $stmt = $pdo->prepare("SELECT * FROM commandes WHERE jour = ? OR statut IN ('nouvelle', 'acceptee', 'prete') ORDER BY retrait, id");
    $stmt->execute([$t->format('Y-m-d')]);
    return [
        'commandes' => array_map('commande_gestion', $stmt->fetchAll()),
        'actives' => reglage('commandes_actives', '1') === '1',
        'etat' => etat_commande(),
        'maintenant' => $t->getTimestamp(), // l'écran calcule les retards à l'heure du serveur, pas à celle de la tablette
    ];
}

function changer_statut(array $body): array
{
    $id = int_id($body['id'] ?? null);
    $statut = $body['statut'] ?? null;
    if (!in_array($statut, STATUTS, true)) fail(400, 'Statut inconnu.');
    return transaction(function () use ($id, $statut) {
        $c = commande_par('id', $id);
        if (!$c) fail(404, 'Commande introuvable.');
        if ($c['statut'] === 'annulee' && $statut !== 'annulee') fail(409, 'Cette commande a été annulée.');
        if ($statut === 'annulee' && $c['statut'] !== 'annulee') rendre_stocks($c);
        db()->prepare('UPDATE commandes SET statut = ?, maj_le = ? WHERE id = ?')->execute([$statut, maintenant()->getTimestamp(), $id]);
        return commande_gestion(commande_par('id', $id));
    });
}

function changer_reglages(array $body): array
{
    if (!is_bool($body['actives'] ?? null)) fail(400, 'Réglage invalide.');
    definir_reglage('commandes_actives', $body['actives'] ? '1' : '0');
    return ['actives' => $body['actives'], 'etat' => etat_commande()];
}
