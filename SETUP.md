# Guida all'Installazione e Setup di BrinMalte-Backend

Questa guida spiega come avviare il database e il backend di BrinMalte utilizzando Docker (metodo raccomandato) o avviandolo localmente.

## Prerequisiti

*   [Docker Desktop](https://www.docker.com/products/docker-desktop/) installato e attivo.
*   [Node.js](https://nodejs.org/) (Versione 18 o superiore) se si vuole eseguire senza Docker.

## Configurazione Iniziale

Assicurati di avere un file `.env` nella root del progetto. Puoi copiare l'esempio fornito:

```bash
cp .env.example .env
```

Verifica che le variabili nel file `.env` siano corrette (database host, porte, chiavi segrete, ecc.).

---

## Metodo 1: Esecuzione con Docker (Raccomandato)

Questo metodo avvia Backend e Database (PostgreSQL) in container isolati.

### Avviare i servizi

Apri il terminale nella cartella del progetto ed esegui:

```bash
docker-compose up -d
```

*   **-d**: Avvia i container in background (detached mode).

### Verificare lo stato

Per vedere i log del backend:
```bash
docker-compose logs -f brinmalte-backend
```

### Accedere ai servizi

*   **Backend API / Dashboard Strapi**: [http://localhost:1337](http://localhost:1337)


### Arrestare i servizi

```bash
docker-compose down
```

---

## Metodo 2: Esecuzione Locale (Sviluppo)

Se preferisci eseguire Node.js sulla tua macchina host (ad esempio per un debug più veloce), puoi avviare solo il database con Docker e il backend localmente.

### 1. Avviare solo il Database

```bash
docker-compose up -d postgres
```

### 2. Configurare .env per locale

Assicurati che nel tuo file `.env`, `DATABASE_HOST` sia impostato su `localhost` (poiché Docker espone la porta 5432 sul tuo localhost).

*Nota: Nel `docker-compose.yml`, il backend usa `postgres` come host perché sono nella stessa rete Docker. In locale devi usare `localhost`.*

### 3. Installare le dipendenze

```bash
npm install
```

### 4. Avviare il backend in modalità sviluppo

```bash
npm run develop
```

Il server sarà accessibile a [http://localhost:1337](http://localhost:1337).

---

## Troubleshooting

### Errore "Unknown instruction: CHOWN"
Se incontri errori durante la build del Dockerfile relativi a `CHOWN`, assicurati che il comando nel `Dockerfile` sia `RUN chown ...` e non solo `chown ...`.

### Ricostruire le immagini
Se hai modificato il `package.json` o il `Dockerfile` e devi forzare una ricostruzione:

```bash
docker-compose up -d --build
```
