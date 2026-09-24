#!/bin/bash
# Relie un nom de domaine à l'un des sites installés par installer-amazon-linux.sh, avec HTTPS (Let's Encrypt).
#
# Avant de lancer ce script :
#   1. Chez le registraire du domaine : un enregistrement A pour « @ » (et si possible « www »)
#      vers l'adresse IP Elastic du serveur.
#   2. Dans le groupe de sécurité EC2 : le port 443 (HTTPS) ouvert à « N'importe où ».
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
CONF_DIR=${CONF_DIR:-/etc/httpd/conf.d}
SITES="restaurant fleur-dor toilettage"

erreur() { echo "Erreur : $*" >&2; exit 1; }

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

adresse_ip_publique() {
    local jeton
    jeton=$(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
    curl -s -m 2 -H "X-aws-ec2-metadata-token: $jeton" http://169.254.169.254/latest/meta-data/public-ipv4 || true
}

# Adresses IPv4 vers lesquelles pointe un nom (vide s'il ne pointe nulle part).
resoudre() {
    getent ahostsv4 "$1" | awk '{print $1}' | sort -u || true
}

# Hôte virtuel par défaut (le fichier 00-… est chargé en premier) : l'adresse IP continue
# d'afficher la page d'accueil et les sous-dossiers.
ecrire_hote_par_defaut() {
    cat > "$CONF_DIR/00-par-defaut.conf" <<CONF
<VirtualHost *:80>
    DocumentRoot "$WEB"
</VirtualHost>
CONF
}

ecrire_hote_du_site() { # site, domaine, alias (vide ou www.domaine)
    local alias_ligne=""
    [ -n "$3" ] && alias_ligne="    ServerAlias $3"
    cat > "$CONF_DIR/site-$2.conf" <<CONF
# $2 -> site « $1 » (ajouté par ajouter-domaine.sh)
<VirtualHost *:80>
    ServerName $2
$alias_ligne
    DocumentRoot "$WEB/$1"
    <Directory "$WEB/$1">
        AllowOverride All
        Require all granted
    </Directory>
    ErrorLog /var/log/httpd/$2-error.log
    CustomLog /var/log/httpd/$2-access.log combined
</VirtualHost>
CONF
}

installer_certbot() {
    if ! command -v certbot >/dev/null 2>&1; then
        echo "   Installation de Certbot (première fois seulement)…"
        dnf install -y -q mod_ssl python3 augeas-libs cronie
        python3 -m venv /opt/certbot
        /opt/certbot/bin/pip install -q --upgrade pip
        /opt/certbot/bin/pip install -q certbot certbot-apache
        ln -sf /opt/certbot/bin/certbot /usr/bin/certbot
    fi
    # Renouvellement automatique (les certificats durent 90 jours).
    systemctl enable -q --now crond
    echo "0 3 * * * root /usr/bin/certbot renew -q --deploy-hook 'systemctl reload httpd'" > /etc/cron.d/certbot
}

main() {
    [ "$(id -u)" -eq 0 ] || erreur "lancez ce script en administrateur (sudo)."
    [ $# -ge 2 ] || usage

    local site=$1 domaine email=${3:-} ip www="" noms
    domaine=$(normaliser_domaine "$2")
    [[ " $SITES " == *" $site "* ]] || erreur "site « $site » inconnu. Choisissez parmi : $SITES."
    domaine_valide "$domaine" || erreur "« $2 » n'est pas un nom de domaine valide."
    [ -d "$WEB/$site" ] || erreur "le site « $site » n'est pas installé. Lancez d'abord installer-amazon-linux.sh."

    echo "==> 1/4 Vérification du nom de domaine"
    ip=$(adresse_ip_publique)
    noms=$(resoudre "$domaine")
    [ -n "$noms" ] || erreur "$domaine ne pointe vers aucune adresse. Créez l'enregistrement A chez votre registraire, attendez quelques minutes, puis relancez."
    if [ -n "$ip" ] && [ "$noms" != "$ip" ]; then
        erreur "$domaine pointe vers $(echo "$noms" | tr '\n' ' ')au lieu de $ip (ce serveur). Corrigez l'enregistrement A, attendez la propagation, puis relancez."
    fi
    if [ -n "$(resoudre "www.$domaine")" ] && { [ -z "$ip" ] || [ "$(resoudre "www.$domaine")" = "$ip" ]; }; then
        www="www.$domaine"
        echo "   $domaine et $www pointent bien vers ce serveur."
    else
        echo "   $domaine pointe bien vers ce serveur ($www n'est pas configuré : seule l'adresse sans www sera servie)."
    fi

    echo "==> 2/4 Configuration d'Apache"
    ecrire_hote_par_defaut
    ecrire_hote_du_site "$site" "$domaine" "$www"
    apachectl configtest
    systemctl reload httpd

    echo "==> 3/4 Certificat HTTPS"
    installer_certbot
    local args=(--apache --non-interactive --agree-tos --redirect -d "$domaine")
    [ -n "$www" ] && args+=(-d "$www")
    if [ -n "$email" ]; then args+=(-m "$email"); else args+=(--register-unsafely-without-email); fi
    certbot "${args[@]}"

    echo "==> 4/4 Vérification"
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' --resolve "$domaine:443:127.0.0.1" "https://$domaine/")
    if [ "$code" = 200 ]; then
        echo "   OK      https://$domaine/ répond."
    else
        echo "   ÉCHEC   https://$domaine/ répond avec le code $code. Consultez : sudo tail -n 30 /var/log/httpd/$domaine-error.log"
    fi

    echo
    echo "Terminé : https://$domaine/ affiche le site « $site »."
    [ -n "$www" ] && echo "          https://$www/ aussi."
    case $site in
        restaurant) echo "Espace de gestion : https://$domaine/admin/" ;;
        fleur-dor)  echo "Panneau d'administration : https://$domaine/admin/" ;;
    esac
    echo "Les mots de passe ont circulé sans chiffrement avant le HTTPS : changez-les depuis l'administration."
}

[ "${INSTALLER_SANS_EXECUTION:-0}" = 1 ] || main "$@"
