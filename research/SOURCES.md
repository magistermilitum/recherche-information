# Sources et provenance — édition V3

Contrôle éditorial : 4 septembre 2026.

Le catalogue canonique est [`sources.json`](sources.json). Il contient 124
notices uniques avec identifiant, URL primaire, usage exact dans le cours,
crédit, statut de réutilisation, date de contrôle et, le cas échéant, chemin de
la capture locale. Le manifeste [`../assets/MEDIA_MANIFEST_V3.json`](../assets/MEDIA_MANIFEST_V3.json)
relie chaque occurrence illustrée à son fichier, son SHA-256 et ses rectangles Z.

## Principes appliqués

- Sources officielles, documentation technique ou articles originaux en
  priorité ; les pages de synthèse servent seulement d'orientation.
- Interfaces réelles datées lorsque leur géométrie fait partie de l'analyse.
- Infographies originales lorsque la relation, la séquence ou le calcul doit
  être expliqué plus clairement qu'une capture d'écran.
- Crédit, statut et lien exact visibles dans la vue Z.
- Aucun média distant requis pendant le cours ; tout exemple est conservé
  localement.
- Aucune photographie ni représentation de personne.

## Ajouts et substitutions V3

### Recherche réelle et interfaces

- [Europe PMC — recherche « information retrieval »](https://europepmc.org/search?query=%22information%20retrieval%22) :
  capture réelle du 4 septembre 2026 montrant requête exacte, total, facettes
  et premières notices. Elle est lue sous trois angles pédagogiques distincts
  dans CM01, CM05 et CM08.
- [PubMed — Advanced Search Builder](https://pubmed.ncbi.nlm.nih.gov/advanced/) :
  capture actuelle et recadrée de la construction par champs dans CM03.
- [Europe PMC — RESTful API](https://europepmc.org/RestfulWebService) et
  [Crossref REST API](https://www.crossref.org/documentation/retrieve-metadata/rest-api/) :
  comparaison de deux syntaxes documentaires sans les confondre.

### Identifiants, relations et provenance

- [Crossref — Posted content](https://www.crossref.org/documentation/research-nexus/posted-content-includes-preprints/) :
  relation préprint–publication matérialisée par une infographie originale en
  trois étapes dans CM05.
- [ROR REST API](https://ror.readme.io/docs/rest-api) : identifiants ouverts
  d'organisations et désambiguïsation de libellés.
- [OpenCitations](https://opencitations.net/) : graphe de citations ouvert et
  métadonnées CC0.
- [Wikidata Query Service](https://www.mediawiki.org/wiki/Wikidata_Query_Service/User_Manual),
  [entité BnF Q193563](https://www.wikidata.org/wiki/Q193563) et
  [SPARQL 1.1](https://www.w3.org/TR/sparql11-query/) : exemple compact
  requête–graphe–tableau entièrement redessiné.

### Vecteurs et recherche sémantique

- [Sentence Transformers — Semantic Search](https://www.sbert.net/examples/sentence_transformer/applications/semantic-search/README.html) :
  encodage commun des requêtes et documents.
- [Faiss](https://faiss.ai/) : indexation et recherche efficace de vecteurs
  denses.
- [Mikolov et al. (2013)](https://arxiv.org/abs/1301.3781) : régularités
  relationnelles représentées par des directions dans un espace distribué.
- [scikit-learn — cosine_similarity](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.pairwise.cosine_similarity.html)
  et [Google ML — similarity from embeddings](https://developers.google.com/machine-learning/clustering/dnn-clustering/supervised-similarity) :
  formule, angle et valeurs de cosinus recalculés dans une figure originale.
- [OpenSearch — Hybrid Search](https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/)
  et [Cormack, Clarke & Büttcher — Reciprocal Rank Fusion](https://research.google/pubs/reciprocal-rank-fusion-outperforms-condorcet-and-individual-rank-learning-methods/) :
  deux listes BM25/vectorielle fusionnées en un classement final explicable.

## Limitation d'OpenAlex

OpenAlex demeure dans exactement trois scènes sur les neuf CM : CM02-06,
CM03-13 et CM04-10. Les autres exemples précédemment redondants ont été
remplacés par Europe PMC, PubMed, Crossref, ROR, OpenCitations, Wikidata ou des
infographies originales. Le fait qu'une source reste cataloguée dans
`sources.json` ne signifie pas qu'elle est affichée : les occurrences réellement
intégrées sont celles du manifeste V3.

## Statut des images

Les captures d'interface sont reproduites comme objets de commentaire
pédagogique, avec attribution et lien vers la page originale ; aucune licence
globale n'est supposée pour les documents indexés à l'intérieur des interfaces.
Les schémas V3 sur l'espace sémantique, le cosinus, la fusion RRF, Wikidata/BnF
et la famille préprint–article sont des créations originales fondées sur les
sources citées : aucune figure publiée n'est recopiée.

Le détail de chaque statut figure dans `sources.json` et dans le manifeste V3.
