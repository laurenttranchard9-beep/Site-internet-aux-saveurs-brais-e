#!/bin/bash
# Installe (ou met à jour) les sites sur un serveur Ubuntu, Debian ou Amazon Linux 2023,
# accessibles par l'adresse IP :
#   http://IP/restaurant/   Aux Saveurs Braisées (carte et espace de gestion)
#   http://IP/fleur-dor/    La Fleur d'Or (site et panneau d'administration)
#   http://IP/toilettage/   le salon de toilettage
#
# Installation ou mise à jour, en une commande sur le serveur :
#   curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/installer.sh | sudo bash
#
# Relancer la même commande met les sites à jour depuis GitHub sans toucher aux données :
# base du restaurant (produits, stocks, compte, statistiques), carte et mot de passe de La Fleur d'Or.
#
# Pour n'installer que certains sites, nommez-les après « bash -s -- » ; le choix est retenu pour les mises à jour :
#   curl -fsSL …/installer.sh | sudo bash -s -- restaurant
#
# Déménagement : si le fichier sauvegarde-sites.tar.gz créé par sauvegarder.sh sur l'ancien serveur
# se trouve dans le dossier personnel de l'utilisateur (ou est indiqué par « --importer FICHIER »),
# ses données et ses certificats HTTPS sont repris, et chaque domaine est relié à son site (ajouter-domaine.sh) :
# il ne reste qu'à changer l'adresse IP dans la zone DNS. Le fichier est ensuite renommé pour ne pas être réimporté.

# shellcheck disable=SC2016 # le code PHP entre apostrophes utilise ses propres variables ($argv)
set -euo pipefail

GITHUB=https://github.com/laurenttranchard9-beep
SAVEURS_DEPOT=${SAVEURS_DEPOT:-"$GITHUB/Site-internet-aux-saveurs-brais-e.git"}
SAVEURS_BRANCHE=${SAVEURS_BRANCHE:-claude/pet-grooming-landing-page-po26m7}
FLEUR_DEPOT="$GITHUB/Fleur-d-or.git"
FLEUR_BRANCHE=claude/practical-mendel-dpj572

SOURCES=${SOURCES:-/opt/sites}
WEB=${WEB:-/var/www/html}
SAUVEGARDE_NOM=sauvegarde-sites.tar.gz
TOUS_LES_SITES="restaurant fleur-dor toilettage"
MEMOIRE="$SOURCES/sites-installes" # sites choisis à la première installation
DOMAINES_IMPORTES=""               # lignes « domaine site » des certificats repris

etape() { echo; echo "==> $*"; }
erreur() { echo "Erreur : $*" >&2; exit 1; }

# ---------- Choix des sites ----------

# Sites demandés sur la ligne de commande, sinon ceux de la dernière installation, sinon tous.
choisir_sites() { # sites demandés (peut être vide)
    local s
    if [ -n "$1" ]; then
        SITES_CHOISIS=$1
    elif [ -s "$MEMOIRE" ]; then
        SITES_CHOISIS=$(cat "$MEMOIRE")
    else
        SITES_CHOISIS=$TOUS_LES_SITES
    fi
    local liste=""
    for s in $SITES_CHOISIS; do
        [[ " $TOUS_LES_SITES " == *" $s "* ]] || erreur "site « $s » inconnu dans $MEMOIRE. Relancez en nommant les sites : $TOUS_LES_SITES."
        [[ " $liste " == *" $s "* ]] || liste+="${liste:+ }$s"
    done
    SITES_CHOISIS=$liste
}

site_choisi() {
    [[ " $SITES_CHOISIS " == *" $1 "* ]]
}

# ---------- Système ----------

