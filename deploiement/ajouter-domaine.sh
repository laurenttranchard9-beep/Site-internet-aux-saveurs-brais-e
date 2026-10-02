#!/bin/bash
# Relie un nom de domaine à l'un des sites installés par installer.sh, avec HTTPS (Let's Encrypt).
# Fonctionne sur Ubuntu, Debian et Amazon Linux 2023.
#
# Avant de lancer ce script :
#   1. Chez le registraire du domaine : un enregistrement A pour « @ » (et si possible « www »)
#      vers l'adresse IP du serveur.
#   2. Sur AWS, dans le groupe de sécurité EC2 : le port 443 (HTTPS) ouvert à « N'importe où ».
#
# Déménagement : si le certificat du domaine a été repris de l'ancien serveur (sauvegarder.sh puis installer.sh),
# le script peut être lancé AVANT de changer l'enregistrement A : le site est prêt en HTTPS sur ce serveur,
# et le changement chez le registraire se fait sans coupure.
#
# Utilisation (une fois par site) :
#   curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/ajouter-domaine.sh | sudo bash -s -- SITE DOMAINE [EMAIL]
#
#   SITE     restaurant, fleur-dor ou toilettage
#   DOMAINE  par exemple auxsaveursbraisees.fr (sans « www » ni « https:// »)
#   EMAIL    facultatif : Let's Encrypt y envoie un avertissement si le certificat risque d'expirer
#
# Les sites restent aussi accessibles par l'adresse IP (http://IP/restaurant/…).

set -euo pipefail

WEB=${WEB:-/var/www/html}
SITES="restaurant fleur-dor toilettage"

erreur() { echo "Erreur : $*" >&2; exit 1; }

# Ubuntu et Debian d'un côté, Amazon Linux (famille Red Hat) de l'autre.
detecter_systeme() {
    local id="" id_like=""
    # shellcheck disable=SC1091
    [ -r /etc/os-release ] && { . /etc/os-release; id=${ID:-}; id_like=${ID_LIKE:-}; }
    case " $id $id_like " in
        *" debian "*|*" ubuntu "*)
            SYSTEME=debian; APACHE=apache2; LOGS=/var/log/apache2
            CONF_DIR=${CONF_DIR:-/etc/apache2/sites-available} ;;
        *" amzn "*|*" fedora "*|*" rhel "*|*" centos "*)
            SYSTEME=redhat; APACHE=httpd; LOGS=/var/log/httpd
            CONF_DIR=${CONF_DIR:-/etc/httpd/conf.d} ;;
        *) erreur "système non pris en charge (${PRETTY_NAME:-inconnu}). Utilisez Ubuntu, Debian ou Amazon Linux 2023." ;;
    esac
}

# Sur Ubuntu et Debian, un fichier de sites-available/ n'est pris en compte qu'une fois activé.
activer_conf() { # nom du fichier sans .conf
    if [ "$SYSTEME" = debian ]; then a2ensite -q "$1" >/dev/null; fi
}

usage() {
    echo "Utilisation : sudo bash ajouter-domaine.sh SITE DOMAINE [EMAIL]"
    echo "   SITE : $SITES"
    echo "   exemple : sudo bash ajouter-domaine.sh restaurant auxsaveursbraisees.fr moi@exemple.fr"
    exit 1
}

