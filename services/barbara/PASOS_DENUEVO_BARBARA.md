# 🔄 Activar el comando "Denuevo barbara" en Telegram

Cuando alguien (Joaquín, Alejandro, Max o Samuel) escriba **"Denuevo barbara"** en el grupo,
Barbara rehace el último contenido (mejorándolo) y lo vuelve a mandar.

## Una sola vez

### 1) Crear un token de GitHub (PAT)
1. GitHub → tu foto (arriba dcha) → **Settings** → abajo **Developer settings**.
2. **Personal access tokens → Fine-grained tokens → Generate new token**.
3. Nombre: `barbara-retry`. Expiración: la que quieras (ej. 1 año).
4. **Repository access:** Only select repositories → elige **condorweb-diagnostico**.
5. **Permissions → Repository permissions → Actions:** ponlo en **Read and write**.
6. Generar → **copia el token** (empieza con `github_pat_...`).

### 2) Poner los secretos en Supabase
Supabase → Edge Functions → Secrets, agrega:
- `GH_TOKEN` = el token del paso 1
- `TELEGRAM_BOT_TOKEN` = (ya existe en el proyecto, el mismo de Barbara)

### 3) Desplegar la función (en tu PC, PowerShell)
```
cd "C:\Users\HP Pavilion\condorweb-diagnostico"
supabase functions deploy telegram-barbara --project-ref ogmvdthxwcmvqjlxhpsr --no-verify-jwt
```

### 4) Registrar el webhook de Telegram (pega en el navegador, cambia TU_BOT_TOKEN)
```
https://api.telegram.org/botTU_BOT_TOKEN/setWebhook?url=https://ogmvdthxwcmvqjlxhpsr.supabase.co/functions/v1/telegram-barbara
```
Debe responder `{"ok":true,...}`.

> ⚠️ El mismo bot que usa Barbara para enviar es el que ahora también escucha. Funciona igual.
> Para probar: escribe **"Denuevo barbara"** en el grupo → debe responder que está rehaciendo.