# Ubuntu et Debian d'un côté, Amazon Linux (famille Red Hat) de l'autre : paquets, utilisateur et dossiers d'Apache.
detecter_systeme() {
    local id="" id_like=""
    # shellcheck disable=SC1091
    [ -r /etc/os-release ] && { . /etc/os-release; id=${ID:-}; id_like=${ID_LIKE:-}; }
    case " $id $id_like " in
        *" debian "*|*" ubuntu "*)
            SYSTEME=debian; APACHE_LOGS=/var/log/apache2/error.log
            WEB_USER=${WEB_USER:-www-data} ;;
        *" amzn "*|*" fedora "*|*" rhel "*|*" centos "*)
            SYSTEME=redhat; APACHE_LOGS=/var/log/httpd/error_log
            WEB_USER=${WEB_USER:-apache} ;;
        *) erreur "système non pris en charge (${PRETTY_NAME:-inconnu}). Utilisez Ubuntu, Debian ou Amazon Linux 2023." ;;
    esac
}

installer_paquets() {
    if [ "$SYSTEME" = debian ]; then
        export DEBIAN_FRONTEND=noninteractive
        apt-get update -q
        apt-get install -y -q apache2 libapache2-mod-php php-sqlite3 php-mbstring git rsync curl
        # rewrite : redirection vers HTTPS ; headers et expires : en-têtes de sécurité et cache des .htaccess
        a2enmod -q rewrite headers expires >/dev/null
    else
        dnf install -y -q httpd php php-fpm php-pdo php-mbstring git rsync
    fi
}

# Démarre (ou redémarre) des services, avec ou sans systemd.
redemarrer() {
    local s
    for s in "$@"; do
        if [ -d /run/systemd/system ]; then
            systemctl enable -q --now "$s"
            systemctl restart "$s"
        else
            service "$s" restart >/dev/null
        fi
    done
}

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
    droits_fleur
}

droits_fleur() {
    local dst="$WEB/fleur-dor"
    # Le panneau doit pouvoir réécrire index.html (fichier temporaire dans le dossier, puis renommage).
    chown "$WEB_USER:$WEB_USER" "$dst" "$dst/index.html"
    chown -R "$WEB_USER:$WEB_USER" "$dst/donnees"
    selinux_ecriture "$dst/donnees"
    selinux_ecriture "$dst/index.html"
}

# Régénère la page de La Fleur d'Or avec le gabarit à jour et la carte actuelle.
publier_fleur() {
    en_tant_que_web php "$WEB/fleur-dor/admin/publier.php"
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
    {
    cat <<'HTML'
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
HTML
    if site_choisi restaurant; then echo '  <a href="restaurant/">Aux Saveurs Braisées<small>La carte du restaurant</small></a>'; fi
    if site_choisi fleur-dor; then echo '  <a href="fleur-dor/">La Fleur d'"'"'Or<small>Restaurant asiatique à Grenade</small></a>'; fi
    if site_choisi toilettage; then echo '  <a href="toilettage/">Bulles &amp; Moustaches<small>Le salon de toilettage</small></a>'; fi
    cat <<'HTML'
</main>
</body>
</html>
HTML
    } > "$WEB/index.html"
}

configurer_apache() {
    # Autorise les fichiers .htaccess, qui protègent les données et les fichiers internes des sites.
    local conf='<Directory "/var/www/html">
    AllowOverride All
    Require all granted
</Directory>'
    if [ "$SYSTEME" = debian ]; then
        # ServerName évite l'avertissement « Could not reliably determine the server's fully qualified domain name ».
        printf 'ServerName localhost\n%s\n' "$conf" > /etc/apache2/conf-available/sites.conf
        a2enconf -q sites >/dev/null
        apachectl configtest
        redemarrer apache2
        ouvrir_pare_feu
    else
        echo "$conf" > /etc/httpd/conf.d/sites.conf
        apachectl configtest
        redemarrer php-fpm httpd
    fi
}

# Pare-feu Ubuntu (ufw), s'il est activé : ouvre le web (HTTP et HTTPS), sans toucher au reste.
ouvrir_pare_feu() {
    if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q '^Status: active'; then
        ufw allow 80/tcp >/dev/null
        ufw allow 443/tcp >/dev/null
        echo "   Pare-feu : ports 80 et 443 ouverts."
    fi
}

# ---------- Reprise des données d'un ancien serveur ----------

