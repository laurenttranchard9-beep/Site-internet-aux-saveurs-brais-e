#!/bin/bash
# Installe (ou met à jour) les sites sur un serveur Amazon Linux 2023, accessibles par l'adresse IP :
#   http://IP/restaurant/   Aux Saveurs Braisées (carte et espace de gestion)
#   http://IP/fleur-dor/    La Fleur d'Or (site et panneau d'administration)
#   http://IP/toilettage/   le salon de toilettage
#
# Installation ou mise à jour, en une commande sur le serveur :
#   curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/installer-amazon-linux.sh | sudo bash
#
# Relancer la même commande met les sites à jour depuis GitHub sans toucher aux données :
# base du restaurant (produits, stocks, compte), carte et mot de passe de La Fleur d'Or.

# shellcheck disable=SC2016 # le code PHP entre apostrophes utilise ses propres variables ($argv)
set -euo pipefail

GITHUB=https://github.com/laurenttranchard9-beep
SAVEURS_DEPOT="$GITHUB/Site-internet-aux-saveurs-brais-e.git"
SAVEURS_BRANCHE=claude/pet-grooming-landing-page-po26m7
FLEUR_DEPOT="$GITHUB/Fleur-d-or.git"
FLEUR_BRANCHE=claude/practical-mendel-dpj572

SOURCES=${SOURCES:-/opt/sites}
WEB=${WEB:-/var/www/html}
WEB_USER=${WEB_USER:-apache}

etape() { echo; echo "==> $*"; }

# ---------- Code source ----------

# Clone le dépôt, ou le met à jour s'il est déjà là.
recuperer() { # dépôt, branche, dossier
    if [ -d "$3/.git" ]; then
        git -C "$3" fetch -q --depth 1 origin "$2"
        git -C "$3" reset -q --hard FETCH_HEAD
    else
        rm -rf "$3"
        git clone -q --depth 1 --branch "$2" "$1" "$3"
    fi
}

# ---------- Déploiement ----------

deployer_restaurant() {
    local src="$SOURCES/aux-saveurs-braisees/restaurant" dst="$WEB/restaurant"
    mkdir -p "$dst"
    # Les fichiers exclus (base de données, fichier de réinitialisation) ne sont jamais écrasés ni supprimés.
    rsync -a --delete \
        --exclude 'data/*.sqlite*' \
        --exclude 'data/reinitialiser.txt' \
        "$src/" "$dst/"
    chown -R "$WEB_USER:$WEB_USER" "$dst/data"
    selinux_ecriture "$dst/data"
}

deployer_toilettage() {
    local src="$SOURCES/aux-saveurs-braisees" dst="$WEB/toilettage"
    mkdir -p "$dst"
    cp "$src/index.html" "$src/styles.css" "$src/script.js" "$dst/"
}

deployer_fleur() {
    local src="$SOURCES/fleur-dor" dst="$WEB/fleur-dor"
    mkdir -p "$dst"
    # Le panneau d'administration réécrit index.html et le dossier donnees/ : ils ne sont pas écrasés.
    rsync -a --delete \
        --exclude '/.git/' --exclude '/.claude/' --exclude '/.agents/' --exclude '/.impeccable/' \
        --exclude '/.mcp.json' --exclude '/skills-lock.json' \
        --exclude '/donnees/' --exclude '/index.html' --exclude '/.index.html.*.tmp' \
        "$src/" "$dst/"
    # Première installation : la carte d'origine. Ensuite, la carte modifiée dans le panneau est conservée.
    mkdir -p "$dst/donnees"
    rsync -a --ignore-existing "$src/donnees/" "$dst/donnees/"
    [ -f "$dst/index.html" ] || cp "$src/index.html" "$dst/index.html"
    # Le panneau doit pouvoir réécrire index.html (fichier temporaire dans le dossier, puis renommage).
    chown "$WEB_USER:$WEB_USER" "$dst" "$dst/index.html"
    chown -R "$WEB_USER:$WEB_USER" "$dst/donnees"
    selinux_ecriture "$dst/donnees"
    selinux_ecriture "$dst/index.html"
    # Régénère la page avec le gabarit à jour et la carte actuelle.
    en_tant_que_web php "$dst/admin/publier.php"
}

selinux_ecriture() {
    if command -v selinuxenabled >/dev/null 2>&1 && selinuxenabled; then
        chcon -R -t httpd_sys_rw_content_t "$1"
    fi
}

en_tant_que_web() {
    runuser -u "$WEB_USER" -- "$@"
}

