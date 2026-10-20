/**
 * ========================================================
 * TALONARIO DE RECIBOS DIGITAL - LÓGICA DE APLICACIÓN
 * Base de datos: Firebase Firestore (sincronización en la nube)
 * ========================================================
 */

// ─── CONFIGURACIÓN FIREBASE ─────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCqf9uNu3OPZqkQa8FRa-M6YNxfVjmUKIo",
  authDomain: "talonario-recibos.firebaseapp.com",
  projectId: "talonario-recibos",
  storageBucket: "talonario-recibos.firebasestorage.app",
  messagingSenderId: "920281447594",
  appId: "1:920281447594:web:f57ced5f4df343345f64d3"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const COLECCION = 'recibos';

// ─── ESTADO GLOBAL ───────────────────────────────────────
let recibos = [];
let reciboActualId = null;
let guardandoRecibo = false;
let monedaActual = 'DOP'; // 'DOP' o 'USD'
let unsubscribeListener = null; // Listener en tiempo real de Firestore

// INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
  inicializarFormulario();
  configurarListeners();
  iniciarListenerFirestore(); // Escucha cambios en tiempo real
});

/**
 * Inicializa el formulario al estado inicial
 */
function inicializarFormulario() {
  setFechaHoy();
  const siguienteNum = obtenerSiguienteNumeroRecibo();
  document.getElementById('inputNumero').value = siguienteNum;
  document.getElementById('receiptNumberDisplay').textContent = siguienteNum;
  actualizarMonedaUI();
  sincronizarVistaPrevia();
}

/**
 * Configura los detectores de eventos en los campos
 */
function configurarListeners() {
  const inputs = [
    'inputNumero', 'inputFecha', 'inputRecibidoDe', 
    'inputMonto', 'inputMontoLetras', 'inputConcepto',
    'inputChequeNo', 'inputChequeBanco', 'inputBancoDirecto',
    'inputFirmaResponsable'
  ];

  inputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        if (id === 'inputMonto') {
          autoGenerarLetras();
        }
        sincronizarVistaPrevia();
      });
    }
  });

  // Selector de moneda
  document.querySelectorAll('input[name="radioMoneda"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
      monedaActual = e.target.value;
      actualizarMonedaUI();
      autoGenerarLetras();
      sincronizarVistaPrevia();
    });
  });
}

/**
 * Asigna la fecha actual al campo de fecha
 */
function setFechaHoy() {
  const hoy = new Date();
  const yyyy = hoy.getFullYear();
  const mm = String(hoy.getMonth() + 1).padStart(2, '0');
  const dd = String(hoy.getDate()).padStart(2, '0');
  document.getElementById('inputFecha').value = `${yyyy}-${mm}-${dd}`;
  sincronizarVistaPrevia();
}

/**
 * Actualiza la UI según la moneda seleccionada (RD$ o USD)
 */
function actualizarMonedaUI() {
  const symbol = monedaActual === 'USD' ? 'USD$' : 'RD$';
  const label = monedaActual === 'USD' ? 'Monto en Números (USD $)' : 'Monto en Números (RD$)';
  
  const labelEl = document.getElementById('labelMontoMoneda');
  const prefixEl = document.getElementById('prefixMontoMoneda');
  const previewSimboloEl = document.getElementById('previewSimboloMoneda');

  if (labelEl) labelEl.textContent = label;
  if (prefixEl) prefixEl.textContent = symbol;
  if (previewSimboloEl) previewSimboloEl.textContent = symbol;
}

/**
 * ========================================================
 * CONVERSOR DE NÚMEROS A LETRAS EN ESPAÑOL
 * ========================================================
 */