# Nettoie ce que l'on colle souvent par erreur : https://, www., barre finale, majuscules.
normaliser_domaine() {
    local d=${1,,}
    d=${d#http://}; d=${d#https://}; d=${d%%/*}; d=${d#www.}
    echo "$d"
}

domaine_valide() {
    [[ "$1" =~ ^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$ ]]
}

# Adresse IPv4 publique du serveur : service de métadonnées sur AWS, carte réseau ailleurs (OVH…).
adresse_ip_publique() {
    local jeton ip=""
    jeton=$(curl -sf -m 2 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
    [ -n "$jeton" ] && ip=$(curl -sf -m 2 -H "X-aws-ec2-metadata-token: $jeton" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
    [ -n "$ip" ] || ip=$(ip -4 route get 1.1.1.1 2>/dev/null | awk '{for (i = 1; i < NF; i++) if ($i == "src") print $(i + 1)}' || true)
    # Une adresse privée (réseau interne) ne peut pas servir de comparaison.
    if [[ "$ip" =~ ^[0-9]+(\.[0-9]+){3}$ ]] && ! [[ "$ip" =~ ^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.) ]]; then
        echo "$ip"
    fi
}

# Adresses IPv4 vers lesquelles pointe un nom (vide s'il ne pointe nulle part).
resoudre() {
    getent ahostsv4 "$1" | awk '{print $1}' | sort -u || true
}

ACME=${ACME:-/var/www/letsencrypt}
LE_LIVE=${LE_LIVE:-/etc/letsencrypt/live}

# Hôte virtuel par défaut (le fichier 00-… est chargé en premier) : l'adresse IP continue
# d'afficher la page d'accueil et les sous-dossiers. Le dossier ACME sert aux vérifications de Let's Encrypt.
ecrire_hote_par_defaut() {
    mkdir -p "$ACME/.well-known/acme-challenge"
    {
        # Serveur partagé avec d'autres sites (configurés à la main) : on ne change pas le site par défaut.
        if ! autres_sites_presents; then
            echo "<VirtualHost *:80>"
            echo "    DocumentRoot \"$WEB\""
            echo "</VirtualHost>"
            echo
        fi
        echo "# Fichiers de vérification Let's Encrypt, communs à tous les domaines"
        echo "<Directory \"$ACME\">"
        echo "    AllowOverride None"
        echo "    Require all granted"
        echo "</Directory>"
    } > "$CONF_DIR/00-par-defaut.conf"
    activer_conf 00-par-defaut
    # Sur Ubuntu et Debian, le site d'origine fait doublon avec celui-ci, sauf s'il a été personnalisé.
    if [ "$SYSTEME" = debian ] && ! autres_sites_presents; then a2dissite -q 000-default >/dev/null 2>&1 || true; fi
}

# Vrai si Apache sert déjà d'autres sites que ceux de ces scripts (fichiers site-*.conf et 00-par-defaut.conf),
# ou si le site d'origine d'Ubuntu (000-default) a été modifié.
autres_sites_presents() {
    local f
    for f in "$CONF_DIR"/*.conf; do
        [ -f "$f" ] || continue
        case ${f##*/} in
            site-*.conf|00-par-defaut.conf|default-ssl.conf) continue ;;
            000-default.conf)
                if grep -qiE '^[[:space:]]*(ServerName|ServerAlias)' "$f" \
                    || ! grep -qE '^[[:space:]]*DocumentRoot[[:space:]]+"?/var/www/html"?[[:space:]]*$' "$f"; then
                    return 0
                fi ;;
            *)
                # Sur Ubuntu, seuls les sites activés comptent.
                if [ "$SYSTEME" = redhat ] || [ -e "/etc/apache2/sites-enabled/${f##*/}" ]; then return 0; fi ;;
        esac
    done
    return 1
}

# Hôte virtuel du domaine. Sans certificat : le site en HTTP. Avec certificat : HTTP redirige vers HTTPS.
ecrire_hote_du_site() { # site, domaine, alias (vide ou www.domaine)
    local site=$1 domaine=$2 alias_ligne="" cert="$LE_LIVE/$2"
    [ -n "$3" ] && alias_ligne="ServerAlias $3"
    local repertoire="    DocumentRoot \"$WEB/$site\"
    <Directory \"$WEB/$site\">
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog $LOGS/$domaine-error.log
    CustomLog $LOGS/$domaine-access.log combined"
    local acme="    Alias /.well-known/acme-challenge/ $ACME/.well-known/acme-challenge/"
    {
        echo "# $domaine -> site « $site » (ajouté par ajouter-domaine.sh)"
        echo "<VirtualHost *:80>"
        echo "    ServerName $domaine"
        [ -n "$alias_ligne" ] && echo "    $alias_ligne"
        echo "$acme"
        if [ -s "$cert/fullchain.pem" ]; then
            echo "    RewriteEngine On"
            echo "    RewriteCond %{REQUEST_URI} !^/\.well-known/acme-challenge/"
            echo "    RewriteRule ^ https://%{HTTP_HOST}%{REQUEST_URI} [R=301,L]"
        else
            echo "$repertoire"
        fi
        echo "</VirtualHost>"
        if [ -s "$cert/fullchain.pem" ]; then
            echo
            echo "<VirtualHost *:443>"
            echo "    ServerName $domaine"
            [ -n "$alias_ligne" ] && echo "    $alias_ligne"
            echo "$repertoire"
            echo "    SSLEngine on"
            echo "    SSLCertificateFile $cert/fullchain.pem"
            echo "    SSLCertificateKeyFile $cert/privkey.pem"
            echo "</VirtualHost>"
        fi
    } > "$CONF_DIR/site-$domaine.conf"
    activer_conf "site-$domaine"
}

