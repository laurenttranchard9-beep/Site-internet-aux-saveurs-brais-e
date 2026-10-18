<?php
// Carte d'Aux Saveurs du Cambodge, reprise de l'ancien site (Squarespace) et relue : orthographe, prix, présentation.
// Chargée automatiquement dans la base à la première ouverture du site, ensuite modifiable depuis l'espace de gestion.
// Format : 'Catégorie' => [[nom, description, prix en centimes (null = sur demande), étiquettes], ...]
// Étiquette « À la une » : le plat est mis en avant en haut de la page (et n'apparaît pas dans les filtres).

const CARTE_VERSION = 1;

const RIZ = 'Servis avec du riz nature. Supplément riz cantonais (porc ou crevettes) : 4,50 €.';

// Note affichée sous le titre de la catégorie (facultatif).
function carte_notes(): array
{
    return [
        'Menu bon et pas cher' => 'Disponible dès maintenant !',
        'Porc' => RIZ,
        'Poulet' => RIZ,
        'Bœuf' => RIZ,
        'Canard' => RIZ,
        'Crevettes' => RIZ,
        'Seiches' => RIZ,
        'Spécialités du chef' => RIZ,
        'Brochettes' => RIZ,
    ];
}

function carte(): array
{
    return [
        'Menu bon et pas cher' => [
            ['Menu bon et pas cher au porc', 'Échine de porc marinée, riz thaï et sa salade composée.', 1000, 'À la une'],
            ['Menu bon et pas cher au poulet', 'Cuisse de poulet marinée, riz thaï et sa salade composée.', 1000, 'À la une'],
            ['Perles de coco', '2 pièces, uniquement avec le menu bon et pas cher.', 250, 'À la une'],
            ['Riz crousty', 'Riz blanc, sauce blanche, poulet frit, sauce aigre-douce et oignons frits.', 1100, ''],
        ],
        'Entrées' => [
            ['Nems au porc', '5 pièces.', 700, ''],
            ['Nems au poulet', '5 pièces.', 750, ''],
            ['Nems aux crevettes', '5 pièces.', 800, ''],
            ['Samoussas au bœuf', '5 pièces.', 750, ''],
            ['Raviolis frits porc et crevettes', '5 pièces.', 750, ''],
            ['Raviolis croustillants aux crevettes', '5 pièces.', 750, ''],
            ['Rouleau de printemps porc et crevettes', '1 pièce.', 500, ''],
            ['Rouleau de printemps porc ou crevettes', '1 pièce.', 400, ''],
            ['Beignets de gambas', '5 pièces.', 790, ''],
            ['Beignets de poulet', 'Blanc de poulet.', 790, ''],
            ['Brioche au porc', '1 pièce.', 650, ''],
            ['Nem nướng porc et crevettes', '', 1390, ''],
            ['Assiette composée', '1 rouleau de printemps, 1 nem, 1 nem au poulet, 1 croissant, 1 ravioli frit, 1 ravioli frit aux crevettes, 1 papillote et 1 beignet de calamar.', 1100, ''],
        ],
        'Salades' => [
            ['Salade de nems', '', 750, ''],
            ['Salade de bœuf et nems (baboun)', '', 850, ''],
            ['Salade au poulet', '', 750, ''],
            ['Salade thaïe au bœuf', '', 1000, ''],
            ['Salade thaïe aux crevettes', '', 1000, ''],
            ["Salade d'ananas", 'Au crabe et surimi, ou aux crevettes.', 1000, ''],
            ['Lap thaï au bœuf', '', 1050, ''],
            ['Salade thaïe crevettes et seiches', '', 1050, ''],
        ],
        'Vapeurs' => [
            ['Bouchées au porc', '5 pièces.', 750, ''],
            ['Bouchées aux crevettes', '5 pièces.', 750, ''],
            ['Ha kao', 'Raviolis aux crevettes.', 750, ''],
            ['Mélange de vapeurs', '5 pièces.', 750, ''],
            ['Crêpes chinoises au porc', '3 pièces.', 850, ''],
        ],
        'Soupes' => [
            ['Soupe phở', 'Au bœuf, au poulet ou aux crevettes.', 1150, ''],
            ['Soupe de raviolis', 'Porc et crevettes.', 1150, ''],
            ['Soupe Phnom Penh', 'Porc et crevettes.', 1150, 'Spécialité cambodgienne'],
        ],
        'Porc' => [
            ['Porc au caramel', '', 1050, ''],
            ['Porc laqué', '', 1050, ''],
            ['Brochettes de porc', '', 1050, ''],
        ],
        'Poulet' => [
            ['Poulet frit sauce au citron', '', 1100, ''],
            ['Poulet sauce curry', '', 1100, ''],
            ['Poulet sauté sauce saté', '', 1100, ''],
            ['Poulet sauce ananas', '', 1100, ''],
            ['Poulet sauce citronnelle', '', 1100, ''],
            ['Poulet sauce aux légumes', '', 1100, ''],
            ['Poulet sauce piquante', '', 1100, 'Épicé'],
        ],
        'Bœuf' => [
            ['Lok lak', '', 1350, 'Spécialité cambodgienne'],
            ['Bœuf aux champignons noirs', '', 1350, ''],
            ['Bœuf sauce saté', '', 1350, ''],
            ['Bœuf sauce thaïe', '', 1350, ''],
            ['Bœuf sauce piquante', '', 1350, 'Épicé'],
        ],
        'Canard' => [
            ['Canard sauce curry', '', 1300, ''],
            ['Canard aux champignons noirs', '', 1300, ''],
            ['Canard laqué', '', 1300, ''],
        ],
        'Crevettes' => [
            ['Crevettes sauce curry', '', 1150, ''],
            ['Crevettes sauce saté', '', 1150, ''],
            ['Crevettes sauce citronnelle', '', 1150, ''],
            ['Brochettes de crevettes', '', 1150, ''],
            ['Crevettes sauce thaïe', '', 1200, ''],
        ],
        'Seiches' => [
            ['Seiche sauce curry', '', 1150, ''],
            ['Seiche sauce saté', '', 1150, ''],
            ['Seiche sauce citronnelle', '', 1150, ''],
            ['Seiche sauce piquante', '', 1150, 'Épicé'],
        ],
        'Spécialités du chef' => [
            ['Bœuf du chef', '', 1490, ''],
            ['Crevettes du chef', '', 1490, ''],
            ['Trois délices', '', 1490, ''],
            ["Canard à l'orange", '', 1490, ''],
            ['Fruits de mer sauce thaïe', '', 1490, ''],
        ],
        'Brochettes' => [
            ['Brochettes de bœuf', '', 1350, ''],
            ['Brochettes de crevettes', '', 1350, ''],
            ['Brochettes de canard', '', 1350, ''],
        ],
        'Nouilles et pâtes' => [
            ['Pad thaï', 'Au bœuf, au poulet ou aux crevettes.', 1200, ''],
            ['Légumes sautés', '', 700, ''],
            ['Nouilles sautées au bœuf', '', 1150, ''],
            ['Nouilles sautées aux crevettes', '', 1150, ''],
            ['Nouilles sautées au poulet', '', 1150, ''],
            ['Nouilles sautées aux légumes', '', 700, ''],
        ],
        'Accompagnements' => [
            ['Riz blanc', '', 350, ''],
            ['Riz cantonais au porc', '', 650, ''],
            ['Riz cantonais aux crevettes', '', 650, ''],
            ['Riz piquant aux crevettes', '', 650, 'Épicé'],
            ['Riz piquant au poulet', '', 650, 'Épicé'],
        ],
        'Desserts' => [
            ['Beignets de pomme sauce caramel', '', 550, ''],
            ['Beignets de banane sauce caramel', '', 550, ''],
            ["Beignets d'ananas sauce caramel", '', 550, ''],
            ['Assortiment de beignets sauce caramel', '', 550, ''],
            ['Ananas frais', '', 550, ''],
            ['Perles de coco', '3 pièces.', 550, ''],
            ['Banane au lait de coco', '', 550, ''],
        ],
    ];
}