# Fichier de sauvegarde à importer : celui de « --importer », sinon sauvegarde-sites.tar.gz
# dans le dossier personnel de l'utilisateur qui a lancé sudo (ou de root).
trouver_sauvegarde() {
    if [ -n "${IMPORTER:-}" ]; then
        [ -f "$IMPORTER" ] || erreur "fichier à importer introuvable : $IMPORTER"
        echo "$IMPORTER"
        return
    fi
    local d
    for d in "$(getent passwd "${SUDO_USER:-root}" | cut -d: -f6)" /root; do
        if [ -n "$d" ] && [ -f "$d/$SAUVEGARDE_NOM" ]; then
            echo "$d/$SAUVEGARDE_NOM"
            return
        fi
    done
}

importer_sauvegarde() {
    local archive avant base nb tmp
    archive=$(trouver_sauvegarde)
    if [ -z "$archive" ]; then
        echo "   Aucune sauvegarde à importer."
        return
    fi
    echo "   Sauvegarde trouvée : $archive"
    IMPORT_TMP=$(mktemp -d)
    tmp=$IMPORT_TMP
    tar xzf "$archive" -C "$tmp" --no-same-owner
    avant=/var/backups/sites-avant-import-$(date +%Y%m%d-%H%M%S)
    mkdir -p "$avant"
    chmod 700 "$avant"

    # Aux Saveurs Braisées : une seule base, que l'on vérifie avant de remplacer l'actuelle.
    nb=$(find "$tmp/restaurant/data" -maxdepth 1 -name 'restaurant-*.sqlite' 2>/dev/null | wc -l)
    if [ "$nb" -gt 0 ] && ! site_choisi restaurant; then
        echo "   Aux Saveurs Braisées : ignoré, ce site n'est pas installé ici."
    elif [ "$nb" = 1 ]; then
        base=$(find "$tmp/restaurant/data" -maxdepth 1 -name 'restaurant-*.sqlite')
        php -r '$p = new PDO("sqlite:" . $argv[1], null, null, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
                $p->query("SELECT COUNT(*) FROM products")->fetchColumn();' "$base" \
            || erreur "la base du restaurant contenue dans la sauvegarde est illisible. Rien n'a été remplacé."
        mkdir -p "$avant/restaurant-data"
        find "$WEB/restaurant/data" -maxdepth 1 -name 'restaurant-*.sqlite*' -exec mv -t "$avant/restaurant-data" {} +
        install -m 640 -o "$WEB_USER" -g "$WEB_USER" "$base" "$WEB/restaurant/data/"
        echo "   Aux Saveurs Braisées : carte, stocks, compte et statistiques repris."
    elif [ "$nb" -gt 1 ]; then
        erreur "la sauvegarde contient plusieurs bases du restaurant. Rien n'a été remplacé."
    fi

    # La Fleur d'Or : carte, sauvegardes de la carte et mot de passe du panneau.
    if [ -f "$tmp/fleur-dor/donnees/carte.json" ] && ! site_choisi fleur-dor; then
        echo "   La Fleur d'Or : ignoré, ce site n'est pas installé ici."
    elif [ -f "$tmp/fleur-dor/donnees/carte.json" ]; then
        cp -a "$WEB/fleur-dor/donnees" "$avant/fleur-dor-donnees"
        rsync -a --delete "$tmp/fleur-dor/donnees/" "$WEB/fleur-dor/donnees/"
        droits_fleur
        echo "   La Fleur d'Or : carte et mot de passe repris."
    fi

    importer_certificats "$tmp/letsencrypt"

    # Le fichier est renommé : relancer le script (pour une mise à jour) ne le réimportera pas.
    mv "$archive" "${archive%.tar.gz}.importee-$(date +%Y%m%d-%H%M%S).tar.gz"
    echo "   Les données remplacées sont gardées dans $avant"
}