# Modules HTTPS et de redirection d'Apache. Sur Amazon Linux, le fichier ssl.conf réclame un certificat « localhost »
# qui n'est créé qu'au démarrage suivant d'Apache : on le crée tout de suite pour que la configuration reste valide.
preparer_https() {
    if [ "$SYSTEME" = debian ]; then
        a2enmod -q ssl rewrite >/dev/null
        return
    fi
    rpm -q mod_ssl >/dev/null 2>&1 || dnf install -y -q mod_ssl
    local crt=/etc/pki/tls/certs/localhost.crt key=/etc/pki/tls/private/localhost.key
    if [ ! -s "$crt" ] || [ ! -s "$key" ]; then
        openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -subj "/CN=localhost" \
            -keyout "$key" -out "$crt" 2>/dev/null
        chmod 600 "$key"
    fi
}

# Certbot seul, sans module pour Apache : aucune compilation nécessaire.
installer_certbot() {
    if [ ! -x /opt/certbot/bin/certbot ]; then
        echo "   Installation de Certbot (première fois seulement)…"
        if [ "$SYSTEME" = debian ]; then
            DEBIAN_FRONTEND=noninteractive apt-get install -y -q python3-venv cron
        else
            dnf install -y -q python3 cronie
        fi
        rm -rf /opt/certbot
        python3 -m venv /opt/certbot
        /opt/certbot/bin/pip install -q --upgrade pip
        /opt/certbot/bin/pip install -q certbot
    fi
    ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
    # Renouvellement automatique (les certificats durent 90 jours).
    local cron=crond
    [ "$SYSTEME" = debian ] && cron=cron
    service_actif "$cron"
    echo "0 3 * * * root /usr/bin/certbot renew -q --deploy-hook 'systemctl reload $APACHE'" > /etc/cron.d/certbot
}

# Avec ou sans systemd (conteneurs de test).
service_actif() {
    if [ -d /run/systemd/system ]; then systemctl enable -q --now "$1"; else service "$1" start >/dev/null 2>&1 || true; fi
}

recharger_apache() {
    apachectl configtest
    # reload-or-restart : démarre aussi Apache s'il était arrêté.
    if [ -d /run/systemd/system ]; then
        systemctl reload-or-restart "$APACHE"
    else
        service "$APACHE" reload >/dev/null 2>&1 || service "$APACHE" start >/dev/null
    fi
}

# Certificat déjà présent sur ce serveur (repris de l'ancien) et encore valable au moins 7 jours.
certificat_valable() { # domaine
    [ -s "$LE_LIVE/$1/fullchain.pem" ] && openssl x509 -checkend $((7 * 86400)) -noout -in "$LE_LIVE/$1/fullchain.pem" >/dev/null
}

certificat_couvre() { # domaine, nom
    openssl x509 -noout -text -in "$LE_LIVE/$1/fullchain.pem" | grep -q "DNS:$2\(,\|\$\)"
}

