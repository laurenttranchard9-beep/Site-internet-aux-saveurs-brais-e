<?php
// Carte de WOK 888 (Seilh), reprise de l'ancien site wok888.fr et relue : orthographe, présentation.
// Chargée automatiquement dans la base à la première ouverture du site, ensuite modifiable depuis l'espace de gestion.
// Format : 'Catégorie' => [[nom, description, prix en centimes (null = sur demande), étiquettes], ...]
//
// Catégories : « Univers · Sous-catégorie ». Le site regroupe les sous-catégories d'un même univers dans un onglet
// (Entrées, Japonais, Boissons…). Une catégorie sans « · » forme un univers à elle seule (Côté wok, Poké bowls).
//
// Étiquettes particulières (non affichées comme filtres) :
//   « À la une »   : le plat est mis en avant dans la section « À la une » ;
//   « Base »       : base au choix du wok à composer (nouilles, riz…) : une seule par wok ;
//   « Supplément » : option du wok à composer (œuf bio).

// Version 2 : sans la commande en ligne (étiquettes « Sur place » retirées).
const CARTE_VERSION = 2;

// Note affichée sous le titre de la catégorie (facultatif).
function carte_notes(): array
{
    return [
        'Entrées · Grillades' => 'Brochettes à la pièce.',
        'Entrées · Tapas à partager' => 'Nems et samoussas faits maison.',
        'Côté wok' => 'Légumes inclus : oignon, brocoli, chou-fleur, courgettes, carottes.',
        'Poké bowls' => 'Base : riz vinaigré, brocoli, chou-fleur, avocat, mayonnaise maison et sauce noire.',
        'Nos plats · Spécialités' => 'Servis sans accompagnement.',
        'Japonais · Sushis' => 'Prix à la pièce.',
        'Japonais · Makis' => 'Par 3 pièces.',
        'Japonais · Sashimis' => 'Par 3 pièces.',
        'Japonais · Crunchis' => 'Par 3 pièces.',
        'Japonais · Snow rolls' => "Par 3 pièces, sans feuille d'algue.",
        'Japonais · California' => 'Par 3 pièces.',
        'Menus · Menu du jour' => 'Uniquement le midi, sauf les week-ends et les jours fériés.',
        'Menus · Menus japonais' => 'Servis avec une soupe miso et une salade de chou.',
        'Desserts · Glaces' => 'Parfums : vanille, chocolat, fraise, citron, mangue, framboise.',
        'Boissons · Spiritueux' => 'Le verre de 4 cl. Supplément soft : 1,50 €.',
        'Boissons · Vins rouges' => 'La bouteille de 75 cl.',
        'Boissons · Vins blancs' => 'La bouteille de 75 cl.',
        'Boissons · Vins rosés' => 'La bouteille de 75 cl.',
        'Boissons · Pétillants & champagne' => 'La bouteille de 75 cl.',
        'Boissons · Vins au verre' => 'Le verre de 12,5 cl.',
    ];
}

