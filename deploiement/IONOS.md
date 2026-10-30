# Mettre un site sur un hébergement web IONOS

Pour l'offre **Hébergement Web** d'IONOS (pas de serveur à administrer) : on envoie les fichiers du site dans le dossier du domaine, et c'est tout. Les domaines `auxsaveursbraisee.fr` et `fleurdor31.fr` sont déjà reliés à cet hébergement : ils affichent « 403 Forbidden » tant que leur dossier est vide.

Il vous faut :

- le paquet du site : **`aux-saveurs-braisees.zip`** (Aux Saveurs Braisées) ou **`wok888.zip`**. Pour les refaire après une modification : `bash deploiement/paquets-hebergement.sh` (ils arrivent dans `paquets/`) ;
- **FileZilla**, gratuit : <https://filezilla-project.org/> (« FileZilla Client ») ;
- votre accès à l'espace client IONOS.

## 1. Relier le domaine à un dossier

Espace client IONOS → **Domaines & SSL** → cliquez sur `auxsaveursbraisee.fr` → modifiez sa **destination** (ou son **utilisation**) : **Webspace**, puis un dossier à son nom, par exemple `auxsaveursbraisee` (créez-le s'il n'existe pas) → enregistrez.

Chaque domaine a son propre dossier : plus tard, `fleurdor31.fr` → `fleurdor31`, `wok888.eu` → `wok888`.

## 2. Activer le certificat SSL (https)

Espace client → **Domaines & SSL** → **Certificats SSL** : **Gérer** → **Configurer un certificat SSL** → **Activer maintenant** sur le certificat inclus dans votre offre → choisissez le domaine → utilisation : **« Utiliser pour mon site Web IONOS »** (pas « mon propre serveur ») → acceptez les conditions → **Configurer le certificat SSL**. Chaque domaine a besoin du sien : refaites-le pour chaque domaine.

Tant que le certificat n'est pas installé, `http://` marche mais `https://` affiche une erreur (« Ce site ne peut pas fournir de connexion sécurisée »).

## 3. Choisir la version de PHP

Espace client → **Hébergement** → **PHP** (paramètres PHP) : choisissez **PHP 8.3** (8.1 au minimum) pour ce dossier ou pour tout l'hébergement.

## 4. Récupérer l'accès SFTP

Espace client → **Hébergement** → **SFTP & SSH** : créez un accès si besoin, et notez le **serveur** (du type `access123456789.webspace-data.io`), l'**identifiant** et le **mot de passe** (port **22**). IONOS propose aussi un fichier de configuration à importer dans FileZilla.

## 5. Envoyer les fichiers

1. Sur l'ordinateur, faites clic droit sur `aux-saveurs-braisees.zip` → **Extraire tout**.
2. Ouvrez FileZilla. En haut : Hôte `sftp://` suivi du serveur, l'identifiant, le mot de passe, port `22`, puis **Connexion rapide** (acceptez la clé du serveur la première fois).
3. À droite (l'hébergement), ouvrez le dossier `auxsaveursbraisee`. À gauche (votre ordinateur), ouvrez le dossier extrait.
4. À gauche, sélectionnez **tout** (Ctrl + A : les dossiers `admin`, `data`, `inc`…, les fichiers, et `.htaccess`) et faites-les glisser à droite.

## 6. Vérifier, puis créer le compte de gestion

1. Ouvrez **`https://auxsaveursbraisee.fr/verifier.php`** (avec `http://` si le certificat n'est pas encore prêt) : chaque ligne doit être verte. Si c'est le cas, la page se supprime d'elle-même ; sinon, elle dit quoi régler.
2. Ouvrez **tout de suite** `https://auxsaveursbraisee.fr/admin/` et créez votre compte (identifiant et mot de passe de 10 caractères au moins). Tant que ce n'est pas fait, la première personne qui ouvre cette page peut le créer.
3. `https://auxsaveursbraisee.fr/` affiche la carte.

## En cas de problème

- **« 403 Forbidden » sur la page d'accueil** : les fichiers ne sont pas dans le dossier relié au domaine (étape 1), ou ils sont dans un sous-dossier : `index.html` doit être directement dans `auxsaveursbraisee`.
- **« 500 Internal Server Error »** : dans FileZilla, clic droit sur le fichier `.htaccess` du dossier → **Afficher/Éditer**, supprimez la ligne `Options -Indexes`, enregistrez et renvoyez-le.
- **La carte reste vide** : ouvrez `https://auxsaveursbraisee.fr/api.php?action=menu` ; un message d'erreur indique ce qui manque (souvent la version de PHP, étape 3).
- **`https://` affiche une erreur alors que `http://` marche** : IONOS n'a pas de certificat installé pour ce domaine. Dans **Domaines & SSL** → **Certificats SSL** → **Gérer** : si le domaine n'est pas dans la liste, configurez son certificat (étape 2) ; si son état est « Prêt » avec « Vous pouvez l'installer sur vos serveurs », il a été créé pour un autre serveur : onglet **Paramètres avancés**, changez son utilisation pour votre **site Web IONOS** (IONOS le refait et l'installe) ; s'il est en cours de création, patientez ; une icône d'avertissement dans la colonne **Statut** signale une création bloquée : passez la souris dessus et donnez le numéro de commande affiché au support d'IONOS.

## Mises à jour et sauvegarde

- Pour une mise à jour du site, renvoyez le contenu d'un nouveau paquet par-dessus l'ancien (FileZilla demande : **Écraser**). Le paquet ne contient pas de base de données : la carte, les prix, le compte et les statistiques sont gardés.
- La base est le fichier `restaurant-….sqlite` du dossier `data/` : ne le supprimez jamais. Pour une sauvegarde, téléchargez de temps en temps le dossier `data/` avec FileZilla.

## Ce qui a été repris de l'ancien serveur

L'ancien serveur (OVH) répondait encore le 30 octobre 2026 : les cartes d'Aux Saveurs Braisées et de WOK 888 y étaient identiques à celles de ce dépôt, rien n'est donc perdu. Le compte de gestion et les statistiques de visite, qui ne se récupèrent pas sans accès au serveur, repartent de zéro. Les mentions légales d'Aux Saveurs Braisées indiquent désormais IONOS comme hébergeur.