main() {
    [ "$(id -u)" -eq 0 ] || erreur "lancez ce script en administrateur (sudo)."
    [ $# -ge 2 ] || usage

    local site=$1 domaine email=${3:-} ip www="" noms demenagement=0
    domaine=$(normaliser_domaine "$2")
    [[ " $SITES " == *" $site "* ]] || erreur "site « $site » inconnu. Choisissez parmi : $SITES."
    domaine_valide "$domaine" || erreur "« $2 » n'est pas un nom de domaine valide."
    detecter_systeme
    [ -d "$WEB/$site" ] || erreur "le site « $site » n'est pas installé. Lancez d'abord installer.sh."

    echo "==> 1/4 Vérification du nom de domaine"
    ip=${IP_SERVEUR:-$(adresse_ip_publique)} # IP_SERVEUR : à indiquer si l'adresse n'est pas détectée
    noms=$(resoudre "$domaine")
    if [ -n "$noms" ] && { [ -z "$ip" ] || [ "$noms" = "$ip" ]; }; then
        if [ -n "$(resoudre "www.$domaine")" ] && { [ -z "$ip" ] || [ "$(resoudre "www.$domaine")" = "$ip" ]; }; then
            www="www.$domaine"
            echo "   $domaine et $www pointent bien vers ce serveur."
        else
            echo "   $domaine pointe bien vers ce serveur (www.$domaine n'est pas configuré : seule l'adresse sans www sera servie)."
        fi
    elif certificat_valable "$domaine"; then
        # Déménagement : le domaine pointe encore vers l'ancien serveur, mais son certificat a été repris.
        demenagement=1
        if certificat_couvre "$domaine" "www.$domaine"; then www="www.$domaine"; fi
        echo "   $domaine pointe encore vers ${noms:-aucune adresse}, mais son certificat HTTPS a été repris de l'ancien serveur :"
        echo "   le site est préparé ici, il ne restera qu'à changer l'enregistrement A."
    elif [ -z "$noms" ]; then
        erreur "$domaine ne pointe vers aucune adresse. Créez l'enregistrement A chez votre registraire, attendez quelques minutes, puis relancez."
    else
        erreur "$domaine pointe vers $(echo "$noms" | tr '\n' ' ')au lieu de $ip (ce serveur). Corrigez l'enregistrement A, attendez la propagation, puis relancez."
    fi

    echo "==> 2/4 Configuration d'Apache"
    preparer_https
    ecrire_hote_par_defaut
    ecrire_hote_du_site "$site" "$domaine" "$www"
    recharger_apache

    echo "==> 3/4 Certificat HTTPS"
    installer_certbot
    if [ "$demenagement" = 1 ]; then
        echo "   Certificat repris de l'ancien serveur, valable jusqu'au $(date -d "$(openssl x509 -enddate -noout -in "$LE_LIVE/$domaine/fullchain.pem" | cut -d= -f2)" +%d/%m/%Y) ;"
        echo "   il sera renouvelé ici automatiquement une fois le domaine dirigé vers ce serveur."
    else
    local args=(certonly --webroot -w "$ACME" --non-interactive --agree-tos --keep-until-expiring
                --cert-name "$domaine" -d "$domaine")
    [ -n "$www" ] && args+=(-d "$www")
    if [ -n "$email" ]; then args+=(-m "$email"); else args+=(--register-unsafely-without-email); fi
    certbot "${args[@]}"
    fi
    # Le certificat existe : HTTPS activé, HTTP redirigé vers HTTPS.
    ecrire_hote_du_site "$site" "$domaine" "$www"
    recharger_apache

    echo "==> 4/4 Vérification"
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' --resolve "$domaine:443:127.0.0.1" "https://$domaine/")
    if [ "$code" = 200 ]; then
        echo "   OK      https://$domaine/ répond."
    else
        echo "   ÉCHEC   https://$domaine/ répond avec le code $code. Consultez : sudo tail -n 30 $LOGS/$domaine-error.log"
    fi

    echo
    if [ "$demenagement" = 1 ]; then
        echo "Le site est prêt sur ce serveur. Dernière étape, chez votre registraire (OVH : zone DNS du domaine) :"
        local cible=${ip:-"l'adresse IP de ce serveur"} noms_a="« $domaine »"
        [ -n "$www" ] && noms_a="« $domaine » et « $www »"
        echo "   remplacez l'adresse des enregistrements A de $noms_a par $cible."
        echo "Pendant la propagation (jusqu'à quelques heures), les visiteurs arrivent sur l'un ou l'autre serveur : laissez l'ancien allumé un jour ou deux."
        return
    fi
    echo "Terminé : https://$domaine/ affiche le site « $site »."
    [ -n "$www" ] && echo "          https://$www/ aussi."
    case $site in
        restaurant) echo "Espace de gestion : https://$domaine/admin/" ;;
        fleur-dor)  echo "Panneau d'administration : https://$domaine/admin/" ;;
    esac
    echo "Les mots de passe ont circulé sans chiffrement avant le HTTPS : changez-les depuis l'administration."
}

[ "${INSTALLER_SANS_EXECUTION:-0}" = 1 ] || main "$@"
