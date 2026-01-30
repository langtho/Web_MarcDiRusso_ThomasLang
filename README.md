# Web_ThomasLang
Ceci est le Git pour les TPs de Thomas Lang pour l'UE Web de Michel Buffa

## The JavaScript files
You find all the JavaScript code in the **js** folder The code is seperated in two parts the **Sampler Engine** in the **Engine** folder and the **Sampler GUI** in the **GUI** folder.

Else you'll find the css file in the **css** folder


## Lancement
- Sampler : `cd server && npm run start`
- Admin Angular : `cd admin && npm start`

## Partie Admin Angular (Réalisé par Marc Di Russo)

### Objectif fonctionnel
Permettre, depuis l’admin Angular, de consulter les catégories/sons, ajouter un son, renommer un son et supprimer un son.

### Ce qui a été fait (côté Angular) 
- Navigation par catégories + liste filtrée des sons.
- Formulaire d’ajout (URL ou fichier local `blob:`) + normalisation des URLs vers `/presets/<cat>/...`.
- Actions dans la table : renommer/supprimer, avec rafraîchissement via `GET /api/presets/index`.

### Structure rapide (admin/src/app)
- `app/` : layout + liens (`/home`, `/add`) et routes.
- `sampler/categories/` : liste des catégories via `presetIndex$`.
- `sampler/pads/` : `mat-table` des sons d’une catégorie + actions Renommer/Supprimer.
- `sampler/add-pad/` : formulaire d’ajout (URL ou fichier → URL `blob:`) + normalisation `/presets/<cat>/...`.
- `shared/` : `SamplerService` (source de vérité API, `pads$`, `presetIndex$`, add/delete/rename).

### Routes (admin/src/app/app.routes.ts)
- `/home` : catégories
- `/category/:key` : sons d’une catégorie
- `/add` : ajout d’un son
- redirections : `/` → `/home`, `/category` → `/home`, `**` → `/home`

### Fonctionnalités (admin Angular)
- Consulter catégories et sons (tableau `mat-table`).
- Ajouter un son (URL ou fichier local `blob:`).
- Renommer et supprimer un son.
- Rafraîchir les données depuis `GET /api/presets/index` après modification.


### “Gros prompts” utilisés 
- « Fournis-moi un plan pour concevoir une application Angular d’administration pour AudioSampler (inspirée du projet “Assignments”), qui permette de consulter, ajouter et supprimer des sons. »
- « Fournis-moi un plan pour organiser l’interface par catégories (comme le dossier `presets`) : clic sur une catégorie → liste filtrée des sons correspondants. »
- « Explique-moi comment remplacer un affichage en liste par une table Angular Material (`mat-table`) avec des colonnes utiles (nom, catégorie, URL, actions). »
- « Guide-moi pour remplacer l’icône “corbeille” par un bouton explicite “Supprimer”, idéalement en style `warn` (rouge), pour rendre l’action plus claire. »
- « Fournis-moi un plan pour simplifier l’interface en supprimant les éléments en doublon (ex. ne garder qu’un seul bouton “Ajouter”). »
- « Détaille la démarche pour implémenter le renommage d’un son / preset dans l’admin Angular, en gardant l’UI synchronisée avec le sampler. »
- « Indique-moi les étapes pour corriger le bug “les catégories disparaissent”, sans casser la navigation et sans dépendre d’une liste de pads. »
- « Aide-moi à diagnostiquer un écart entre prod et localhost, puis à corriger proprement les appels API (problème de port / proxy). »
- « Donne-moi un exemple concret pour ajouter un bouton “Renommer” à côté de “Supprimer” dans la table des sons, et relier ce bouton à la logique de mise à jour. »
- « Fournis-moi le plan pour créer une page “Ajouter” (`/add`) avec un formulaire (nom, catégorie, URL) et un sélecteur de fichier audio : si fichier, utiliser une URL `blob:` et pré-remplir le nom ; si catégorie, normaliser vers `/presets/<cat>/<fichier>`. »
- « Explique-moi comment intégrer un menu déroulant (`mat-select`) pour choisir la catégorie lors de l’ajout, afin de ranger les sons au bon endroit. »
- « Guide-moi pour permettre le choix (ou le dépôt) d’un fichier audio au lieu de saisir uniquement une URL (option MVP : URL `blob:` côté navigateur). »
- « Explique-moi comment ajouter une action “Supprimer” sur chaque son (dans la table de `/category/:key`) : suppression via l’API quand possible, sinon fallback local, puis rafraîchissement via `GET /api/presets/index`. »
- « Explique-moi pourquoi il peut y avoir un “échec silencieux” quand une action ne marche pas (ex. renommage), et comment ajouter des messages d’erreur côté Angular + vérifier les appels réseau. »
- « Fournis-moi le plan pour faire évoluer la version locale vers une version connectée : les ajouts/suppressions depuis Angular doivent modifier réellement les presets d’AudioSampler. »
- « Propose-moi une méthode pour itérer par étapes : valider le fonctionnement (navigation + actions CRUD) avant d’ajouter la prochaine fonctionnalité. »
- « Explique-moi pourquoi il semble y avoir deux serveurs en dev sur le port 4200, puis comment clarifier/corriger la configuration. »

### Outils/commandes utilisés (côté Angular)
- GitHub Copilot
- Lancement local : `cd admin` puis `npm start` (pour valider l’UI et les requêtes via le proxy).

