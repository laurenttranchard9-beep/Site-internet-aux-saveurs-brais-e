# Mise en ligne des sites (Ubuntu, Debian ou Amazon Linux 2023)

Cinq sites peuvent être installés sur un serveur, dans des sous-dossiers de son adresse IP :

| Site | Nom dans les scripts | Adresse | Administration |
|---|---|---|---|
| Aux Saveurs Braisées | `restaurant` | `http://ADRESSE-IP/restaurant/` | `http://ADRESSE-IP/restaurant/admin/` |
| Aux Saveurs du Cambodge | `cambodge` | `http://ADRESSE-IP/cambodge/` | `http://ADRESSE-IP/cambodge/admin/` |
| WOK 888 | `wok888` | `http://ADRESSE-IP/wok888/` | `http://ADRESSE-IP/wok888/admin/` |
| La Fleur d'Or | `fleur-dor` | `http://ADRESSE-IP/fleur-dor/` | `http://ADRESSE-IP/fleur-dor/admin/` |
| Salon de toilettage | `toilettage` | `http://ADRESSE-IP/toilettage/` | |

`http://ADRESSE-IP/` affiche une page avec un lien vers chaque site installé. Avec un nom de domaine, chaque site a aussi sa propre adresse en HTTPS (voir plus bas).

Les scripts récupèrent les sites directement sur GitHub :

- `Site-internet-aux-saveurs-brais-e`, branche `claude/relaxed-allen-03uwo8` (Aux Saveurs Braisées, Aux Saveurs du Cambodge, WOK 888, le salon et ces scripts) ;
- `Fleur-d-or`, branche `claude/practical-mendel-dpj572`.

| Script | Rôle |
|---|---|
| `installer.sh` | installe ou met à jour les sites ; reprend les données d'un ancien serveur |
| `ajouter-domaine.sh` | relie un nom de domaine à un site, avec HTTPS |
| `sauvegarder.sh` | sauvegarde les données, et peut les envoyer sur un nouveau serveur |

## Ajouter WOK 888 sur un serveur qui a déjà des sites

Sur le serveur (connexion : voir « Se connecter au serveur » plus bas), collez cette commande :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/installer.sh | sudo bash -s -- wok888
```

- **Les sites déjà installés par ces scripts restent en place avec toutes leurs données** (cartes, prix, stocks, comptes, statistiques, carte de La Fleur d'Or) ; ils sont seulement mis à jour vers leur dernière version, comme lors d'une mise à jour normale. La page d'accueil `http://ADRESSE-IP/` gagne un lien vers WOK 888.
- **Les sites installés autrement** (configurés à la main) ne sont pas touchés : leur page d'accueil `/var/www/html/index.html` et leurs hôtes virtuels sont conservés. Si le port 80 est tenu par un autre serveur web qu'Apache (nginx…), le script s'arrête sans rien modifier.
- **L'adresse IP est reliée au dossier des sites** (hôte virtuel `zzz-adresse-ip`, chargé après les autres). Sur un serveur partagé, elle affichait parfois le premier site configuré, La Fleur d'Or par exemple, et `http://ADRESSE-IP/wok888/` répondait « Not Found ». Désormais `http://ADRESSE-IP/` affiche la page « Nos sites » et chaque site répond dans son dossier ; les sites reliés à un nom de domaine (`https://www.fleurdor31.fr/`…) ne changent pas.
- Le script demande l'**identifiant** et le **mot de passe** de l'espace de gestion de WOK 888 (10 caractères au moins ; rien ne s'affiche pendant la saisie, c'est normal), puis vérifie que tout répond : une ligne « OK » par point, pour chaque site.

WOK 888 est alors en ligne à l'adresse `http://ADRESSE-IP/wok888/`, son espace de gestion à `http://ADRESSE-IP/wok888/admin/`.