# Certificats HTTPS des sites installés ici. La sauvegarde les liste dans domaines.txt (« domaine site »).
# Un domaine qui a déjà un certificat sur ce serveur garde le sien.
importer_certificats() { # dossier letsencrypt de la sauvegarde
    local src=$1 le=/etc/letsencrypt domaine site
    [ -f "$src/domaines.txt" ] || return 0
    while read -r domaine site; do
        [ -n "$domaine" ] || continue
        if ! site_choisi "$site"; then
            echo "   Certificat de $domaine ignoré : le site « $site » n'est pas installé ici."
        elif [ -e "$le/live/$domaine" ]; then
            echo "   Certificat de $domaine : ce serveur en a déjà un, il est conservé."
        else
            mkdir -p "$le/live" "$le/archive" "$le/renewal"
            cp -a "$src/archive/$domaine" "$le/archive/"
            cp -a "$src/live/$domaine" "$le/live/"
            if [ -f "$src/renewal/$domaine.conf" ]; then cp -a "$src/renewal/$domaine.conf" "$le/renewal/"; fi
            DOMAINES_IMPORTES+="$domaine $site"$'\n'
            echo "   Certificat HTTPS de $domaine repris."
        fi
    done < "$src/domaines.txt"
    if [ -n "$DOMAINES_IMPORTES" ]; then
        # Le compte Let's Encrypt de l'ancien serveur sert au renouvellement automatique.
        if [ -d "$src/accounts" ]; then
            mkdir -p "$le/accounts"
            rsync -a --ignore-existing "$src/accounts/" "$le/accounts/"
        fi
        chown -R root:root "$le"
    fi
}

# Relie chaque domaine repris à son site, en HTTPS, avant même le changement de la zone DNS.
relier_domaines_importes() {
    local domaine site
    while read -r domaine site; do
        [ -n "$domaine" ] || continue
        echo "   $domaine -> $site"
        bash "$SOURCES/aux-saveurs-braisees/deploiement/ajouter-domaine.sh" "$site" "$domaine" </dev/null | sed 's/^/   /' \
            || echo "   ÉCHEC : relancez plus tard « ajouter-domaine.sh $site $domaine » (voir deploiement/README.md)."
    done <<< "$DOMAINES_IMPORTES"
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
    if site_choisi restaurant && ! compte_restaurant_existe; then a_faire_restaurant=1; fi
    if site_choisi fleur-dor && ! mdp_fleur_existe; then a_faire_fleur=1; fi
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
    if site_choisi restaurant; then
        verifier "Aux Saveurs Braisées : carte"            "/restaurant/"                        200
        verifier "Aux Saveurs Braisées : données"          "/restaurant/api.php?action=menu"     200
        verifier "Aux Saveurs Braisées : base protégée"    "/restaurant/data/"                   403
        verifier "Aux Saveurs Braisées : code protégé"     "/restaurant/inc/db.php"              403
    fi
    if site_choisi fleur-dor; then
        verifier "La Fleur d'Or : site"                    "/fleur-dor/"                         200
        verifier "La Fleur d'Or : panneau"                 "/fleur-dor/admin/"                   200
        verifier "La Fleur d'Or : données protégées"       "/fleur-dor/donnees/carte.json"       '403|404'
        verifier "La Fleur d'Or : code protégé"            "/fleur-dor/admin/lib.php"            '403|404'
    fi
    if site_choisi toilettage; then
        verifier "Salon de toilettage"                     "/toilettage/"                        200
    fi
}

# Adresse IPv4 publique du serveur : service de métadonnées sur AWS, carte réseau ailleurs (OVH…).
adresse_ip() {
    local jeton="" ip=${IP_SERVEUR:-} # IP_SERVEUR : à indiquer si l'adresse n'est pas détectée
    [ -z "$ip" ] && jeton=$(curl -sf -m 2 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
    [ -n "$jeton" ] && ip=$(curl -sf -m 2 -H "X-aws-ec2-metadata-token: $jeton" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
    [ -n "$ip" ] || ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}' || true)
    # Une adresse privée (réseau interne) ne sert à rien depuis Internet.
    if [[ "$ip" =~ ^[0-9]+(\.[0-9]+){3}$ ]] && ! [[ "$ip" =~ ^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.) ]]; then
        echo "$ip"
    fi
}

# ---------- Programme principal ----------