function carte(): array
{
    return [
        'Entrées · Grillades' => [
            ['Brochette de poulet', '1 pièce.', 390, ''],
            ['Brochette de bœuf', '1 pièce.', 430, ''],
            ['Brochette de crevettes', '1 pièce.', 490, ''],
            ['Brochette de canard', '1 pièce.', 510, ''],
            ['Brochette de champignons', '1 pièce.', 370, ''],
            ['Brochette de courgettes', '1 pièce.', 330, ''],
            ["Brochette d'encornet", '1 pièce.', 600, ''],
        ],
        'Entrées · Spécialités vapeur' => [
            ['Bouchées aux crevettes', '5 pièces.', 690, ''],
            ['Bouchées au porc', '5 pièces.', 650, ''],
            ['Ha kao aux crevettes', '5 pièces.', 690, ''],
            ['Mélange vapeur', '6 pièces : 2 bouchées aux crevettes, 2 bouchées au porc, 2 ha kao.', 790, ''],
            ['Gyozas aux légumes', '4 pièces.', 710, ''],
        ],
        'Entrées · Soupes & potages' => [
            ['Potage épicé pékinois au crabe', 'Chair de crabe, champignons noirs, pousses de bambou.', 890, 'Épicé'],
            ['Potage épicé pékinois au poulet', 'Blanc de poulet émincé, champignons noirs, pousses de bambou.', 800, 'Épicé'],
            ['Soupe de raviolis', 'Raviolis aux crevettes, crevettes, chou chinois.', 890, ''],
            ['Soupe miso', '', 410, ''],
            ['Soupe miso au crabe', '', 650, ''],
            ['Soupe miso aux crevettes', '', 690, ''],
        ],
        'Entrées · Tapas à partager' => [
            ['Nem au porc', '1 pièce.', 160, 'Fait maison'],
            ['Nem au poulet', '1 pièce.', 160, 'Fait maison'],
            ['Nem aux crevettes', '1 pièce.', 160, 'Fait maison'],
            ['Samoussa au bœuf', '1 pièce.', 180, 'Fait maison'],
            ['Beignets de poulet', '4 pièces.', 600, ''],
            ['Beignets de crevettes', '3 pièces.', 550, ''],
            ['Ebi tempura', '3 pièces.', 650, ''],
            ['Millefeuille aux Saint-Jacques', '1 pièce.', 890, ''],
            ['Feuille de riz croustillante', 'Guacamole et crevettes, 1 pièce.', 690, ''],
            ['Riz frit au saumon, thon et chair de crabe', '1 pièce.', 790, ''],
            ['Porc croustillant', '4 pièces.', 700, ''],
        ],
        'Entrées · Assiettes composées' => [
            ['Assiette composée pour 1 personne', '7 pièces : nem au porc, nem au poulet, beignet de crevette, samoussa au bœuf, brochettes de champignon, de courgette et de poulet.', 1100, ''],
            ['Assiette à partager pour 2 personnes', '14 pièces : nems au porc, nems au poulet, beignets de crevette, samoussas au bœuf, brochettes de champignon, de courgette et de poulet.', 2000, ''],
        ],
        'Entrées · Salades' => [
            ['Bò bún nem au porc', 'Nem maison, lamelles de porc sauté, oignons, chou, pousses de soja, carottes, salade.', 990, ''],
            ['Bò bún nem au poulet', 'Nem maison, lamelles de poulet sauté, oignons, chou, pousses de soja, carottes, salade.', 990, ''],
            ['Bò bún nem aux crevettes', 'Nem maison, crevettes sautées, oignons, chou, pousses de soja, carottes, salade.', 1000, ''],
            ['Grande salade exotique', 'Crabe, surimi, crevettes, chou, pousses de soja, carottes, salade, ananas.', 1300, ''],
            ['Grande salade chinoise', 'Chou, pousses de soja, carottes, salade.', 1000, ''],
            ['Salade de chou', '', 410, ''],
            ['Salade de chou aux crevettes', '', 690, ''],
        ],
        // Le wok à composer : une garniture (sans étiquette), une « Base » au choix, des « Supplément » facultatifs.
        'Côté wok' => [
            ['Wok au poulet', '', 1590, ''],
            ['Wok au porc', '', 1590, ''],
            ['Wok au bœuf', '', 1690, ''],
            ['Wok aux crevettes', '', 1790, ''],
            ['Wok au canard', '', 1790, ''],
            ['Wok lok lak', '', 1750, ''],
            ['Nouilles', 'À base de fécule de pomme de terre.', 0, 'Base'],
            ['Riz nature', '', 0, 'Base'],
            ['Riz sauté aux crevettes et surimi', 'Champignons de Paris, céleri, surimi, crevettes.', 150, 'Base'],
            ['Œuf bio', '', 250, 'Supplément'],
        ],
        'Poké bowls' => [
            ['Poké bowl saumon', '', 1250, ''],
            ['Poké bowl thon', '', 1310, ''],
            ['Poké bowl mixte', '', 1370, ''],
            ['Poké bowl poulet', '', 1250, ''],
            ['Poké bowl du moment', 'Demandez-nous la recette du moment.', 1400, ''],
        ],
        'Nos plats · Spécialités' => [
            ['Poulet frit au curry', 'Cuisse de poulet désossée et panée.', 1250, ''],
            ["Porc croustillant à l'aigre-douce", 'Porc mariné, oignons, brocolis, chou-fleur, courgettes, carottes, poivrons, ananas.', 1310, ''],
            ['Canard laqué', 'Magret mariné, oignons, brocolis, chou-fleur, courgettes, carottes, poivrons, pousses de soja.', 1390, ''],
            ['Poulet au basilic thaï', 'Poulet mariné au basilic thaï, oignons, brocolis, chou-fleur, courgettes, carottes, poivrons, ananas.', 1150, ''],
            ["Poulet frit à l'aigre-douce", 'Cuisse de poulet désossée et panée, oignons, brocolis, chou-fleur, courgettes, carottes, poivrons, ananas.', 1250, ''],
            ["Poulet à l'ananas", 'Blanc de poulet, oignons, brocolis, chou-fleur, courgettes, carottes, poivrons, ananas.', 1150, ''],
            ['Fruits de mer à la plancha', '', 1590, ''],
        ],
        'Nos plats · Accompagnements' => [
            ['Riz nature', '', 350, ''],
            ['Riz sauté aux crevettes et surimi', 'Champignons de Paris, céleri, surimi, crevettes.', 600, ''],
            ['Riz sauté thaï épicé', 'Piment, champignons de Paris, céleri, surimi, crevettes.', 700, 'Épicé'],
            ['Riz vinaigré', '', 400, ''],
            ['Sauté de légumes', 'Oignons, brocolis, chou-fleur, courgettes, carottes.', 500, ''],
        ],
        'Japonais · Sushis' => [
            ['Sushi saumon', '', 290, ''],
            ['Sushi thon', '', 310, ''],
            ['Sushi poulet', '', 210, ''],
            ['Sushi avocat', '', 190, ''],
            ['Sushi saumon-avocat', '', 330, ''],
            ['Sushi saumon-cheese', '', 330, ''],
            ['Sushi hana', 'Saumon, thon, chair de crabe, crevette, avocat.', 600, ''],
        ],
        'Japonais · Makis' => [
            ['Maki saumon', '', 330, ''],
            ['Maki thon', '', 330, ''],
            ['Maki thon mayonnaise', '', 330, ''],
            ['Maki concombre-cheese', '', 330, ''],
            ['Maki avocat', '', 210, ''],
            ['Maki concombre', '', 330, ''],
            ['Maki crevette', '', 330, ''],
            ['Maki ebi tempura', '', 330, ''],
        ],
        'Japonais · Chirashis' => [
            ['Chirashi saumon-avocat', '', 1690, ''],
            ['Chirashi thon-avocat', '', 1790, ''],
            ['Chirashi mixte', '', 1900, ''],
            ['Chirashi du moment', 'Demandez-nous la recette du moment.', 1990, ''],
        ],
        'Japonais · Sashimis' => [
            ['Sashimi saumon', '', 510, ''],
            ['Sashimi thon', '', 520, ''],
            ['Sashimi mixte', '', 610, ''],
            ['Sashimi daurade', '', 490, ''],
        ],
        'Japonais · Crunchis' => [
            ['Crunchi saumon', '', 550, ''],
            ['Crunchi thon', '', 550, ''],
            ['Crunchi ebi', '', 550, ''],
            ['Crunchi saumon frit', '', 550, ''],
            ['Crunchi poulet', '', 550, ''],
            ['Crunchi surimi', '', 550, ''],
            ['Crunchi avocat', '', 550, ''],
            ['Crunchi concombre', '', 550, ''],
        ],
        'Japonais · Snow rolls' => [
            ['Snow rolls avocat-cheese', '', 330, ''],
            ['Snow rolls saumon-avocat-cheese', '', 430, ''],
        ],
        'Japonais · California' => [
            ['California avocat-saumon', '', 420, ''],
            ['California avocat-thon', '', 430, ''],
            ['California avocat-surimi', '', 420, ''],
            ['California avocat-saumon-cheese', '', 490, ''],
            ['California avocat-ebi tempura', '', 500, ''],
            ['California avocat-thon frit', '', 490, ''],
            ['California avocat-saumon frit', '', 460, ''],
            ['California avocat-foie gras', '', 570, ''],
            ['California avocat, thon et foie gras', '', 690, ''],
        ],
        'Menus · Menus japonais' => [
            ['Menu Royal 888', '42 pièces : 6 california saumon-avocat, 6 california ebi tempura, 6 makis avocat, 6 makis concombre, 4 sashimis saumon, 4 sashimis thon, 4 sashimis daurade, 2 brochettes de bœuf, 2 de champignon, 2 de courgette. Ananas ou coupe de fruits frais.', 6000, 'À la une'],
            ['Menu Duo', '16 pièces : 3 makis avocat, 3 california saumon-avocat, 4 sushis (saumon, thon, daurade, du moment), 3 sashimis (saumon, thon, daurade), 3 brochettes (poulet, champignon, courgette). Coupe de fruits frais.', 2700, 'À la une'],
            ['Menu Maki', '24 pièces : 6 makis avocat, 6 makis concombre, 6 california avocat-surimi, 6 california avocat-saumon.', 2490, 'À la une'],
            ['Menu Sushi', '11 pièces : 3 sushis saumon, 3 sushis thon, 3 sushis daurade, 2 sushis du moment.', 2290, 'À la une'],
        ],
        'Menus · Menu du jour' => [
            ['Menu du jour entrée + plat', '', 1390, ''],
            ['Menu du jour plat + dessert', '', 1390, ''],
            ['Menu du jour entrée + plat + dessert', '', 1690, ''],
        ],
        'Desserts · Douceurs' => [
            ['Banane grillée', 'Nappée de caramel, avec une boule de glace vanille.', 700, ''],
            ['Beignet', "Aux pommes, aux bananes ou à l'ananas. Flambé : 1,50 € de plus.", 690, ''],
            ['Assortiment de beignets', '', 790, ''],
            ['Perles de coco', '', 600, ''],
            ['Mochis', '3 pièces : vanille, mangue, coco ou chocolat.', 790, ''],
            ['Tapioca banane', '', 700, ''],
            ['Tapioca mangue', '', 710, ''],
            ['Nougatine', 'Molle, dure ou au gingembre.', 590, ''],
            ['Ananas frais', '', 690, ''],
            ['Mangue fraîche', '', 690, ''],
            ['Salade de fruits frais', '', 560, ''],
            ['Café gourmand', '', 800, ''],
            ['Champagne gourmand', '', 1100, ''],
            ['Colonel chinois', 'Au saké.', 690, ''],
            ['Colonel normand', 'À la vodka.', 660, ''],
        ],
        'Desserts · Glaces' => [
            ['Glace 1 boule', '', 250, ''],
            ['Glace 2 boules', '', 390, ''],
            ['Glace 3 boules', '', 500, ''],
        ],
        'Boissons · Jus & softs' => [
            ['Coca-Cola ou Coca-Cola Zéro', '33 cl.', 400, ''],
            ['Orangina', '25 cl.', 300, ''],
            ['Ice Tea', '', 390, ''],
            ['Limonade japonaise', '', 410, ''],
            ['Jus de fruits Pago', 'Orange, ananas, pomme, abricot ou mangue.', 390, ''],
            ["Sirop à l'eau", '', 190, ''],
        ],
        'Boissons · Eaux' => [
            ['Evian 50 cl', '', 390, ''],
            ['Evian 1 L', '', 500, ''],
            ['Perrier 33 cl', '', 390, ''],
            ['San Pellegrino 50 cl', '', 390, ''],
            ['San Pellegrino 1 L', '', 500, ''],
        ],
        'Boissons · Boissons chaudes' => [
            ['Café', 'Cafés Richard.', 250, ''],
            ['Café noisette', '', 300, ''],
            ['Thé', 'Thés Richard.', 290, ''],
        ],
        'Boissons · Cocktails' => [
            ['Cocktail 888', 'Le cocktail de la maison, 15 cl.', 800, ''],
            ['Mojito', 'Rhum blanc, menthe fraîche, citron vert, sucre de canne, eau gazeuse.', 800, ''],
            ['Piña colada', "Rhum blanc, rhum ambré, lait de coco, jus d'ananas.", 800, ''],
            ['Pornstar Martini', 'Vodka infusée à la vanille, liqueur de fruit de la passion, jus de maracuja, jus de citron, un shot de prosecco.', 800, ''],
            ['Apérol Spritz', 'Prosecco, Apérol, eau gazeuse.', 800, ''],
            ['Bellini', 'Prosecco, nectar de mangue.', 800, ''],
            ['Angkor Red', 'Vodka, jus de goyave, sirop de fraise, jus de citron, eau gazeuse.', 800, ''],
            ['Cosmopolitan', 'Vodka, Cointreau, jus de cranberry, jus de citron.', 800, ''],
            ['Virgin Mojito', 'Menthe fraîche, citron vert, sucre de canne, eau gazeuse.', 500, 'Sans alcool'],
            ['Cocktail du moment', "Sans alcool : demandez à notre équipe la création du jour.", 500, 'Sans alcool'],
        ],
        'Boissons · Apéritifs' => [
            ['Martini blanc', '5 cl.', 450, ''],
            ['Martini rouge', '5 cl.', 450, ''],
            ['Ricard', '4 cl.', 490, ''],
            ['Get 27', '', 800, ''],
            ['Kir', '10 cl.', 430, ''],
            ['Kir royal', '10 cl.', 800, ''],
            ['Porto', '5 cl.', 450, ''],
            ['Coupe de champagne', '10 cl.', 800, ''],
            ['Mei Kwei Lu', 'Alcool de riz à la rose, 5 cl.', 350, ''],
        ],
        'Boissons · Saké' => [
            ['Saké japonais', '16°, chaud ou froid.', 650, ''],
        ],
        'Boissons · Bières' => [
            ['Tsingtao', 'Bouteille, Chine.', 470, ''],
            ['Singha', 'Bouteille, Thaïlande.', 470, ''],
            ['Asahi', 'Bouteille, Japon.', 470, ''],
            ['Kirin', 'Bouteille, Japon.', 560, ''],
            ['Iki', 'Bouteille, Japon.', 560, ''],
            // L'ancien site affichait 8,00 € pour 25 cl comme pour 50 cl : prix à confirmer, affiché « sur demande ».
            ['Bière pression 25 cl', 'Heineken, Affligem ou bière du moment.', null, ''],
            ['Bière pression 50 cl', 'Heineken, Affligem ou bière du moment.', 800, ''],
        ],
        'Boissons · Spiritueux' => [
            ['Whisky J&B', '', 550, ''],
            ["Jack Daniel's", '', 900, ''],
            ['Whisky japonais Nikka', '', 1000, ''],
            ['Rhum blanc Havana Club', '', 800, ''],
            ['Rhum ambré Havana Club', '', 800, ''],
            ['Rhum Diplomático', '', 900, ''],
            ['Rhum Don Papa', '', 800, ''],
            ['Gin', '', 900, ''],
            ['Armagnac', '', 700, ''],
            ['Cognac Hennessy', '', 900, ''],
        ],
        'Boissons · Vins rouges' => [
            ['Côtes du Rhône, cuvée Perrin', '2022.', 2500, ''],
            ["Pays d'Oc, Chemin de Moscou", 'Bio, 2021.', 2500, ''],
            ['Fronton, Bodego', '2022.', 1400, ''],
            ['Corbières', '2023.', 1700, ''],
            ['Pic Saint-Loup', '', 3100, ''],
        ],
        'Boissons · Vins blancs' => [
            ['Côtes de Gascogne, domaine de Pé-Jéhout', 'Moelleux, 2023.', 1700, ''],
            ['Picpoul de Pinet, Beau Vignac', 'Sec, 2022.', 2000, ''],
            ["Pays d'Oc, domaine de Fontiès, chardonnay", 'Sec, 2023.', 2000, ''],
        ],
        'Boissons · Vins rosés' => [
            ['Côtes de Provence, Murmure de Goa', 'Bio, 2023.', 1900, ''],
        ],
        'Boissons · Pétillants & champagne' => [
            ['Prosecco', 'Vin pétillant italien.', 2000, ''],
            ['Champagne Jeeper Grande Réserve', 'Blanc de blancs.', 10000, ''],
        ],
        'Boissons · Vins au verre' => [
            ['Labastide', 'Rouge, blanc ou rosé.', 350, ''],
        ],
    ];
}