**À partir de maintenant, utilisez les commandes de cette page** (branche `claude/relaxed-allen-03uwo8`) pour les mises à jour : l'ancienne commande, avec `claude/pet-grooming-landing-page-po26m7`, ne connaît pas WOK 888 et s'arrêterait sur une erreur.

### `http://ADRESSE-IP/wok888/` répond « Not Found »

L'adresse IP affiche un autre site du serveur (sa page d'accueil n'est pas « Nos sites ») et la commande a été lancée avec une version plus ancienne du script, qui ne reliait pas l'adresse IP aux sites. Relancez la commande ci-dessus : à l'étape 5, le script écrit « Adresse IP … : reliée au dossier des sites », et à l'étape 7 toutes les lignes sont « OK ». Si une ligne « ÉCHEC » reste, envoyez le résultat de `sudo apache2ctl -S`.

### Relier le domaine wok888.fr

Tant que la zone DNS de `wok888.fr` n'a pas changé, l'ancien site WordPress reste en ligne : vérifiez d'abord le nouveau site par l'adresse IP.

1. Chez le registraire de `wok888.fr`, dans la zone DNS : les enregistrements **A** de `@` et de `www` pointent vers l'adresse IP du serveur. Supprimez les éventuels enregistrements **AAAA** de ces deux noms ; laissez la messagerie (**MX**, **TXT**) telle quelle.
2. Une heure environ après, sur le serveur :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/ajouter-domaine.sh | sudo bash -s -- wok888 wok888.fr votre@email.fr
```

Le HTTPS est mis en place et renouvelé automatiquement ; les domaines des autres sites ne changent pas. Si le script répond que le domaine pointe encore vers une autre adresse, attendez un peu et relancez la même commande. Changez ensuite le mot de passe de l'espace de gestion : avant le HTTPS, il circulait sans chiffrement.

### Ajouter des photos à la galerie

Les photos (JPG, PNG ou WebP) se déposent dans `/var/www/html/wok888/photos/` ; le nom du fichier sert de légende (`01-wok-aux-crevettes.jpg` s'affiche « Wok aux crevettes »). Depuis votre ordinateur, dans PowerShell sous Windows :

```powershell
scp 01-wok-aux-crevettes.jpg ubuntu@ADRESSE-IP:
```

puis sur le serveur :

```bash
sudo mv ~/01-wok-aux-crevettes.jpg /var/www/html/wok888/photos/
```

Les mises à jour du site ne les effacent pas, et `sauvegarder.sh` les sauvegarde avec la carte.

## Installer les sites

Ouvrez un terminal sur le serveur (voir « Se connecter au serveur » plus bas) et collez :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/installer.sh | sudo bash
```

Sur un serveur neuf, cette commande installe Aux Saveurs Braisées, La Fleur d'Or et le salon. Pour n'installer que certains sites, nommez-les à la fin, après `bash -s --` :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/installer.sh | sudo bash -s -- restaurant
```

Le script installe Apache et PHP, copie les sites et protège les données. Si aucun compte n'existe encore, il **demande les mots de passe** (10 caractères au moins ; rien ne s'affiche pendant la saisie, c'est normal). Il vérifie ensuite que tout répond (une ligne « OK » par point) et affiche les adresses.

## Mettre à jour les sites

Relancez la commande d'installation, **sans nommer les sites** : le serveur se souvient de ceux qui y sont installés (liste dans `/opt/sites/sites-installes`). Le script récupère la dernière version sur GitHub et conserve toutes les données :

- Aux Saveurs Braisées, Aux Saveurs du Cambodge et WOK 888 : produits, prix, stocks, catégories, compte et statistiques ; pour WOK 888, les photos de la galerie aussi ;
- La Fleur d'Or : carte modifiée dans le panneau, sauvegardes et mot de passe.

Pour **ajouter un site** sur un serveur déjà installé, nommez-le : il s'ajoute aux autres. Par exemple, `… | sudo bash -s -- cambodge` ou `… | sudo bash -s -- wok888`.

## Aux Saveurs du Cambodge : quitter Squarespace

Le nouveau site remplace celui de Squarespace sur le même nom de domaine, `auxsaveursducambodge-saintalban.com`. Il peut être installé sur le serveur OVH qui héberge déjà Aux Saveurs Braisées.

### 1. Installer le site et le vérifier

Sur le serveur OVH, collez :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/installer.sh | sudo bash -s -- cambodge
```

