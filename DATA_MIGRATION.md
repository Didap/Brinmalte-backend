# Guida alla Migrazione Dati (Locale -> Produzione)

Poiché abbiamo configurato **Cloudinary**, la migrazione dei dati è molto semplice: le immagini non devono essere copiate fisicamente da un server all'altro, ma basta copiare i "collegamenti" nel database.

Ecco i due metodi migliori per portare le Categorie (e altri contenuti) in produzione.

---

## Metodo 1: Strapi Transfer (Consigliato 🚀)

Questo metodo copia direttamente i dati dal tuo computer al server di produzione tramite comando.

### 1. Prepara la Produzione
1.  Accedi al pannello admin del sito in produzione (es. `https://tuo-sito.com/admin`).
2.  Vai su **Settings** -> **Global Settings** -> **Transfer Tokens**.
3.  Clicca **Create new Transfer Token**.
    *   **Name**: `Trasferimento da Locale`
    *   **Token type**: `Push` (permetti di inviare dati verso la produzione)
    *   **Expires**: `7 days` (o quello che preferisci)
4.  **Salva** e **copia il token** che appare (non potrai più rivederlo!).

### 2. Lancia il trasferimento
Dal tuo terminale locale (nella cartella `Brinmalte-backend`), esegui:

```bash
npm run strapi transfer -- --to https://tuo-sito-produzione.com/admin
```

Ti verrà chiesto di inserire il **Transfer Token** copiato prima.
Il comando copierà il database locale (Categorie, Prodotti, Link alle immagini) sul server remoto.

---

## Metodo 2: Export / Import (Manuale)

Se non puoi usare il trasferimento diretto, puoi usare i file.

### 1. Esporta dal Locale
Esegui questo comando nel backend locale:

```bash
npm run strapi export -- --no-encrypt --file dati-brinmalte
```

Questo creerà un file `dati-brinmalte.tar.gz` nella root del progetto.

### 2. Importa in Produzione
1.  Carica il file `dati-brinmalte.tar.gz` sul server di produzione.
2.  Esegui questo comando sul server:

```bash
npm run strapi import -- --file dati-brinmalte.tar.gz
```

---


---

## ⛔ Attenzione: Script di Seeding
Lo script `src/scripts/seed-categories.ts` che abbiamo usato **NON funziona direttamente in produzione** così com'è, perché cerca le immagini nelle cartelle del tuo computer (`C:/Users/...`).
Usa uno dei metodi sopra per copiare il risultato del tuo lavoro locale!

## ❓ Domande Frequenti

### Vengono esportati anche i Ruoli e i Permessi?
**Sì!**
I Ruoli (Public, Authenticated, ecc.) e i permessi che hai configurato (es. accesso alle API) sono salvati nel database.
Sia `strapi transfer` che `strapi export` copiano l'intero database, quindi le tue configurazioni di sicurezza verranno **mantenute identiche** in produzione.

### Vengono copiate le immagini?
**Sì**, ma in modo intelligente.
Vengono copiati i "riferimenti" nel database. Poiché i file fisici sono su Cloudinary, funzioneranno immediatamente anche sul nuovo sito senza dover spostare file pesanti.
