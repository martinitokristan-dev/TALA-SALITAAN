# Tala-Salitaan

Vocabulary game for elementary pupils. Teachers enter the words (pictures, pronunciation audio,
meanings, sentences, situations); pupils play 3 cycles on a 3D map.

| Folder | Tech | What it is |
|---|---|---|
| `backend/` | Laravel 12, Sanctum, MySQL (XAMPP) | API, logins, uploads, answer checking, stars, locking |
| `frontend/` | React 19, TypeScript, Vite, Three.js (react-three-fiber), dnd-kit | Pupil game and teacher portal in one app |

## Game structure

- **Cycle 1 Tuklas-Larawan, Cycle 2 Tuklas-Pangungusap, Cycle 3 Tuklas-Sitwasyon** (3 castles on the map).
- Each cycle: **Sesyon 1** = word set A (15), **Sesyon 2** = set B (15), **Sesyon 3** = A + B (30).
- Each sesyon: **Stage 1** for every word, then **Stage 2** for every word.
  - Stage 1 (all cycles): picture + jumbled letters. Cycle 1 plays the pronunciation after the word is arranged; Cycles 2 and 3 show the meaning below the word.
  - Stage 2, Cycle 1: 4 pictures, 1 correct, child-friendly meaning below.
  - Stage 2, Cycle 2: word bank + 3 sentences with a blank; drag the right word into each sentence. Sesyon 3 is split into 2 rounds of 15 words.
  - Stage 2, Cycle 3: situation with responses a, b, c.
- **Stars per item:** right on try 1 = 5, try 2 = 4, try 3 = 3; wrong 3 times = 0 and the game moves on.
- **Locking:** C1S1 → C1S2 → C1S3 → C2S1 → … → C3S3. Each one opens after the previous is finished.

## First-time setup

1. Open the **XAMPP Control Panel** and start **MySQL**.
2. Create the database (phpMyAdmin, or the command below). This XAMPP's MySQL runs on **port 3307**
   (see `C:\xampp\mysql\bin\my.ini`), and `backend/.env` uses `DB_PORT=3307`.
   ```
   C:\xampp\mysql\bin\mysql.exe -u root -h 127.0.0.1 -P 3307 -e "CREATE DATABASE tala_salitaan CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   ```
3. Backend:
   ```
   cd backend
   composer install
   copy .env.example .env      (first time only, then: php artisan key:generate)
   php artisan migrate
   php artisan serve
   ```
4. Frontend (new terminal):
   ```
   cd frontend
   npm install
   npm run dev
   ```
5. Open http://localhost:5173. Tablets on the same Wi-Fi can use `http://<this-PC-IP>:5173`.

## Teacher accounts

There is no sign-up page, so only the accounts you create can change the game content.
Run these in `backend/` (the password is typed hidden):

```
php artisan teacher:create teacher1@school.ph --name="Teacher Ana"
php artisan teacher:password teacher1@school.ph     (change a forgotten password)
php artisan teacher:list                            (names, emails and class codes)
```

Each teacher gets a class code. Pupils type that code on PUPIL LOGIN, then their name.

Uploaded pictures and audio are stored in `backend/storage/app/public` and served by `/api/media/...`
(no `storage:link` needed).

## Tests

`php artisan test` in `backend/` uses in-memory SQLite (see `phpunit.xml`); the real app uses MySQL.