Le script demande l'identifiant et le mot de passe de l'espace de gestion du nouveau site. Les autres sites du serveur ne sont pas touchés.

Ouvrez ensuite `http://ADRESSE-IP-OVH/cambodge/` pour voir le site, et `http://ADRESSE-IP-OVH/cambodge/admin/` pour vérifier la carte et les prix. Tant que le domaine n'a pas changé, l'ancien site Squarespace reste en ligne.

### 2. Faire pointer le domaine vers le serveur

Le domaine est géré chez Squarespace (anciennement Google Domains) : **Paramètres → Domaines → auxsaveursducambodge-saintalban.com → Paramètres DNS**. En octobre 2026, ses enregistrements étaient :

| Nom | Type | Valeur actuelle (Squarespace) | Nouvelle valeur |
|---|---|---|---|
| `@` | A | `198.49.23.144`, `198.49.23.145`, `198.185.159.144`, `198.185.159.145` | une seule : `ADRESSE-IP-OVH` |
| `www` | CNAME | `ext-sq.squarespace.com` | à remplacer par un enregistrement **A** → `ADRESSE-IP-OVH` |

Squarespace regroupe parfois ces lignes sous « Squarespace Defaults » : supprimez ce groupe, puis ajoutez les deux enregistrements A. S'il existe des enregistrements de messagerie (**MX**, **TXT**), laissez-les tels quels.

### 3. Activer le HTTPS

Une heure environ après le changement, sur le serveur OVH :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/ajouter-domaine.sh | sudo bash -s -- cambodge auxsaveursducambodge-saintalban.com votre@email.fr
```

Si le script répond que le domaine pointe encore vers une autre adresse, attendez un peu et relancez la même commande.

### 4. Ensuite

- Gardez le **domaine** (son renouvellement annuel), mais vous pouvez arrêter l'**abonnement au site** Squarespace.
- Dans Google Search Console ou la fiche Google du restaurant, indiquez l'adresse du site : `https://www.auxsaveursducambodge-saintalban.com/`.

## Déménager un site sur un autre serveur

Exemple : **Aux Saveurs Braisées**, d'Amazon (AWS) vers un serveur **Ubuntu chez OVH**. La Fleur d'Or reste sur AWS.

La carte, les prix, les stocks, le compte de l'espace de gestion, les statistiques **et le certificat HTTPS** sont transférés. Le site fonctionne donc en HTTPS sur le nouveau serveur avant même le changement de la zone DNS, et le passage se fait sans coupure.

### 1. Préparer le serveur OVH

Dans l'espace client OVH, notez l'**adresse IP** du serveur (IPv4). L'e-mail d'installation donne l'utilisateur (souvent `ubuntu`) et son mot de passe.

### 2. Envoyer les données depuis l'ancien serveur (AWS)

Dans un terminal sur le serveur **AWS**, collez cette commande en remplaçant `ADRESSE-IP-OVH` :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/sauvegarder.sh | sudo bash -s -- restaurant ubuntu@ADRESSE-IP-OVH
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
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/installer.sh | sudo bash -s -- restaurant
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
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/sauvegarder.sh | sudo bash
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
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/relaxed-allen-03uwo8/deploiement/ajouter-domaine.sh | sudo bash -s -- restaurant auxsaveursbraisee.fr votre@email.fr
```

Remplacez `restaurant` par `cambodge`, `wok888`, `fleur-dor` ou `toilettage`, puis le domaine et l'e-mail par les vôtres.

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