function numeroALetras(num, moneda = monedaActual) {
  num = parseFloat(num);
  if (isNaN(num) || num < 0) return '';

  const partes = num.toFixed(2).split('.');
  const entero = parseInt(partes[0], 10);
  const centavos = parseInt(partes[1], 10);

  function unidades(n) {
    switch (n) {
      case 1: return 'UN';
      case 2: return 'DOS';
      case 3: return 'TRES';
      case 4: return 'CUATRO';
      case 5: return 'CINCO';
      case 6: return 'SEIS';
      case 7: return 'SIETE';
      case 8: return 'OCHO';
      case 9: return 'NUEVE';
      default: return '';
    }
  }

  function decenasYUnidades(n) {
    if (n === 0) return '';
    if (n < 10) return unidades(n);
    if (n === 10) return 'DIEZ';
    if (n === 11) return 'ONCE';
    if (n === 12) return 'DOCE';
    if (n === 13) return 'TRECE';
    if (n === 14) return 'CATORCE';
    if (n === 15) return 'QUINCE';
    if (n < 20) return 'DIECI' + unidades(n - 10);
    if (n === 20) return 'VEINTE';
    if (n < 30) return 'VEINTI' + unidades(n - 20);

    const dec = Math.floor(n / 10);
    const uni = n % 10;
    let decStr = '';
    switch (dec) {
      case 3: decStr = 'TREINTA'; break;
      case 4: decStr = 'CUARENTA'; break;
      case 5: decStr = 'CINCUENTA'; break;
      case 6: decStr = 'SESENTA'; break;
      case 7: decStr = 'SETENTA'; break;
      case 8: decStr = 'OCHENTA'; break;
      case 9: decStr = 'NOVENTA'; break;
    }
    return uni === 0 ? decStr : `${decStr} Y ${unidades(uni)}`;
  }

  function centenas(n) {
    if (n === 100) return 'CIEN';
    if (n < 100) return decenasYUnidades(n);
    const cen = Math.floor(n / 100);
    const resto = n % 100;
    let cenStr = '';
    switch (cen) {
      case 1: cenStr = 'CIENTO'; break;
      case 2: cenStr = 'DOSCIENTOS'; break;
      case 3: cenStr = 'TRESCIENTOS'; break;
      case 4: cenStr = 'CUATROCIENTOS'; break;
      case 5: cenStr = 'QUINIENTOS'; break;
      case 6: cenStr = 'SEISCIENTOS'; break;
      case 7: cenStr = 'SETECIENTOS'; break;
      case 8: cenStr = 'OCHOCIENTOS'; break;
      case 9: cenStr = 'NOVECIENTOS'; break;
    }
    const restoStr = decenasYUnidades(resto);
    return restoStr ? `${cenStr} ${restoStr}` : cenStr;
  }

  function miles(n) {
    if (n < 1000) return centenas(n);
    const mil = Math.floor(n / 1000);
    const resto = n % 1000;
    let milStr = mil === 1 ? 'MIL' : `${centenas(mil)} MIL`;
    const restoStr = centenas(resto);
    return restoStr ? `${milStr} ${restoStr}` : milStr;
  }

  function millones(n) {
    if (n < 1000000) return miles(n);
    const millon = Math.floor(n / 1000000);
    const resto = n % 1000000;
    let millonStr = millon === 1 ? 'UN MILLÓN' : `${miles(millon)} MILLONES`;
    const restoStr = miles(resto);
    return restoStr ? `${millonStr} ${restoStr}` : millonStr;
  }

  let textoEntero = entero === 0 ? 'CERO' : millones(entero);

  // Nombre de la moneda según selección
  let nombreMoneda = '';
  if (moneda === 'USD') {
    nombreMoneda = (entero === 1) ? 'DÓLAR' : ((textoEntero.endsWith('MILLÓN') || textoEntero.endsWith('MILLONES')) ? 'DE DÓLARES' : 'DÓLARES');
  } else {
    nombreMoneda = (entero === 1) ? 'PESO' : ((textoEntero.endsWith('MILLÓN') || textoEntero.endsWith('MILLONES')) ? 'DE PESOS' : 'PESOS');
  }

  let resultado = `${textoEntero} ${nombreMoneda}`;

  // Solo describir los centavos si son mayores a cero
  if (centavos > 0) {
    const textoCentavos = decenasYUnidades(centavos);
    const nombreCentavo = centavos === 1 ? 'CENTAVO' : 'CENTAVOS';
    resultado += ` CON ${textoCentavos} ${nombreCentavo}`;
  }

  return resultado;
}

function autoGenerarLetras() {
  const val = parseFloat(document.getElementById('inputMonto').value);
  if (!isNaN(val) && val > 0) {
    document.getElementById('inputMontoLetras').value = numeroALetras(val, monedaActual);
  } else {
    document.getElementById('inputMontoLetras').value = '';
  }
}

function regenerarMontoLetras() {
  autoGenerarLetras();
  sincronizarVistaPrevia();
}

/**
 * Control de campos dinámicos de Forma de Pago
 */
function togglePagoCampos() {
  const radioChecked = document.querySelector('input[name="tipoPago"]:checked');
  const tipo = radioChecked ? radioChecked.value : 'efectivo';

  const chequeDiv = document.getElementById('chequeCampos');
  const bancoDiv = document.getElementById('bancoCampos');

  if (chequeDiv && bancoDiv) {
    if (tipo === 'cheque') {
      chequeDiv.classList.remove('hidden');
      bancoDiv.classList.add('hidden');
    } else if (tipo === 'banco') {
      chequeDiv.classList.add('hidden');
      bancoDiv.classList.remove('hidden');
    } else {
      chequeDiv.classList.add('hidden');
      bancoDiv.classList.add('hidden');
    }
  }
  sincronizarVistaPrevia();
}

/**
 * ========================================================
 * SINCRONIZACIÓN DE LA VISTA PREVIA DEL TALONARIO
 * Robusta ante cualquier valor nulo o indefinido
 * ========================================================
 */
