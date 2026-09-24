# Mise en ligne sur Amazon Linux 2023 (avec une adresse IP)

Un seul serveur héberge les trois sites, dans des sous-dossiers de son adresse IP :

| Site | Adresse | Administration |
|---|---|---|
| Aux Saveurs Braisées | `http://ADRESSE-IP/restaurant/` | `http://ADRESSE-IP/restaurant/admin/` |
| La Fleur d'Or | `http://ADRESSE-IP/fleur-dor/` | `http://ADRESSE-IP/fleur-dor/admin/` |
| Salon de toilettage | `http://ADRESSE-IP/toilettage/` | |

`http://ADRESSE-IP/` affiche une page avec un lien vers chacun.

Le script récupère les sites directement sur GitHub :

- `Site-internet-aux-saveurs-brais-e`, branche `claude/pet-grooming-landing-page-po26m7` (restaurant et salon) ;
- `Fleur-d-or`, branche `claude/practical-mendel-dpj572`.

Pour changer de branche, modifiez les variables en haut du script.

## 1. Créer le serveur (console AWS, service EC2)

1. **Lancer une instance** :
   - Image : **Amazon Linux 2023**
   - Type : **t3.micro**
   - Paire de clés : créez-en une (fichier `.pem`) et gardez-la précieusement
   - Groupe de sécurité : autorisez **SSH (22)** et **HTTP (80) depuis « N'importe où »**. Pour SSH, « N'importe où » permet d'utiliser le terminal dans le navigateur (étape 2) ; la connexion reste protégée par la clé.
2. **Adresse IP Elastic** : menu *Réseau et sécurité → Adresses IP Elastic → Allouer*, puis *Associer* à l'instance. Sans elle, l'adresse IP change à chaque redémarrage.

## 2. Installer les sites

Ouvrez un terminal sur le serveur. Le plus simple : dans la console EC2, sélectionnez l'instance, **Se connecter → EC2 Instance Connect → Se connecter**. Un terminal s'ouvre dans le navigateur.

Collez cette commande :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/installer-amazon-linux.sh | sudo bash
```

Le script installe Apache et PHP, copie les trois sites, protège les données, puis **demande les mots de passe** :

- l'identifiant et le mot de passe de l'espace de gestion d'Aux Saveurs Braisées ;
- le mot de passe du panneau de La Fleur d'Or.

Les caractères ne s'affichent pas pendant la saisie, c'est normal. Il faut 10 caractères au moins.

Il vérifie ensuite que tout répond (une ligne « OK » par point) et affiche les adresses des sites.

## Mettre à jour les sites

Relancez **la même commande**. Le script récupère la dernière version sur GitHub et conserve toutes les données :

- Aux Saveurs Braisées : produits, prix, stocks, catégories et compte ;
- La Fleur d'Or : carte modifiée dans le panneau, sauvegardes et mot de passe (la page est régénérée avec la carte actuelle).

## Sauvegarder les données

```bash
sudo tar czf ~/sauvegarde-$(date +%F).tar.gz /var/www/html/restaurant/data /var/www/html/fleur-dor/donnees
```

Puis, depuis Windows (PowerShell) :

```powershell
scp -i $HOME\Downloads\ma-cle.pem ec2-user@ADRESSE-IP:~/sauvegarde-*.tar.gz $HOME\Documents\
```

## Quand vous aurez les noms de domaine

Chaque site peut recevoir son propre nom de domaine, en HTTPS. Les sites restent aussi accessibles par l'adresse IP.

1. **Acheter le domaine** chez un registraire (OVH, Gandi, IONOS… ou Route 53 dans AWS).
2. **Le faire pointer vers le serveur** : dans la zone DNS du domaine, créez deux enregistrements **A** vers l'adresse IP Elastic :
   - sous-domaine vide (ou `@`) → `ADRESSE-IP`
   - `www` → `ADRESSE-IP`

   Supprimez les éventuels enregistrements A ou AAAA déjà présents pour ces deux noms. La prise en compte prend de quelques minutes à quelques heures.
3. **Ouvrir le HTTPS** : dans le groupe de sécurité EC2, ajoutez **HTTPS (443) depuis « N'importe où »**.
4. **Relier le domaine au site**, depuis le terminal du serveur (une commande par site) :

```bash
curl -fsSL https://raw.githubusercontent.com/laurenttranchard9-beep/Site-internet-aux-saveurs-brais-e/claude/pet-grooming-landing-page-po26m7/deploiement/ajouter-domaine.sh | sudo bash -s -- restaurant auxsaveursbraisees.fr votre@email.fr
```

Remplacez `restaurant` par `fleur-dor` ou `toilettage`, le domaine par le vôtre, et l'e-mail par le vôtre (Let's Encrypt y prévient si un certificat risque d'expirer).

Le script vérifie que le domaine pointe bien vers ce serveur, configure Apache, obtient le certificat HTTPS gratuit (renouvelé automatiquement), redirige le HTTP vers le HTTPS, puis vérifie que le site répond.

Ensuite, **changez les mots de passe** depuis l'administration de chaque site : avant le HTTPS, ils circulaient sans chiffrement.

## À savoir

- **Pas de HTTPS sans nom de domaine** : les certificats gratuits (Let's Encrypt) demandent un nom de domaine. En HTTP, les mots de passe ne sont pas chiffrés sur le réseau : évitez de vous connecter depuis un Wi-Fi public, et changez-les une fois le HTTPS en place.
- **Mises à jour de sécurité** du serveur : `sudo dnf upgrade -y` de temps en temps.
- En cas de problème : `sudo tail -n 30 /var/log/httpd/error_log`.