page_accueil() {
    cat > "$WEB/index.html" <<'HTML'
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Nos sites</title>
<style>
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: system-ui, sans-serif; background: #f6f3ef; color: #221c18; }
  main { width: min(420px, 100% - 32px); display: grid; gap: 14px; }
  h1 { margin: 0 0 6px; font-size: 1.5rem; text-align: center; }
  a { display: block; padding: 18px 20px; border-radius: 14px; background: #fff; border: 1px solid #e6ddd3; text-decoration: none; color: inherit; font-weight: 600; }
  a:hover { border-color: #e8590c; }
  small { display: block; font-weight: 400; color: #76695f; margin-top: 4px; }
</style>
</head>
<body>
<main>
  <h1>Nos sites</h1>
  <a href="restaurant/">Aux Saveurs Braisées<small>La carte du restaurant</small></a>
  <a href="fleur-dor/">La Fleur d'Or<small>Restaurant asiatique à Grenade</small></a>
  <a href="toilettage/">Bulles &amp; Moustaches<small>Le salon de toilettage</small></a>
</main>
</body>
</html>
HTML
}

configurer_apache() {
    # Autorise les fichiers .htaccess, qui protègent les données et les fichiers internes des sites.
    cat > /etc/httpd/conf.d/sites.conf <<'CONF'
<Directory "/var/www/html">
    AllowOverride All
    Require all granted
</Directory>
CONF
    apachectl configtest
    systemctl enable -q --now php-fpm httpd
    systemctl restart php-fpm httpd
}

# ---------- Comptes d'administration ----------

terminal_disponible() {
    (exec </dev/tty) 2>/dev/null
}

# Demande un mot de passe deux fois ; le résultat est dans MDP.
demander_mdp() { # libellé
    local a b
    while true; do
        read -r -s -p "$1 (10 caractères minimum) : " a </dev/tty; echo >/dev/tty
        if [ "${#a}" -lt 10 ]; then echo "   Trop court, recommencez." >/dev/tty; continue; fi
        read -r -s -p "   Confirmez : " b </dev/tty; echo >/dev/tty
        [ "$a" = "$b" ] && break
        echo "   Les deux mots de passe sont différents, recommencez." >/dev/tty
    done
    MDP=$a
}

compte_restaurant_existe() {
    [ "$(en_tant_que_web php -r 'require $argv[1]; echo (int) db()->query("SELECT COUNT(*) FROM users")->fetchColumn();' \
        "$WEB/restaurant/inc/db.php")" != 0 ]
}

creer_compte_restaurant() { # identifiant, mot de passe (lus sur l'entrée standard)
    printf '%s\n%s' "$1" "$2" | en_tant_que_web php -r '
        require $argv[1];
        $u = trim((string) fgets(STDIN));
        $p = (string) stream_get_contents(STDIN);
        $pdo = db();
        if ((int) $pdo->query("SELECT COUNT(*) FROM users")->fetchColumn() > 0) exit(0);
        $pdo->prepare("INSERT INTO users (username, password_hash, password_changed_at) VALUES (?, ?, ?)")
            ->execute([$u, password_hash($p, PASSWORD_DEFAULT), time()]);' "$WEB/restaurant/inc/db.php"
}

mdp_fleur_existe() {
    en_tant_que_web php -r 'require $argv[1]; exit(fd_mot_de_passe_defini() ? 0 : 1);' "$WEB/fleur-dor/admin/lib.php"
}

definir_mdp_fleur() { # mot de passe (lu sur l'entrée standard)
    printf '%s' "$1" | en_tant_que_web php -r '
        require $argv[1];
        if (fd_mot_de_passe_defini()) exit(0);
        $m = (string) stream_get_contents(STDIN);
        if ($e = fd_mot_de_passe_acceptable($m)) { fwrite(STDERR, $e . "\n"); exit(1); }
        fd_definir_mot_de_passe($m);' "$WEB/fleur-dor/admin/lib.php"
}

comptes() {
    local a_faire_restaurant=0 a_faire_fleur=0 identifiant
    compte_restaurant_existe || a_faire_restaurant=1
    mdp_fleur_existe || a_faire_fleur=1
    if [ $a_faire_restaurant = 0 ] && [ $a_faire_fleur = 0 ]; then
        echo "   Les comptes existent déjà, rien à faire."
        return
    fi
    if ! terminal_disponible; then
        echo "   Pas de terminal : les comptes seront à créer plus tard (voir les indications à la fin)."
        return
    fi
    if [ $a_faire_restaurant = 1 ]; then
        echo "   Aux Saveurs Braisées : compte de l'espace de gestion"
        read -r -p "   Identifiant [admin] : " identifiant </dev/tty
        demander_mdp "   Mot de passe"
        creer_compte_restaurant "${identifiant:-admin}" "$MDP"
        echo "   Compte créé."
    fi
    if [ $a_faire_fleur = 1 ]; then
        echo "   La Fleur d'Or : mot de passe du panneau d'administration"
        demander_mdp "   Mot de passe"
        definir_mdp_fleur "$MDP"
        echo "   Mot de passe enregistré."
    fi
    MDP=
}

# ---------- Vérifications ----------

VERIF_OK=1
verifier() { # nom, adresse, codes HTTP acceptés (ex. "403|404")
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost$2")
    if [[ "$code" =~ ^($3)$ ]]; then
        echo "   OK      $1"
    else
        echo "   ÉCHEC   $1 (code $code, attendu $3)"
        VERIF_OK=0
    fi
}

verifications() {
    verifier "Page d'accueil"                          "/"                                   200
    verifier "Aux Saveurs Braisées : carte"            "/restaurant/"                        200
    verifier "Aux Saveurs Braisées : données"          "/restaurant/api.php?action=menu"     200
    verifier "Aux Saveurs Braisées : base protégée"    "/restaurant/data/"                   403
    verifier "Aux Saveurs Braisées : code protégé"     "/restaurant/inc/db.php"              403
    verifier "La Fleur d'Or : site"                    "/fleur-dor/"                         200
    verifier "La Fleur d'Or : panneau"                 "/fleur-dor/admin/"                   200
    verifier "La Fleur d'Or : données protégées"       "/fleur-dor/donnees/carte.json"       '403|404'
    verifier "La Fleur d'Or : code protégé"            "/fleur-dor/admin/lib.php"            '403|404'
    verifier "Salon de toilettage"                     "/toilettage/"                        200
}

adresse_ip() {
    local jeton ip
    jeton=$(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
    ip=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $jeton" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
    echo "${ip:-ADRESSE-IP-DU-SERVEUR}"
}

# ---------- Programme principal ----------

main() {
    if [ "$(id -u)" -ne 0 ]; then
        echo "Lancez ce script en administrateur (sudo)."
        exit 1
    fi

    etape "1/6 Installation d'Apache, de PHP et de Git"
    dnf install -y -q httpd php php-fpm php-pdo php-mbstring git rsync
    if ! php -r 'exit(version_compare(PHP_VERSION, "8.1", "<") ? 1 : 0);'; then
        echo "PHP 8.1 ou plus récent est nécessaire (version installée : $(php -r 'echo PHP_VERSION;'))."
        exit 1
    fi
    if ! php -m | grep -qi '^pdo_sqlite$'; then
        echo "L'extension PHP pdo_sqlite est absente."
        exit 1
    fi

    etape "2/6 Récupération des sites depuis GitHub"
    mkdir -p "$SOURCES"
    recuperer "$SAVEURS_DEPOT" "$SAVEURS_BRANCHE" "$SOURCES/aux-saveurs-braisees"
    recuperer "$FLEUR_DEPOT" "$FLEUR_BRANCHE" "$SOURCES/fleur-dor"

    etape "3/6 Copie des sites"
    deployer_restaurant
    deployer_toilettage
    deployer_fleur
    page_accueil

    etape "4/6 Configuration d'Apache"
    configurer_apache

    etape "5/6 Comptes d'administration"
    comptes

    etape "6/6 Vérifications"
    verifications

    local ip
    ip=$(adresse_ip)
    echo
    if [ "$VERIF_OK" = 1 ]; then
        echo "Terminé, tout fonctionne."
    else
        echo "Terminé avec des erreurs. Consultez : sudo tail -n 30 /var/log/httpd/error_log"
    fi
    echo
    echo "   Accueil                  http://$ip/"
    echo "   Aux Saveurs Braisées     http://$ip/restaurant/        gestion : http://$ip/restaurant/admin/"
    echo "   La Fleur d'Or            http://$ip/fleur-dor/         panneau : http://$ip/fleur-dor/admin/"
    echo "   Salon de toilettage      http://$ip/toilettage/"
    if ! compte_restaurant_existe; then
        echo
        echo "À faire : ouvrez tout de suite http://$ip/restaurant/admin/ pour créer le compte du restaurant."
    fi
    if ! mdp_fleur_existe; then
        echo "À faire : relancez ce script dans une session SSH pour choisir le mot de passe de La Fleur d'Or."
    fi
}

[ "${INSTALLER_SANS_EXECUTION:-0}" = 1 ] || main "$@"