main() {
    local demandes=""
    while [ $# -gt 0 ]; do
        case $1 in
            --importer) [ $# -ge 2 ] || erreur "indiquez le fichier après --importer."; IMPORTER=$2; shift 2 ;;
            restaurant|fleur-dor|toilettage) demandes+="$1 "; shift ;;
            *) erreur "« $1 » inconnu. Sites possibles : $TOUS_LES_SITES ; option : --importer FICHIER." ;;
        esac
    done
    [ "$(id -u)" -eq 0 ] || erreur "lancez ce script en administrateur (sudo)."
    choisir_sites "$demandes"
    echo "Sites installés sur ce serveur : $SITES_CHOISIS"
    detecter_systeme
    trap 'rm -rf "${IMPORT_TMP:-}"' EXIT

    etape "1/7 Installation d'Apache, de PHP et de Git"
    installer_paquets
    if ! php -r 'exit(version_compare(PHP_VERSION, "8.1", "<") ? 1 : 0);'; then
        erreur "PHP 8.1 ou plus récent est nécessaire (version installée : $(php -r 'echo PHP_VERSION;'))."
    fi
    php -m | grep -qi '^pdo_sqlite$' || erreur "l'extension PHP pdo_sqlite est absente."

    etape "2/7 Récupération des sites depuis GitHub"
    mkdir -p "$SOURCES"
    echo "$SITES_CHOISIS" > "$MEMOIRE"
    # Ce dépôt contient aussi les scripts (ajouter-domaine.sh) : il est toujours récupéré.
    recuperer "$SAVEURS_DEPOT" "$SAVEURS_BRANCHE" "$SOURCES/aux-saveurs-braisees"
    if site_choisi fleur-dor; then recuperer "$FLEUR_DEPOT" "$FLEUR_BRANCHE" "$SOURCES/fleur-dor"; fi

    etape "3/7 Copie des sites"
    if site_choisi restaurant; then deployer_restaurant; fi
    if site_choisi toilettage; then deployer_toilettage; fi
    if site_choisi fleur-dor; then deployer_fleur; fi
    page_accueil

    etape "4/7 Reprise des données d'un ancien serveur"
    importer_sauvegarde
    if site_choisi fleur-dor; then publier_fleur; fi

    etape "5/7 Configuration d'Apache"
    configurer_apache
    if [ -n "$DOMAINES_IMPORTES" ]; then
        echo "   Noms de domaine repris de l'ancien serveur :"
        relier_domaines_importes
    fi

    etape "6/7 Comptes d'administration"
    comptes

    etape "7/7 Vérifications"
    verifications

    local ip
    ip=$(adresse_ip)
    ip=${ip:-ADRESSE-IP-DU-SERVEUR}
    echo
    if [ "$VERIF_OK" = 1 ]; then
        echo "Terminé, tout fonctionne."
    else
        echo "Terminé avec des erreurs. Consultez : sudo tail -n 30 $APACHE_LOGS"
    fi
    echo
    echo "   Accueil                  http://$ip/"
    if site_choisi restaurant; then
        echo "   Aux Saveurs Braisées     http://$ip/restaurant/        gestion : http://$ip/restaurant/admin/"
    fi
    if site_choisi fleur-dor; then
        echo "   La Fleur d'Or            http://$ip/fleur-dor/         panneau : http://$ip/fleur-dor/admin/"
    fi
    if site_choisi toilettage; then
        echo "   Salon de toilettage      http://$ip/toilettage/"
    fi
    if site_choisi restaurant && ! compte_restaurant_existe; then
        echo
        echo "À faire : ouvrez tout de suite http://$ip/restaurant/admin/ pour créer le compte du restaurant."
    fi
    if site_choisi fleur-dor && ! mdp_fleur_existe; then
        echo "À faire : relancez ce script dans une session SSH pour choisir le mot de passe de La Fleur d'Or."
    fi
    if [ -n "$DOMAINES_IMPORTES" ]; then
        local domaine site
        echo
        echo "Dernière étape, dans la zone DNS du domaine (OVH : Noms de domaine → le domaine → Zone DNS) :"
        while read -r domaine site; do
            [ -n "$domaine" ] || continue
            echo "   enregistrements A de « $domaine » et « www.$domaine » : remplacez l'adresse par $ip"
        done <<< "$DOMAINES_IMPORTES"
        echo "Les deux serveurs affichent le même site pendant le changement : laissez l'ancien allumé un ou deux jours."
    fi
}

[ "${INSTALLER_SANS_EXECUTION:-0}" = 1 ] || main "$@"
