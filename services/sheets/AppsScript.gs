// condor.ai · Sincronización Supabase → Google Sheets
// =====================================================
// Pega TODO esto en Apps Script (https://script.google.com, dentro de TU hoja:
// Extensiones → Apps Script), pon tu TOKEN abajo, y publícalo como Web App.
//
// La hoja debe tener (o se crearán solas) 2 pestañas: "Clientes" y "Leads".

const TOKEN = "PON_AQUI_UN_TOKEN_SECRETO_LARGO"; // invéntate una clave; debe coincidir con la del SQL de Supabase

// Orden de columnas por pestaña. Si la pestaña está vacía, se crean estos encabezados.
const COLUMNAS = {
  Clientes: ["creado_en","email","negocio","plan","concepto","setup_monto","mensual_monto","moneda","setup_estado","mensual_estado","proximo_cobro","web_url"],
  Leads:    ["creado_en","negocio","tipo","email","whatsapp","instagram","web","clientes_mes","origen","problema","categoria","prioridad","recomendacion"],
};

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.token !== TOKEN) return salida({ ok: false, error: "token inválido" });
    const cols = COLUMNAS[body.tabla];
    if (!cols) return salida({ ok: false, error: "tabla desconocida" });
    const fila = body.fila || {};
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(body.tabla) || ss.insertSheet(body.tabla);
    if (hoja.getLastRow() === 0) hoja.appendRow(cols);
    hoja.appendRow(cols.map(c => {
      const v = fila[c];
      if (v === null || v === undefined) return "";
      return (typeof v === "object") ? JSON.stringify(v) : v;
    }));
    return salida({ ok: true });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

function doGet() { return salida({ ok: true, servicio: "condor.ai sheets sync" }); }
function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
