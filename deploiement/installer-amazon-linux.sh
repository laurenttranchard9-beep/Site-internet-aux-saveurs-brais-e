#!/bin/bash
# Installe (ou met à jour) les deux sites sur un serveur Amazon Linux 2023, accessibles par l'adresse IP :
#   http://IP/restaurant/   le menu du restaurant et son espace de gestion
#   http://IP/toilettage/   le site du salon de toilettage
#
# Utilisation, depuis le dossier décompressé du ZIP du projet :
#   sudo bash deploiement/installer-amazon-linux.sh
# Relancer le même script avec un ZIP plus récent met les sites à jour
# sans toucher à la base de données du restaurant (produits, stocks, compte).

set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
    echo "Lancez ce script avec sudo : sudo bash $0"
    exit 1
fi

SRC="$(cd "$(dirname "$0")/.." && pwd)"
WEB=/var/www/html

if [ ! -f "$SRC/restaurant/api.php" ] || [ ! -f "$SRC/index.html" ]; then
    echo "Fichiers du projet introuvables dans $SRC."
    echo "Lancez le script depuis le dossier décompressé du ZIP du projet."
    exit 1
fi

echo "==> 1/5 Installation d'Apache et de PHP"
dnf install -y -q httpd php php-fpm php-pdo php-mbstring rsync
if ! php -r 'exit(version_compare(PHP_VERSION, "8.1", "<") ? 1 : 0);'; then
    echo "PHP 8.1 ou plus récent est nécessaire (version installée : $(php -r 'echo PHP_VERSION;'))."
    exit 1
fi
if ! php -m | grep -qi '^pdo_sqlite$'; then
    echo "L'extension PHP pdo_sqlite est absente."
    exit 1
fi

echo "==> 2/5 Copie des sites"
mkdir -p "$WEB/restaurant" "$WEB/toilettage"
# Les fichiers exclus (base de données, fichier de réinitialisation) ne sont jamais écrasés ni supprimés.
rsync -a --delete \
    --exclude 'data/*.sqlite*' \
    --exclude 'data/reinitialiser.txt' \
    "$SRC/restaurant/" "$WEB/restaurant/"
cp "$SRC/index.html" "$SRC/styles.css" "$SRC/script.js" "$WEB/toilettage/"

# Page d'accueil à la racine de l'adresse IP, avec un lien vers chaque site.
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
  <a href="toilettage/">Bulles &amp; Moustaches<small>Le salon de toilettage</small></a>
</main>
</body>
</html>
HTML

echo "==> 3/5 Droits d'écriture pour la base de données du restaurant"
chown -R apache:apache "$WEB/restaurant/data"
if command -v selinuxenabled >/dev/null 2>&1 && selinuxenabled; then
    chcon -R -t httpd_sys_rw_content_t "$WEB/restaurant/data"
fi

echo "==> 4/5 Configuration d'Apache"
# Autorise les fichiers .htaccess, qui bloquent l'accès à la base de données depuis le navigateur.
cat > /etc/httpd/conf.d/sites.conf <<'CONF'
<Directory "/var/www/html">
    AllowOverride All
    Require all granted
</Directory>
CONF
apachectl configtest
systemctl enable -q --now php-fpm httpd
systemctl restart php-fpm httpd

echo "==> 5/5 Vérifications"
ok=1
check() { # nom, adresse, code HTTP attendu
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost$2")
    if [ "$code" = "$3" ]; then
        echo "   OK      $1"
    else
        echo "   ÉCHEC   $1 (code $code au lieu de $3)"
        ok=0
    fi
}
check "Page d'accueil"                        "/"                                   200
check "Site du salon de toilettage"           "/toilettage/"                        200
check "Carte du restaurant"                   "/restaurant/"                        200
check "Carte du restaurant (données)"         "/restaurant/api.php?action=menu"     200
check "Base de données protégée"              "/restaurant/data/"                   403
check "Fichiers internes protégés"            "/restaurant/inc/db.php"              403

# Adresse IP publique de l'instance (service de métadonnées EC2)
TOKEN=$(curl -s -m 2 -X PUT http://169.254.169.254/latest/api/token -H "X-aws-ec2-metadata-token-ttl-seconds: 60" || true)
IP=$(curl -s -m 2 -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || true)
[ -n "$IP" ] || IP="ADRESSE-IP-DU-SERVEUR"

echo
if [ "$ok" = 1 ]; then
    echo "Installation terminée."
else
    echo "Installation terminée avec des erreurs. Consultez : sudo tail -n 30 /var/log/httpd/error_log"
fi
echo
echo "   Accueil      : http://$IP/"
echo "   Restaurant   : http://$IP/restaurant/"
echo "   Gestion      : http://$IP/restaurant/admin/"
echo "   Toilettage   : http://$IP/toilettage/"
echo
echo "Première installation : ouvrez tout de suite http://$IP/restaurant/admin/ pour créer votre compte."
