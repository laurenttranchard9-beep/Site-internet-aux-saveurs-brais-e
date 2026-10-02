# Mise en ligne des sites (Ubuntu, Debian ou Amazon Linux 2023)

Trois sites peuvent être installés sur un serveur, dans des sous-dossiers de son adresse IP :

| Site | Nom dans les scripts | Adresse | Administration |
|---|---|---|---|
| Aux Saveurs Braisées | `restaurant` | `http://ADRESSE-IP/restaurant/` | `http://ADRESSE-IP/restaurant/admin/` |
| La Fleur d'Or | `fleur-dor` | `http://ADRESSE-IP/fleur-dor/` | `http://ADRESSE-IP/fleur-dor/admin/` |
| Salon de toilettage | `toilettage` | `http://ADRESSE-IP/toilettage/` | |

`http://ADRESSE-IP/` affiche une page avec un lien vers chaque site installé. Avec un nom de domaine, chaque site a aussi sa propre adresse en HTTPS (voir plus bas).

Les scripts récupèrent les sites directement sur GitHub :

- `Site-internet-aux-saveurs-brais-e`, branche `claude/pet-grooming-landing-page-po26m7` (restaurant, salon et ces scripts) ;
- `Fleur-d-or`, branche `claude/practical-mendel-dpj572`.

| Script | Rôle |
|---|---|
| `installer.sh` | installe ou met à jour les sites ; reprend les données d'un ancien serveur |
| `ajouter-domaine.sh` | relie un nom de domaine à un site, avec HTTPS |
| `sauvegarder.sh` | sauvegarde les données, et peut les envoyer sur un nouveau serveur |

## Installer les sites

Ouvrez un terminal sur le serveur (voir « Se connecter au serveur » plus bas) et collez :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/installer.sh | sudo bash
```

Cette commande installe les trois sites. Pour n'en installer que certains, nommez-les à la fin, après `bash -s --` :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/installer.sh | sudo bash -s -- restaurant
```

Le script installe Apache et PHP, copie les sites et protège les données. Si aucun compte n'existe encore, il **demande les mots de passe** (10 caractères au moins ; rien ne s'affiche pendant la saisie, c'est normal). Il vérifie ensuite que tout répond (une ligne « OK » par point) et affiche les adresses.

## Mettre à jour les sites

Relancez la commande d'installation, **sans nommer les sites** : le serveur se souvient de ceux choisis la première fois. Le script récupère la dernière version sur GitHub et conserve toutes les données :

- Aux Saveurs Braisées : produits, prix, stocks, catégories, compte et statistiques ;
- La Fleur d'Or : carte modifiée dans le panneau, sauvegardes et mot de passe.

## Déménager un site sur un autre serveur

Exemple : **Aux Saveurs Braisées**, d'Amazon (AWS) vers un serveur **Ubuntu chez OVH**. La Fleur d'Or reste sur AWS.

La carte, les prix, les stocks, le compte de l'espace de gestion, les statistiques **et le certificat HTTPS** sont transférés. Le site fonctionne donc en HTTPS sur le nouveau serveur avant même le changement de la zone DNS, et le passage se fait sans coupure.

### 1. Préparer le serveur OVH

Dans l'espace client OVH, notez l'**adresse IP** du serveur (IPv4). L'e-mail d'installation donne l'utilisateur (souvent `ubuntu`) et son mot de passe.

### 2. Envoyer les données depuis l'ancien serveur (AWS)

Dans un terminal sur le serveur **AWS**, collez cette commande en remplaçant `ADRESSE-IP-OVH` :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/sauvegarder.sh | sudo bash -s -- restaurant ubuntu@ADRESSE-IP-OVH
```

Répondez `yes` si une question sur l'« authenticity of host » s'affiche, puis tapez le **mot de passe du serveur OVH**. Le fichier `sauvegarde-sites.tar.gz` arrive dans le dossier personnel de `ubuntu` sur le serveur OVH.

À partir de ce moment, **ne modifiez plus la carte ni les stocks sur l'ancien serveur** : ces changements ne suivraient pas.

Si l'envoi échoue (serveur OVH sans mot de passe, avec une clé SSH seulement), passez par votre ordinateur. Dans PowerShell, sous Windows :

```powershell
scp -i $HOME\Downloads\ma-cle.pem ec2-user@13.62.163.77:sauvegarde-sites.tar.gz .
scp sauvegarde-sites.tar.gz ubuntu@ADRESSE-IP-OVH:
```

### 3. Installer le site sur le serveur OVH

Connectez-vous au serveur OVH, puis collez :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/installer.sh | sudo bash -s -- restaurant
```

Le script trouve la sauvegarde et reprend les données et le certificat. Il relie ensuite `auxsaveursbraisee.fr` au site, en HTTPS. Il ne demande aucun mot de passe : le compte de l'espace de gestion est celui de l'ancien serveur.

