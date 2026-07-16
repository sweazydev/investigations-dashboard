# Auth/Key Setup

## 1) Abhängigkeiten installieren

```powershell
pnpm.cmd install
```

## 2) Admin-Key setzen (.env.local)

Erstelle eine Datei `.env.local` im Projektroot:

```env
ADMIN_KEY=dein_super_sicherer_admin_key
```

## 3) App starten

```powershell
pnpm.cmd dev
```

## 4) Nutzung

- Login: `/login`
- Admin-Panel: `/admin`
- User-Panel: `/panel`

## Hinweise

- Datenbank wird automatisch unter `data/auth.db` erstellt.
- Der echte Key wird nicht im Klartext gespeichert (nur Hash + Prefix).
- Neuer User-Key wird nur einmal bei Erstellung im Admin-Panel angezeigt.
