# 📊 Analizador de campañas Meta

Lee la campaña de Meta Ads vía Marketing API, la analiza con Claude (de forma humana y simple)
y manda un reporte al grupo de Telegram **2 veces al día**.

- `meta-analyzer.mjs` — el script.
- Mide lo que importa en campañas de WhatsApp (CTWA): conversaciones iniciadas y su costo.
- Requiere `META_ACCESS_TOKEN` (System User, no expira) y `META_AD_ACCOUNT_ID`.

Corre con `.github/workflows/meta-analyzer.yml`.