function sincronizarVistaPrevia() {
  try {
    const num = document.getElementById('inputNumero').value || '0001';
    const previewNumEl = document.getElementById('previewNumero');
    const receiptNumDispEl = document.getElementById('receiptNumberDisplay');
    if (previewNumEl) previewNumEl.textContent = `No. ${num}`;
    if (receiptNumDispEl) receiptNumDispEl.textContent = num;

    // Fecha
    const fechaVal = document.getElementById('inputFecha').value;
    const diaEl = document.getElementById('previewDia');
    const mesEl = document.getElementById('previewMes');
    const anoEl = document.getElementById('previewAno');
    if (fechaVal) {
      const parts = fechaVal.split('-');
      if (diaEl) diaEl.textContent = parts[2] || '--';
      if (mesEl) mesEl.textContent = parts[1] || '--';
      if (anoEl) anoEl.textContent = parts[0] || '----';
    } else {
      if (diaEl) diaEl.textContent = '--';
      if (mesEl) mesEl.textContent = '--';
      if (anoEl) anoEl.textContent = '----';
    }

    // Hemos recibido de
    const recibidoDeEl = document.getElementById('previewRecibidoDe');
    if (recibidoDeEl) {
      recibidoDeEl.textContent = document.getElementById('inputRecibidoDe').value || '';
    }

    // Monto numérico
    const montoVal = parseFloat(document.getElementById('inputMonto').value);
    const montoNumEl = document.getElementById('previewMontoNum');
    if (montoNumEl) {
      if (!isNaN(montoVal) && montoVal > 0) {
        montoNumEl.textContent = montoVal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      } else {
        montoNumEl.textContent = '0.00';
      }
    }

    // Símbolo de moneda
    actualizarMonedaUI();

    // La suma de (letras)
    const montoLetrasEl = document.getElementById('previewMontoLetras');
    if (montoLetrasEl) {
      montoLetrasEl.textContent = document.getElementById('inputMontoLetras').value || '';
    }

    // Concepto (distribuir en dos líneas si es extenso)
    const concepto = document.getElementById('inputConcepto').value || '';
    const c1 = document.getElementById('previewConcepto1');
    const c2 = document.getElementById('previewConcepto2');

    if (c1 && c2) {
      if (concepto.length > 55) {
        const corte = concepto.lastIndexOf(' ', 55);
        const pos = corte > 20 ? corte : 55;
        c1.textContent = concepto.substring(0, pos);
        c2.textContent = concepto.substring(pos).trim();
      } else {
        c1.textContent = concepto;
        c2.textContent = '';
      }
    }

    // Forma de Pago
    const radioChecked = document.querySelector('input[name="tipoPago"]:checked');
    const tipo = radioChecked ? radioChecked.value : 'efectivo';

    const chkEfectivo = document.getElementById('checkEfectivoIcon');
    const chkCheque = document.getElementById('checkChequeIcon');
    const pEfectivo = document.getElementById('previewEfectivoVal');
    const pCheque = document.getElementById('previewChequeNoVal');
    const pBanco = document.getElementById('previewBancoVal');

    const symbol = monedaActual === 'USD' ? 'USD$' : 'RD$';
    const SVG_CHECK = `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="#142852" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;"><polyline points="3 8 6.5 12 13 4"></polyline></svg>`;

    if (tipo === 'efectivo') {
      if (chkEfectivo) chkEfectivo.innerHTML = SVG_CHECK;
      if (chkCheque) chkCheque.innerHTML = '';
      if (pEfectivo) pEfectivo.textContent = `${symbol} ` + (isNaN(montoVal) ? '0.00' : montoVal.toLocaleString('es-DO', { minimumFractionDigits: 2 }));
      if (pCheque) pCheque.textContent = '';
      if (pBanco) pBanco.textContent = '';
    } else if (tipo === 'cheque') {
      if (chkEfectivo) chkEfectivo.innerHTML = '';
      if (chkCheque) chkCheque.innerHTML = SVG_CHECK;
      if (pEfectivo) pEfectivo.textContent = '';
      if (pCheque) pCheque.textContent = document.getElementById('inputChequeNo').value || 'S/N';
      if (pBanco) pBanco.textContent = document.getElementById('inputChequeBanco').value || '';
    } else if (tipo === 'banco') {
      if (chkEfectivo) chkEfectivo.innerHTML = '';
      if (chkCheque) chkCheque.innerHTML = '';
      if (pEfectivo) pEfectivo.textContent = '';
      if (pCheque) pCheque.textContent = 'TRANSF.';
      if (pBanco) pBanco.textContent = document.getElementById('inputBancoDirecto').value || 'TRANSFERENCIA BANCARIA';
    }

    // Firmas
    const pResponsable = document.getElementById('previewFirmaResponsable');
    if (pResponsable) pResponsable.textContent = document.getElementById('inputFirmaResponsable').value || '';

    // Sincronizar copia si está activa
    actualizarCopiaPreview();
  } catch (err) {
    console.error('Error al sincronizar vista previa:', err);
  }
}

/**
 * ========================================================
 * LIMPIAR TANTO FORMULARIO COMO VISTA PREVIA
 * ========================================================
 */
