Instrucciones para seeds y DB de pruebas

- El proyecto incluye dos scripts de seed:
  - `scripts/seed-roles.ts` : solo agrega los roles (client, vendor, driver, admin) en la BD configurada.
  - `scripts/seed-test.ts` : ejecuta el seed de roles y además crea un usuario admin con email/password (default `admin@prueba.test` / `admin123`) en la base de datos `RappiDB.db`.

Cómo ejecutar (Windows PowerShell):

- Ejecutar el seed de roles:

```powershell
npm run seed:roles
```

- Ejecutar el seed completo contra la base de datos:

```powershell
npm run seed:test
```