Vous pouvez vérifier le site par l'adresse IP : `http://ADRESSE-IP-OVH/restaurant/`.

### 4. Changer l'adresse dans la zone DNS

Espace client OVH → **Noms de domaine** → `auxsaveursbraisee.fr` → onglet **Zone DNS**. Modifiez (icône crayon) les deux enregistrements **A** :

- sous-domaine vide → `ADRESSE-IP-OVH`
- `www` → `ADRESSE-IP-OVH`

Laissez les autres enregistrements comme ils sont. S'il existe des enregistrements **AAAA** pour ces deux noms, supprimez-les.

Le changement est pris en compte en une heure environ, parfois plus. Pendant ce temps, certains visiteurs arrivent encore sur AWS, qui affiche le même site : **laissez le serveur AWS allumé un ou deux jours**.

### 5. Ensuite, sur le serveur AWS (facultatif, après quelques jours)

Retirez le domaine du restaurant, qui n'arrive plus sur ce serveur. Son certificat ne pourrait plus y être renouvelé :

```bash
sudo certbot delete --cert-name auxsaveursbraisee.fr --non-interactive
sudo rm /etc/httpd/conf.d/site-auxsaveursbraisee.fr.conf
sudo systemctl reload httpd
```

La Fleur d'Or et son domaine ne sont pas concernés.

## Sauvegarder les données

Sur le serveur :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/sauvegarder.sh | sudo bash
```

Le fichier `sauvegarde-sites.tar.gz` est créé dans votre dossier personnel. Il contient les clés des certificats HTTPS : gardez-le en lieu sûr. Pour le récupérer sur votre ordinateur, utilisez PowerShell, sous Windows :

```powershell
scp ubuntu@ADRESSE-IP:sauvegarde-sites.tar.gz $HOME\Documents\
```

Sur AWS, l'utilisateur est `ec2-user` ; ajoutez `-i chemin\vers\ma-cle.pem` après `scp`.

Pour remettre ces données sur un serveur, placez le fichier dans le dossier personnel et relancez `installer.sh`.

## Relier un nom de domaine (HTTPS)

1. **Faire pointer le domaine vers le serveur.** Dans la zone DNS du domaine, créez deux enregistrements **A** vers l'adresse IP du serveur :
   - sous-domaine vide (ou `@`) → `ADRESSE-IP`
   - `www` → `ADRESSE-IP`

   Supprimez les éventuels enregistrements A ou AAAA déjà présents pour ces deux noms.
2. **Sur AWS seulement :** dans le groupe de sécurité EC2, ajoutez **HTTPS (443) depuis « N'importe où »**. Chez OVH, rien à faire : les ports sont ouverts par défaut.
3. **Relier le domaine au site.** Depuis le terminal du serveur, lancez une commande par site :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/ajouter-domaine.sh | sudo bash -s -- restaurant auxsaveursbraisee.fr votre@email.fr
```

Remplacez `restaurant` par `fleur-dor` ou `toilettage`, puis le domaine et l'e-mail par les vôtres.

Le script vérifie que le domaine pointe vers ce serveur, puis il configure Apache et obtient le certificat HTTPS gratuit, renouvelé automatiquement. Il redirige aussi le HTTP vers le HTTPS et vérifie que le site répond.

Ensuite, **changez les mots de passe** depuis l'administration de chaque site : avant le HTTPS, ils circulaient sans chiffrement.

## Se connecter au serveur

- **OVH (Ubuntu)** : dans PowerShell, sous Windows, tapez `ssh ubuntu@ADRESSE-IP`, puis le mot de passe reçu par e-mail.
- **AWS** : dans la console EC2, sélectionnez l'instance, puis **Se connecter → EC2 Instance Connect → Se connecter**. Un terminal s'ouvre dans le navigateur.

### Créer un serveur sur AWS (rappel)

1. **Lancer une instance** :
   - image **Amazon Linux 2023** ;
   - type **t3.micro** ;
   - paire de clés : créez-en une (fichier `.pem`) ;
   - groupe de sécurité : autorisez **SSH (22)** et **HTTP (80)** depuis « N'importe où ».
2. **Adresse IP Elastic** : *Réseau et sécurité → Adresses IP Elastic → Allouer*, puis *Associer* à l'instance. Sans elle, l'adresse change à chaque redémarrage.

## À savoir

- **Pas de HTTPS sans nom de domaine** : en HTTP, les mots de passe ne sont pas chiffrés sur le réseau. Évitez de vous connecter depuis un Wi-Fi public tant que le HTTPS n'est pas en place.
- **Mises à jour de sécurité du système**, de temps en temps : `sudo apt update && sudo apt upgrade -y` sur Ubuntu, `sudo dnf upgrade -y` sur Amazon Linux.
- **En cas de problème** : `sudo tail -n 30 /var/log/apache2/error.log` sur Ubuntu, `sudo tail -n 30 /var/log/httpd/error_log` sur Amazon Linux.