function limpiarFormulario() {
  reciboActualId = null;

  // 1. Limpiar campos del formulario
  document.getElementById('inputRecibidoDe').value = '';
  document.getElementById('inputMonto').value = '';
  document.getElementById('inputMontoLetras').value = '';
  document.getElementById('inputConcepto').value = '';
  document.getElementById('inputChequeNo').value = '';
  document.getElementById('inputChequeBanco').value = '';
  document.getElementById('inputBancoDirecto').value = '';
  document.getElementById('inputFirmaResponsable').value = '';

  // Restablecer forma de pago a Efectivo
  document.querySelectorAll('input[name="tipoPago"]').forEach(rd => rd.checked = false);
  const rdEfectivo = document.querySelector('input[name="tipoPago"][value="efectivo"]');
  if (rdEfectivo) rdEfectivo.checked = true;
  togglePagoCampos();

  // 2. Establecer siguiente número correlativo automáticamente
  const siguienteNumero = obtenerSiguienteNumeroRecibo();
  document.getElementById('inputNumero').value = siguienteNumero;
  document.getElementById('receiptNumberDisplay').textContent = siguienteNumero;
  document.getElementById('formReceiptTag').innerHTML = `Nuevo Recibo #<span>${siguienteNumero}</span>`;

  // Fecha actual
  setFechaHoy();

  // 3. LIMPIAR EXPLÍCITAMENTE LA VISTA PREVIA
  document.getElementById('previewNumero').textContent = `No. ${siguienteNumero}`;
  document.getElementById('previewRecibidoDe').textContent = '';
  document.getElementById('previewMontoNum').textContent = '0.00';
  document.getElementById('previewMontoLetras').textContent = '';
  document.getElementById('previewConcepto1').textContent = '';
  document.getElementById('previewConcepto2').textContent = '';
  document.getElementById('previewEfectivoVal').textContent = '';
  document.getElementById('previewChequeNoVal').textContent = '';
  document.getElementById('previewBancoVal').textContent = '';
  document.getElementById('previewFirmaResponsable').textContent = '';
  const SVG_CHECK = `<svg viewBox="0 0 16 16" width="11" height="11" fill="none" stroke="#142852" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;"><polyline points="3 8 6.5 12 13 4"></polyline></svg>`;
  document.getElementById('checkEfectivoIcon').innerHTML = SVG_CHECK;
  document.getElementById('checkChequeIcon').innerHTML = '';

  actualizarCopiaPreview();
  mostrarToast('🧹 Formulario y vista previa listos para un nuevo recibo.');
}

/**
 * Modo Original y Copia (2 recibos en 1 hoja)
 */
function toggleOriginalYCopia() {
  const isChecked = document.getElementById('checkOriginalYCopia').checked;
  const cutLine = document.getElementById('cutLine');
  const copiaPreview = document.getElementById('reciboCopiaPreview');
  const wrapperTag = document.getElementById('wrapperTagRecibo1');

  if (isChecked) {
    if (cutLine) cutLine.classList.remove('hidden');
    if (copiaPreview) copiaPreview.classList.remove('hidden');
    if (wrapperTag) wrapperTag.classList.remove('hidden');
    actualizarCopiaPreview();
  } else {
    if (cutLine) cutLine.classList.add('hidden');
    if (copiaPreview) copiaPreview.classList.add('hidden');
    if (wrapperTag) wrapperTag.classList.add('hidden');
  }
}

function actualizarCopiaPreview() {
  const checkEl = document.getElementById('checkOriginalYCopia');
  if (!checkEl || !checkEl.checked) return;

  const original = document.getElementById('reciboPreview');
  const copia = document.getElementById('reciboCopiaPreview');
  if (!original || !copia) return;
  
  copia.innerHTML = original.innerHTML;
  
  const tag = copia.querySelector('#tagTipoRecibo1');
  if (tag) {
    tag.textContent = 'COPIA';
  }
}

/**
 * ========================================================
 * CÁLCULO DEL SIGUIENTE NÚMERO CORRELATIVO
 * ========================================================
 */
function obtenerSiguienteNumeroRecibo() {
  if (!recibos || recibos.length === 0) return '0001';

  let maxNum = 0;
  let maxDigits = 4;

  recibos.forEach(r => {
    const clean = (r.numero || '').toString().replace(/[^0-9]/g, '');
    if (clean) {
      const num = parseInt(clean, 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
        if (clean.length > maxDigits) maxDigits = clean.length;
      }
    }
  });

  const siguiente = maxNum + 1;
  return String(siguiente).padStart(maxDigits, '0');
}

/**
 * ========================================================
 * GUARDAR RECIBO (CON CONTROL ANTI-DUPLICADOS Y VALIDACIONES)
 * ========================================================
 */
