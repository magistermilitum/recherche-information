RECHERCHE DE L'INFORMATION — ATLAS INTERACTIF
Université de Lille · L1 · 2026–2027

ÉDITION V3
340 diapositives · 900 états H · 41 exemples illustrés · 124 lectures Z
12 familles de composition · 9 signatures géométriques de cours

OUVERTURE
1. Décompresser entièrement le ZIP.
2. Ouvrir index.html dans un navigateur récent.
3. Choisir l'un des neuf CM. Les cours et leurs médias fonctionnent hors ligne.

COMMANDES PENDANT LE COURS
→ / Espace     diapositive suivante
←              diapositive précédente
H              lecture interne suivante
Maj + H        lecture interne précédente
Z              agrandir, puis avancer dans les détails annotés
Maj + Z        détail annoté précédent
Échap          fermer l'agrandissement ou l'aide
F              plein écran
?              aide discrète

CONTRAT D'INTERACTION
Les flèches et Espace changent uniquement de diapositive. H transforme la scène
courante par accumulation, substitution ou recomposition. Son état revient
systématiquement à zéro lorsqu'on quitte puis retrouve une diapositive.

Z n'est actif que si la diapositive possède un exemple local accompagné d'un
crédit, d'un statut et d'une URL. La première pression ouvre l'image entière
sur fond sombre ; les suivantes parcourent des cadres annotés indépendamment
de H. La grande lettre Z décorative a été supprimée de cette vue. Le lien exact
de la source apparaît sous le libellé « Lien ».

CONTENU DU PAQUET
index.html                    sommaire général des neuf CM
cm01.html … cm09.html         neuf cours autonomes
engine.js / styles.css        moteur et langage visuel communs
visual-system-v2.css          12 familles visuelles et 9 fonds de cours
media-system-v2.css           vignettes, légendes et cadres documentaires
zoom-system.css               géométrie et parcours annotés de Z
assets/                       documents et infographies conservés hors ligne
assets/MEDIA_MANIFEST_V3.json provenance, SHA-256 et 124 zones annotées
content/                      source structurée des 340 diapositives
research/sources.json         catalogue canonique des sources
research/SOURCES.md           principes de sélection et principaux ajouts V3
tools/                        compilation et contrôles reproductibles
QA_FINAL.txt                  bilan chiffré de la livraison

GÉOMÉTRIE ET ACCESSIBILITÉ
Le canevas logique mesure 1600 × 900 et se redimensionne sans modifier les
rapports spatiaux. Les scènes H disposent de zones réservées ; les textes ne
doivent ni pousser ni recouvrir les autres éléments. Les diapositives inactives
sont réellement sorties du layout par hidden, inert et display:none!important.
Le corps principal reste composé à 25 px ou plus pour une projection en
amphithéâtre.

Le flux numéroté sépare désormais matériellement point, indice et texte. Les
capsules signalées dans CM01-23, CM02-11, CM05-11 et CM09-05 ont une largeur
plafonnée. Les axes centraux sont plus légers et leur progression dépend de H.
Les cadres des médias sont plus fins, plus doux et strictement alignés avec les
coordonnées intrinsèques de Z.

EXEMPLES DOCUMENTAIRES
Chaque CM possède au moins trois exemples agrandissables. La V3 ajoute une
recherche réelle Europe PMC, une capture actuelle de PubMed Advanced, une
famille préprint–article redessinée et quatre infographies originales pour les
vecteurs : espace sémantique, cosinus, recherche hybride RRF et graphe
Wikidata/BnF. OpenAlex est limité à trois scènes distinctes dans les neuf CM.
Aucune photographie ni représentation humaine n'est utilisée.

SOURCES
Chaque média porte son crédit, son statut de réutilisation et son lien exact.
La source complète se trouve dans research/sources.json ; le manifeste local
assets/MEDIA_MANIFEST_V3.json relie chaque occurrence à son fichier, son
SHA-256 et ses rectangles Z. Les pages de références CM04, CM07 et CM08 ont été
étendues ; la page finale CM09 conserve onze ressources, dont deux seulement
concernent OpenAI.

CONTRÔLES FOURNIS
python3 tools/build_decks.py
python3 tools/build_media_manifest.py --check
python3 tools/validate_atlas.py --require-nine
python3 tools/validate_geometry.py
python3 tools/validate_font_metrics.py
python3 tools/validate_visual_diversity.py
python3 tools/validate_revision_v2.py
python3 tools/validate_revision_v3.py
python3 tools/qa_hotspots.py
node tools/validate_content.mjs
node tools/validate_runtime_geometry.mjs
node --check engine.js

—

NOTA EN ESPAÑOL
Abre index.html tras descomprimir el ZIP. Las flechas cambian de diapositiva;
H / Mayús+H recorren y reinician las transformaciones internas. Z abre el
ejemplo citado y Z / Mayús+Z recorre sus zonas anotadas; Escape lo cierra.
F activa la pantalla completa.
