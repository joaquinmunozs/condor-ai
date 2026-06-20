// condor.ai · Nicolás — recibe reportes de ingresos y los escribe en Google Sheets
// =============================================================================
// Pega TODO esto en Apps Script (https://script.google.com), DENTRO de tu hoja:
// Extensiones → Apps Script. Pon tu TOKEN abajo y publícalo como Web App.
//
// No usa claves de cuenta de servicio (evita la política de seguridad de la
// organización). Corre con TU cuenta de Google.

const TOKEN = "PON_AQUI_UN_TOKEN_SECRETO_LARGO"; // debe coincidir con NICOLAS_SHEETS_TOKEN en GitHub

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.token !== TOKEN) return salida({ ok: false, error: "token inválido" });

    const nombre = body.hoja;
    const filas = body.filas || [];
    if (!nombre || !filas.length) return salida({ ok: false, error: "faltan 'hoja' o 'filas'" });

    // Normaliza a matriz rectangular (todas las filas con el mismo nº de columnas)
    const ancho = Math.max.apply(null, filas.map(function (f) { return f.length; }));
    const matriz = filas.map(function (f) {
      const fila = f.slice();
      while (fila.length < ancho) fila.push("");
      return fila;
    });

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let hoja = ss.getSheetByName(nombre);
    if (hoja) hoja.clear(); else hoja = ss.insertSheet(nombre);
    hoja.getRange(1, 1, matriz.length, ancho).setValues(matriz);
    hoja.setFrozenRows(1);

    return salida({ ok: true, url: ss.getUrl() });
  } catch (err) {
    return salida({ ok: false, error: String(err) });
  }
}

function doGet() { return salida({ ok: true, servicio: "condor.ai · Nicolás reportes" }); }
function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