async function guardarRecibo() {
  // Prevenir guardado múltiple por clics repetidos
  if (guardandoRecibo) {
    return;
  }

  const numInput = document.getElementById('inputNumero').value.trim();
  const fecha = document.getElementById('inputFecha').value || new Date().toISOString().split('T')[0];
  const cliente = document.getElementById('inputRecibidoDe').value.trim();
  const monto = parseFloat(document.getElementById('inputMonto').value) || 0;
  const montoLetras = document.getElementById('inputMontoLetras').value.trim();
  const concepto = document.getElementById('inputConcepto').value.trim();
  
  const radioPagoChecked = document.querySelector('input[name="tipoPago"]:checked');
  const tipoPago = radioChecked(radioPagoChecked) ? radioPagoChecked.value : 'efectivo';

  const chequeNo = document.getElementById('inputChequeNo').value.trim();
  const chequeBanco = document.getElementById('inputChequeBanco').value.trim();
  const bancoDirecto = document.getElementById('inputBancoDirecto').value.trim();
  const firmaResponsable = document.getElementById('inputFirmaResponsable').value.trim();

  // Validaciones
  if (!cliente) {
    alert('⚠️ Por favor escribe el nombre de quien se recibió el pago ("Hemos recibido de").');
    document.getElementById('inputRecibidoDe').focus();
    return;
  }

  if (monto <= 0) {
    alert('⚠️ Por favor ingresa un monto válido mayor a 0.');
    document.getElementById('inputMonto').focus();
    return;
  }

  // Bloqueo temporal para evitar clics repetidos
  guardandoRecibo = true;
  const btnGuardar = document.getElementById('btnGuardarRecibo');
  if (btnGuardar) {
    btnGuardar.disabled = true;
    btnGuardar.classList.add('opacity-50', 'cursor-not-allowed');
  }

  let numeroFinal = numInput || obtenerSiguienteNumeroRecibo();

  // Validación de número duplicado (cuando NO se está editando uno existente)
  if (!reciboActualId) {
    const yaExiste = recibos.find(r => r.numero === numeroFinal);
    if (yaExiste) {
      const siguienteCorrelativo = obtenerSiguienteNumeroRecibo();
      const deseaContinuar = confirm(
        `El recibo #${numeroFinal} ya fue utilizado anteriormente por ${yaExiste.cliente}.\n\n` +
        `¿Deseas guardarlo con el siguiente número disponible #${siguienteCorrelativo}?`
      );

      if (deseaContinuar) {
        numeroFinal = siguienteCorrelativo;
        document.getElementById('inputNumero').value = numeroFinal;
      } else {
        desbloquearBotonGuardar();
        return;
      }
    }
  }

  const ahora = new Date().toISOString();
  const receiptData = {
    id: reciboActualId || null,
    numero: numeroFinal,
    fecha: fecha,
    moneda: monedaActual,
    cliente: cliente,
    monto: monto,
    montoLetras: montoLetras,
    concepto: concepto,
    tipoPago: tipoPago,
    chequeNo: chequeNo,
    chequeBanco: chequeBanco,
    bancoDirecto: bancoDirecto,
    firmaResponsable: firmaResponsable,
    updatedAt: ahora,
    createdAt: reciboActualId ? (recibos.find(r => r.id === reciboActualId)?.createdAt || ahora) : ahora
  };

  try {
    await guardarEnFirestore(receiptData);
    const accion = receiptData.id ? 'actualizado' : 'guardado';
    mostrarToast(`✅ Recibo #${numeroFinal} ${accion} en la base de datos.`);
    document.getElementById('formReceiptTag').innerHTML = `Guardado (#<span>${numeroFinal}</span>)`;
    sincronizarVistaPrevia();
  } catch (err) {
    alert('⚠️ Error al guardar en la base de datos. Verifica tu conexión a internet.');
    desbloquearBotonGuardar();
    return;
  }

  desbloquearBotonGuardar();
}

function radioChecked(el) {
  return el !== null && el !== undefined;
}

function desbloquearBotonGuardar() {
  guardandoRecibo = false;
  const btnGuardar = document.getElementById('btnGuardarRecibo');
  if (btnGuardar) {
    btnGuardar.disabled = false;
    btnGuardar.classList.remove('opacity-50', 'cursor-not-allowed');
  }
}

/**
 * ========================================================
 * CARGAR RECIBO DESDE HISTORIAL PARA EDITAR O VER
 * ========================================================
 */
