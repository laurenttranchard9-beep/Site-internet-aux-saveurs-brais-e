# Mise en ligne sur Amazon Linux 2023 (avec une adresse IP)

Les deux sites sont installés sur le même serveur, dans deux sous-dossiers :

- `http://ADRESSE-IP/restaurant/` : la carte du restaurant (et `…/restaurant/admin/` pour la gestion)
- `http://ADRESSE-IP/toilettage/` : le salon de toilettage
- `http://ADRESSE-IP/` : une page d'accueil avec un lien vers chacun

## 1. Créer le serveur (console AWS, service EC2)

1. **Lancer une instance** :
   - Image : **Amazon Linux 2023**
   - Type : **t3.micro** (suffisant pour ces deux sites)
   - Paire de clés : **créez-en une** au format `.pem` et gardez précieusement le fichier téléchargé
   - Réseau, groupe de sécurité : autorisez **SSH (port 22) depuis « Mon IP »** et **HTTP (port 80) depuis « N'importe où »**
2. **Adresse IP Elastic** : menu *Réseau et sécurité → Adresses IP Elastic → Allouer*, puis *Associer* à l'instance. Sans elle, l'adresse IP change à chaque redémarrage du serveur.

## 2. Envoyer le projet sur le serveur (depuis Windows)

Téléchargez le ZIP de la branche sur GitHub (*Code → Download ZIP*), puis dans **PowerShell** :

```powershell
# Remplacez le chemin de la clé, celui du ZIP et l'adresse IP
scp -i $HOME\Downloads\ma-cle.pem $HOME\Downloads\Site-internet-aux-saveurs-brais-e-claude-pet-grooming-landing-page-po26m7.zip ec2-user@ADRESSE-IP:~/site.zip
```

Si Windows répond « UNPROTECTED PRIVATE KEY FILE », restreignez les droits de la clé puis recommencez :

```powershell
icacls $HOME\Downloads\ma-cle.pem /inheritance:r
icacls $HOME\Downloads\ma-cle.pem /grant:r "$($env:USERNAME):(R)"
```

## 3. Lancer l'installation

```powershell
ssh -i $HOME\Downloads\ma-cle.pem ec2-user@ADRESSE-IP
```

Puis, une fois connecté au serveur :

```bash
sudo dnf install -y unzip
rm -rf site && unzip -q site.zip -d site
sudo bash site/*/deploiement/installer-amazon-linux.sh
```

Le script installe Apache et PHP, copie les sites, protège la base de données, puis vérifie que tout répond. Il affiche à la fin les adresses des sites.

**Ouvrez tout de suite `http://ADRESSE-IP/restaurant/admin/`** pour créer votre compte : tant que ce n'est pas fait, la première personne qui ouvre cette page peut le créer.

## Mettre à jour les sites

Envoyez le nouveau ZIP (étape 2), puis relancez les commandes de l'étape 3. La base de données du restaurant (produits, prix, stocks, compte) est conservée.

## Sauvegarder la base du restaurant

```bash
sudo cp /var/www/html/restaurant/data/restaurant-*.sqlite ~/sauvegarde-$(date +%F).sqlite
```

Puis, depuis Windows : `scp -i $HOME\Downloads\ma-cle.pem ec2-user@ADRESSE-IP:~/sauvegarde-*.sqlite $HOME\Documents\`

## À savoir

- **Pas de HTTPS sans nom de domaine** : les certificats gratuits (Let's Encrypt) demandent un nom de domaine. En HTTP, le mot de passe de gestion n'est pas chiffré sur le réseau : évitez de vous connecter depuis un Wi-Fi public, et changez le mot de passe une fois le HTTPS en place.
- **Avec un nom de domaine plus tard**, on passera à une configuration par domaine (`VirtualHost`) avec HTTPS.
- **Mises à jour de sécurité** du serveur : `sudo dnf upgrade -y` de temps en temps.
- En cas de problème : `sudo tail -n 30 /var/log/httpd/error_log`.
