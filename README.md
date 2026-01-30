# Web_ThomasLang
Sampler: [langthomas.eu/sampler](https://langthomas.eu/sampler)\
Angular App: [langthomas.eu/angular/home](https://langthomas.eu/angular/home)\
Headless mode: [langthomas.eu/headless](https://langthomas.eu/headless)\
Presets API: [langthomas.eu/api/presets](https://langthomas.eu/api/presets)

## Features Sampler
- Separate GUI and audio engine: The engine part is in js/Engine and GUI in js/GUI
- Presets menu build: Choose a Kit in the dropdown menu
- Map computer keys to pads: You can use the keys
```
& é " '
a z e r
q s d f
w x c v
```
- Midi Support:You can activate it by clicking <<activate>>
- Record own sound: 1. Push the Play button (1.1 Accept microphone access) 2.Record 3. Stop recording 4. Push the add button or drag the text to add it to a pad
- Freesound implementation: Open the Burger menu and search for a sound. You can prelisten to the sounds. If you want to add a sound drag and drop it to a pad
- Save kits to server: Click the Save Kit button
- Equalizer: you can play with the  

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


### Prompts utilisés 
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
- « What do I need to upload to the server for it to work? »
- « Git errors when adding files and pathspec issues»
- « Browser errors regarding MIME type conflicts (text/html instead of JS) and 403 Forbidden access »
- « Repeated WebSocket connection errors for _stcore/stream »
- « Nginx error logs regarding directory index permissions »
- « I can't manage to implement the headless mode; somehow it doesn't accept the toggle »
- « main.js:50 Uncaught (in promise) ReferenceError: $headlessToggle is not defined »
- « I would like the code comments to always be in English and simple »
- « Please explain the purpose of a headless mode »
- « Can you give me all the questions I asked you in Markdown? »

Note de Thomas Lang: J'ai encore démande plus de questions mais j'ai configuré le llm de ne pas se souvenir de mes conversation. En géneral je pose des questions comme:
  - How do I implement something?
  - How does [function work]?
  - Why do I get error X?
  - Give me an alternative way to do X
  - Comment my code in plain and simple english
  - Does this code respects seperability?
    
### Outils/commandes utilisés (côté Angular)
- GitHub Copilot
- Lancement local : `cd admin` puis `npm start` (pour valider l’UI et les requêtes via le proxy).
- Gemini (Free)