function cargarRecibo(id) {
  const r = recibos.find(item => item.id === id);
  if (!r) return;

  reciboActualId = r.id;
  document.getElementById('inputNumero').value = r.numero || '';
  document.getElementById('inputFecha').value = r.fecha || '';
  document.getElementById('inputRecibidoDe').value = r.cliente || '';
  document.getElementById('inputMonto').value = r.monto || '';
  
  // Normalizar moneda
  let moneda = (r.moneda || 'DOP').toUpperCase();
  if (moneda.includes('USD') || moneda.includes('DOL')) {
    monedaActual = 'USD';
  } else {
    monedaActual = 'DOP';
  }
  
  document.querySelectorAll('input[name="radioMoneda"]').forEach(rd => rd.checked = false);
  const radioMoneda = document.querySelector(`input[name="radioMoneda"][value="${monedaActual}"]`);
  if (radioMoneda) radioMoneda.checked = true;
  actualizarMonedaUI();

  document.getElementById('inputMontoLetras').value = r.montoLetras || '';
  document.getElementById('inputConcepto').value = r.concepto || '';

  // Normalizar tipo de pago
  let tipoPago = (r.tipoPago || 'efectivo').toLowerCase();
  if (tipoPago.includes('transf') || tipoPago.includes('banc')) tipoPago = 'banco';
  else if (tipoPago.includes('cheq')) tipoPago = 'cheque';
  else tipoPago = 'efectivo';

  document.querySelectorAll('input[name="tipoPago"]').forEach(rd => rd.checked = false);
  const radioPago = document.querySelector(`input[name="tipoPago"][value="${tipoPago}"]`);
  if (radioPago) {
    radioPago.checked = true;
  } else {
    const radioDef = document.querySelector('input[name="tipoPago"][value="efectivo"]');
    if (radioDef) radioDef.checked = true;
  }

  document.getElementById('inputChequeNo').value = r.chequeNo || '';
  document.getElementById('inputChequeBanco').value = r.chequeBanco || '';
  document.getElementById('inputBancoDirecto').value = r.bancoDirecto || '';
  document.getElementById('inputFirmaResponsable').value = r.firmaResponsable || r.recibidoPor || r.entregadoPor || '';

  document.getElementById('formReceiptTag').innerHTML = `Editando #<span>${r.numero}</span>`;
  
  togglePagoCampos();
  sincronizarVistaPrevia();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Duplicar recibo (ideal para pagos recurrentes)
 */
function duplicarRecibo(id) {
  const r = recibos.find(item => item.id === id);
  if (!r) return;

  limpiarFormulario();
  document.getElementById('inputRecibidoDe').value = r.cliente || '';
  document.getElementById('inputMonto').value = r.monto || '';
  
  let moneda = (r.moneda || 'DOP').toUpperCase();
  monedaActual = (moneda.includes('USD') || moneda.includes('DOL')) ? 'USD' : 'DOP';

  document.querySelectorAll('input[name="radioMoneda"]').forEach(rd => rd.checked = false);
  const radioMoneda = document.querySelector(`input[name="radioMoneda"][value="${monedaActual}"]`);
  if (radioMoneda) radioMoneda.checked = true;
  actualizarMonedaUI();

  document.getElementById('inputMontoLetras').value = r.montoLetras || '';
  document.getElementById('inputConcepto').value = r.concepto || '';
  document.getElementById('inputFirmaResponsable').value = r.firmaResponsable || r.recibidoPor || r.entregadoPor || '';

  let tipoPago = (r.tipoPago || 'efectivo').toLowerCase();
  if (tipoPago.includes('transf') || tipoPago.includes('banc')) tipoPago = 'banco';
  else if (tipoPago.includes('cheq')) tipoPago = 'cheque';
  else tipoPago = 'efectivo';

  document.querySelectorAll('input[name="tipoPago"]').forEach(rd => rd.checked = false);
  const radioPago = document.querySelector(`input[name="tipoPago"][value="${tipoPago}"]`);
  if (radioPago) radioPago.checked = true;

  togglePagoCampos();
  sincronizarVistaPrevia();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  mostrarToast(`📋 Datos de ${r.cliente} cargados para un nuevo recibo.`);
}

/**
 * Eliminar recibo con confirmación (elimina de Firestore)
 */
async function eliminarRecibo(id) {
  const r = recibos.find(item => item.id === id);
  if (!r) return;

  if (confirm(`¿Estás seguro de que deseas eliminar el Recibo #${r.numero} de ${r.cliente}?\n\nEsta acción es permanente y no se puede deshacer.`)) {
    try {
      await eliminarDeFirestore(id);
      if (reciboActualId === id) {
        limpiarFormulario();
      }
      mostrarToast(`🗑️ Recibo #${r.numero} eliminado de la base de datos.`);
    } catch (err) {
      console.error('Error al eliminar:', err);
      alert('❌ Error al eliminar el recibo. Verifica tu conexión.');
    }
  }
}

/**
 * ========================================================
 * GENERACIÓN DE PDF ROBUSTA (html2canvas 1.4.1 + jsPDF 2.5.1)
 * ========================================================
 */
async function generarPDFRecibo(accion = 'descargar') {
  // Asegurar que la vista previa tenga todos los datos sincronizados
  sincronizarVistaPrevia();

  const num = document.getElementById('inputNumero').value || 'recibo';
  const clienteRaw = document.getElementById('inputRecibidoDe').value || 'cliente';
  const cliente = clienteRaw.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
  const filename = `Recibo_${num}_${cliente}.pdf`;

  const isOriginalYCopia = document.getElementById('checkOriginalYCopia').checked;
  const elemento = isOriginalYCopia 
    ? document.getElementById('printArea') 
    : document.getElementById('reciboPreview');

  if (!elemento) return;

  mostrarToast('⏳ Generando PDF...');

  const origScrollX = window.scrollX;
  const origScrollY = window.scrollY;

  window.scrollTo(0, 0);

  try {
    const canvas = await html2canvas(elemento, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    window.scrollTo(origScrollX, origScrollY);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageWidth = doc.internal.pageSize.getWidth(); // 215.9 mm
    const margin = 14;
    const contentWidth = pageWidth - (margin * 2);
    const contentHeight = (canvas.height * contentWidth) / canvas.width;
    const posY = 15;

    doc.addImage(imgData, 'JPEG', margin, posY, contentWidth, contentHeight);

    if (accion === 'abrir') {
      const blobUrl = doc.output('bloburl');
      window.open(blobUrl, '_blank');
      mostrarToast('📄 PDF abierto en una nueva pestaña.');
    } else {
      doc.save(filename);
      mostrarToast(`📥 Descargando ${filename}...`);
    }

  } catch (err) {
    window.scrollTo(origScrollX, origScrollY);
    console.error('Error al generar PDF:', err);
    alert('Hubo un problema al generar el archivo. Se abrirá la opción de impresión del sistema.');
    window.print();
  }
}

/**
 * Acciones desde el formulario principal
 */
function descargarPDF() {
  generarPDFRecibo('descargar');
}

function abrirPDF() {
  generarPDFRecibo('abrir');
}

function imprimirDirecto() {
  sincronizarVistaPrevia();
  window.print();
}

/**
 * Acciones desde el Historial
 */
async function procesarPDFDesdeHistorial(id, accion = 'descargar') {
  cargarRecibo(id);
  await new Promise(resolve => setTimeout(resolve, 120));
  generarPDFRecibo(accion);
}

/**
 * ========================================================
 * EXPORTACIÓN A EXCEL PROFESIONAL (.xlsx)
 * ========================================================
 */
function exportarExcelProfesional() {
  if (recibos.length === 0) {
    alert('No hay recibos guardados para exportar.');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('Librería de Excel no cargada. Verifique su conexión a internet.');
    return;
  }

  const filas = recibos.map((r, idx) => ({
    'No.': idx + 1,
    'No. Recibo': r.numero,
    'Fecha': r.fecha,
    'Moneda': r.moneda || 'RD$',
    'Monto': parseFloat(r.monto) || 0,
    'Monto en Letras': r.montoLetras || '',
    'Recibido De': r.cliente,
    'Concepto / Detalle': r.concepto || '',
    'Forma de Pago': (r.tipoPago || '').toUpperCase(),
    'Referencia / Banco': r.chequeNo ? `Cheque #${r.chequeNo} (${r.chequeBanco || ''})` : (r.bancoDirecto || 'Efectivo'),
    'Firma Responsable': r.firmaResponsable || r.recibidoPor || r.entregadoPor || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(filas);

  worksheet['!cols'] = [
    { wch: 6 },  // No.
    { wch: 14 }, // No. Recibo
    { wch: 12 }, // Fecha
    { wch: 10 }, // Moneda
    { wch: 16 }, // Monto
    { wch: 45 }, // Monto en Letras
    { wch: 30 }, // Recibido De
    { wch: 40 }, // Concepto
    { wch: 16 }, // Forma de Pago
    { wch: 25 }, // Referencia
    { wch: 22 }  // Firma Responsable
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recibos');

  const fechaHoy = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Talonario_Recibos_${fechaHoy}.xlsx`);
  mostrarToast('📊 Archivo Excel generado y descargado exitosamente.');
}

/**
 * ========================================================
 * FIREBASE FIRESTORE - SINCRONIZACIÓN EN TIEMPO REAL
 * Los datos se guardan en la nube y sincronizan en cualquier PC
 * ========================================================
 */

/**
 * Inicia un listener en tiempo real que actualiza la lista
 * automáticamente cuando se guarda o elimina un recibo desde
 * CUALQUIER computadora o dispositivo.
 */
function iniciarListenerFirestore() {
  // Mostrar indicador de carga
  mostrarToast('☁️ Conectando con la base de datos...');

  if (unsubscribeListener) unsubscribeListener();

  unsubscribeListener = db.collection(COLECCION)
    .orderBy('createdAt', 'desc')
    .onSnapshot(
      (snapshot) => {
        recibos = snapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        }));
        renderHistorial();
        // Actualizar número siguiente al cargar
        const sig = obtenerSiguienteNumeroRecibo();
        const inputNum = document.getElementById('inputNumero');
        if (inputNum && !reciboActualId) {
          inputNum.value = sig;
          document.getElementById('receiptNumberDisplay').textContent = sig;
        }
        sincronizarVistaPrevia();
        mostrarToast('✅ Base de datos conectada y sincronizada.');
      },
      (error) => {
        console.error('Error en listener Firestore:', error);
        mostrarToast('❌ Error de conexión con la base de datos. Verifica tu internet.');
      }
    );
}

/**
 * Guarda o actualiza un recibo en Firestore (nube)
 */
async function guardarEnFirestore(receiptData) {
  try {
    if (reciboActualId && receiptData.id === reciboActualId) {
      // Actualizar documento existente
      await db.collection(COLECCION).doc(reciboActualId).set(receiptData);
    } else {
      // Crear nuevo documento con ID automático
      const docRef = await db.collection(COLECCION).add(receiptData);
      reciboActualId = docRef.id;
    }
    return true;
  } catch (error) {
    console.error('Error guardando en Firestore:', error);
    throw error;
  }
}

/**
 * Elimina un recibo de Firestore (nube)
 */
async function eliminarDeFirestore(id) {
  await db.collection(COLECCION).doc(id).delete();
}

function cargarRecibosDesdeStorage() {
  // Función legacy mantenida por compatibilidad — ya no se usa,
  // los datos vienen de Firestore vía iniciarListenerFirestore()
  renderHistorial();
}

/**
 * Renderizado de la tabla de historial y estadísticas
 */
function renderHistorial(lista = recibos) {
  const tbody = document.getElementById('tablaHistorialBody');
  const emptyState = document.getElementById('emptyState');
  if (!tbody) return;

  tbody.innerHTML = '';

  document.getElementById('badgeCount').textContent = recibos.length;
  document.getElementById('statTotalRecibos').textContent = recibos.length;

  const totalDOP = recibos
    .filter(r => (r.moneda || 'DOP') === 'DOP')
    .reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);

  const totalUSD = recibos
    .filter(r => r.moneda === 'USD')
    .reduce((acc, curr) => acc + (parseFloat(curr.monto) || 0), 0);

  document.getElementById('statMontoTotalDOP').textContent = 'RD$ ' + totalDOP.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  document.getElementById('statMontoTotalUSD').textContent = 'USD$ ' + totalUSD.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (recibos.length > 0) {
    const ultimo = recibos[0];
    const sim = ultimo.moneda === 'USD' ? 'USD$' : 'RD$';
    document.getElementById('statUltimoRecibo').textContent = `#${ultimo.numero} - ${ultimo.cliente} (${sim} ${ultimo.monto.toLocaleString('es-DO')})`;
  } else {
    document.getElementById('statUltimoRecibo').textContent = 'Ninguno aún';
  }

  if (lista.length === 0) {
    if (emptyState) emptyState.classList.remove('hidden');
    return;
  }
  if (emptyState) emptyState.classList.add('hidden');

  lista.forEach(r => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100';

    const sim = r.moneda === 'USD' ? 'USD$' : 'RD$';
    const formaTexto = r.tipoPago === 'efectivo' 
      ? '💵 Efectivo' 
      : (r.tipoPago === 'cheque' ? `🏦 Cheque #${r.chequeNo || 'S/N'}` : '📲 Transf.');

    tr.innerHTML = `
      <td class="py-3 px-3 font-bold text-indigo-950 whitespace-nowrap">#${escapeHtml(r.numero)}</td>
      <td class="py-3 px-3 text-slate-500 whitespace-nowrap">${r.fecha}</td>
      <td class="py-3 px-3 font-semibold text-slate-800">${escapeHtml(r.cliente)}</td>
      <td class="py-3 px-3 font-bold text-emerald-700 whitespace-nowrap">${sim} ${r.monto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
      <td class="py-3 px-3 text-slate-600 whitespace-nowrap">${formaTexto}</td>
      <td class="py-3 px-3 text-slate-500 max-w-xs truncate" title="${escapeHtml(r.concepto)}">${escapeHtml(r.concepto)}</td>
      <td class="py-3 px-3 text-center whitespace-nowrap">
        <button onclick="cargarRecibo('${r.id}')" title="Ver / Cargar en formulario" class="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded font-bold mr-1">
          ✏️ Ver
        </button>
        <button onclick="procesarPDFDesdeHistorial('${r.id}', 'descargar')" title="Descargar PDF directo" class="px-2 py-1 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded font-bold mr-1">
          📥 PDF
        </button>
        <button onclick="procesarPDFDesdeHistorial('${r.id}', 'abrir')" title="Abrir PDF en nueva pestaña" class="px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded font-bold mr-1">
          👁️ Ver PDF
        </button>
        <button onclick="duplicarRecibo('${r.id}')" title="Duplicar como nuevo" class="px-2 py-1 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-50 rounded font-bold mr-1">
          📋 Duplicar
        </button>
        <button onclick="eliminarRecibo('${r.id}')" title="Eliminar" class="p-1.5 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 rounded font-bold">
          🗑️
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Filtrado dinámico del historial
 */
function filtrarHistorial() {
  const q = document.getElementById('inputBuscar').value.toLowerCase().trim();
  if (!q) {
    renderHistorial(recibos);
    return;
  }
  const filtrados = recibos.filter(r => 
    (r.numero && r.numero.toString().toLowerCase().includes(q)) ||
    (r.cliente && r.cliente.toLowerCase().includes(q)) ||
    (r.concepto && r.concepto.toLowerCase().includes(q)) ||
    (r.fecha && r.fecha.toLowerCase().includes(q))
  );
  renderHistorial(filtrados);
}

/**
 * Respaldo JSON completo
 */
function exportarCopiaSeguridad() {
  if (recibos.length === 0) {
    alert('No hay recibos guardados para respaldar.');
    return;
  }
  const json = JSON.stringify(recibos, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Copia_Seguridad_Talonario_${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  mostrarToast('💾 Copia de seguridad descargada.');
}

function importarCopiaSeguridad(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      const importados = JSON.parse(e.target.result);
      if (Array.isArray(importados)) {
        if (confirm(`Se encontraron ${importados.length} recibos en el archivo.\n¿Deseas subirlos a la base de datos en la nube?`)) {
          mostrarToast('⏳ Subiendo recibos a la nube...');
          const batch = db.batch();
          importados.forEach(r => {
            const ahora = new Date().toISOString();
            const docRef = db.collection(COLECCION).doc(); // ID automático
            batch.set(docRef, {
              ...r,
              id: docRef.id,
              createdAt: r.createdAt || ahora,
              updatedAt: ahora
            });
          });
          await batch.commit();
          limpiarFormulario();
          mostrarToast(`✅ ${importados.length} recibos restaurados en la base de datos.`);
        }
      } else {
        alert('El archivo no tiene el formato correcto.');
      }
    } catch (err) {
      console.error('Error al importar:', err);
      alert('Error al leer o subir el archivo de respaldo.');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

/**
 * Utilidades
 */
function scrollToHistory() {
  const el = document.getElementById('historialSection');
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function mostrarToast(mensaje) {
  let toast = document.getElementById('toastNotification');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toastNotification';
    toast.className = 'toast-notification bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700';
    document.body.appendChild(toast);
  }
  toast.textContent = mensaje;
  toast.classList.add('show');
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function escapeHtml(str) {
  if (!str) return '';
  return str.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
