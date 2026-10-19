/**
 * ========================================================
 * TALONARIO DE RECIBOS DIGITAL - LÓGICA DE APLICACIÓN
 * ========================================================
 */

// CLAVE DE LOCALSTORAGE
const STORAGE_KEY = 'talonario_recibos_guardados_v2';

// ESTADO GLOBAL
let recibos = [];
let reciboActualId = null;
let guardandoRecibo = false; // Bandera para evitar doble guardado
let monedaActual = 'DOP'; // 'DOP' o 'USD'

// INICIALIZACIÓN AL CARGAR LA PÁGINA
document.addEventListener('DOMContentLoaded', () => {
  cargarRecibosDesdeStorage();
  inicializarFormulario();
  configurarListeners();
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
    'inputEntregadoPor', 'inputRecibidoPor'
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
  
  document.getElementById('labelMontoMoneda').textContent = label;
  document.getElementById('prefixMontoMoneda').textContent = symbol;
  document.getElementById('previewSimboloMoneda').textContent = symbol;
}

/**
 * ========================================================
 * CONVERSOR DE NÚMEROS A LETRAS EN ESPAÑOL
 * Reglas solicitadas:
 * - Texto exacto en palabras para los centavos (ej: 60 -> SESENTA CENTAVOS)
 * - Si centavos es 0, no se describe
 * - Soporte para RD$ (PESOS) y USD (DÓLARES)
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
  const tipo = document.querySelector('input[name="tipoPago"]:checked').value;
  const chequeDiv = document.getElementById('chequeCampos');
  const bancoDiv = document.getElementById('bancoCampos');

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
  sincronizarVistaPrevia();
}

/**
 * ========================================================
 * SINCRONIZACIÓN DE LA VISTA PREVIA DEL TALONARIO
 * ========================================================
 */
function sincronizarVistaPrevia() {
  const num = document.getElementById('inputNumero').value || '0001';
  document.getElementById('previewNumero').textContent = `No. ${num}`;
  document.getElementById('receiptNumberDisplay').textContent = num;

  // Fecha
  const fechaVal = document.getElementById('inputFecha').value;
  if (fechaVal) {
    const parts = fechaVal.split('-');
    document.getElementById('previewDia').textContent = parts[2] || '--';
    document.getElementById('previewMes').textContent = parts[1] || '--';
    document.getElementById('previewAno').textContent = parts[0] || '----';
  } else {
    document.getElementById('previewDia').textContent = '--';
    document.getElementById('previewMes').textContent = '--';
    document.getElementById('previewAno').textContent = '----';
  }

  // Hemos recibido de
  document.getElementById('previewRecibidoDe').textContent = document.getElementById('inputRecibidoDe').value || '';

  // Monto numérico
  const montoVal = parseFloat(document.getElementById('inputMonto').value);
  if (!isNaN(montoVal) && montoVal > 0) {
    document.getElementById('previewMontoNum').textContent = montoVal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  } else {
    document.getElementById('previewMontoNum').textContent = '0.00';
  }

  // La suma de (letras)
  document.getElementById('previewMontoLetras').textContent = document.getElementById('inputMontoLetras').value || '';

  // Concepto (distribuir en dos líneas si es extenso)
  const concepto = document.getElementById('inputConcepto').value || '';
  const c1 = document.getElementById('previewConcepto1');
  const c2 = document.getElementById('previewConcepto2');

  if (concepto.length > 55) {
    const corte = concepto.lastIndexOf(' ', 55);
    const pos = corte > 20 ? corte : 55;
    c1.textContent = concepto.substring(0, pos);
    c2.textContent = concepto.substring(pos).trim();
  } else {
    c1.textContent = concepto;
    c2.textContent = '';
  }

  // Forma de Pago
  const tipo = document.querySelector('input[name="tipoPago"]:checked').value;
  const chkEfectivo = document.getElementById('checkEfectivoIcon');
  const chkCheque = document.getElementById('checkChequeIcon');
  const pEfectivo = document.getElementById('previewEfectivoVal');
  const pCheque = document.getElementById('previewChequeNoVal');
  const pBanco = document.getElementById('previewBancoVal');

  const symbol = monedaActual === 'USD' ? 'USD$' : 'RD$';

  if (tipo === 'efectivo') {
    chkEfectivo.innerHTML = '✔';
    chkCheque.innerHTML = '';
    pEfectivo.textContent = `${symbol} ` + (isNaN(montoVal) ? '0.00' : montoVal.toLocaleString('es-DO', { minimumFractionDigits: 2 }));
    pCheque.textContent = '';
    pBanco.textContent = '';
  } else if (tipo === 'cheque') {
    chkEfectivo.innerHTML = '';
    chkCheque.innerHTML = '✔';
    pEfectivo.textContent = '';
    pCheque.textContent = document.getElementById('inputChequeNo').value || 'S/N';
    pBanco.textContent = document.getElementById('inputChequeBanco').value || '';
  } else if (tipo === 'banco') {
    chkEfectivo.innerHTML = '';
    chkCheque.innerHTML = '';
    pEfectivo.textContent = '';
    pCheque.textContent = 'TRANSF.';
    pBanco.textContent = document.getElementById('inputBancoDirecto').value || 'TRANSFERENCIA BANCARIA';
  }

  // Firmas
  document.getElementById('previewEntregadoNombre').textContent = document.getElementById('inputEntregadoPor').value || '';
  document.getElementById('previewRecibidoNombre').textContent = document.getElementById('inputRecibidoPor').value || '';

  // Sincronizar copia si está activa
  actualizarCopiaPreview();
}

/**
 * ========================================================
 * LIMPIAR TANTO FORMULARIO COMO VISTA PREVIA (Punto 1)
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
  document.getElementById('inputEntregadoPor').value = '';
  document.getElementById('inputRecibidoPor').value = '';

  // Restablecer forma de pago a Efectivo
  document.querySelector('input[name="tipoPago"][value="efectivo"]').checked = true;
  togglePagoCampos();

  // 2. Establecer siguiente número correlativo automáticamente (Punto 7)
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
  document.getElementById('previewEntregadoNombre').textContent = '';
  document.getElementById('previewRecibidoNombre').textContent = '';
  document.getElementById('checkEfectivoIcon').innerHTML = '✔';
  document.getElementById('checkChequeIcon').innerHTML = '';

  actualizarCopiaPreview();
  mostrarToast('🧹 Formulario y vista previa limpiados correctamente.');
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
    cutLine.classList.remove('hidden');
    copiaPreview.classList.remove('hidden');
    if (wrapperTag) wrapperTag.classList.remove('hidden');
    actualizarCopiaPreview();
  } else {
    cutLine.classList.add('hidden');
    copiaPreview.classList.add('hidden');
    if (wrapperTag) wrapperTag.classList.add('hidden');
  }
}

function actualizarCopiaPreview() {
  const isChecked = document.getElementById('checkOriginalYCopia').checked;
  if (!isChecked) return;

  const original = document.getElementById('reciboPreview');
  const copia = document.getElementById('reciboCopiaPreview');
  
  copia.innerHTML = original.innerHTML;
  
  const tag = copia.querySelector('#tagTipoRecibo1');
  if (tag) {
    tag.textContent = 'COPIA';
  }
}

/**
 * ========================================================
 * CÁLCULO DEL SIGUIENTE NÚMERO CORRELATIVO (Punto 7)
 * ========================================================
 */
function obtenerSiguienteNumeroRecibo() {
  if (!recibos || recibos.length === 0) return '0001';

  let maxNum = 0;
  let maxDigits = 4;

  recibos.forEach(r => {
    const clean = (r.numero || '').replace(/[^0-9]/g, '');
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
function guardarRecibo() {
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
  const tipoPago = document.querySelector('input[name="tipoPago"]:checked').value;
  const chequeNo = document.getElementById('inputChequeNo').value.trim();
  const chequeBanco = document.getElementById('inputChequeBanco').value.trim();
  const bancoDirecto = document.getElementById('inputBancoDirecto').value.trim();
  const entregadoPor = document.getElementById('inputEntregadoPor').value.trim();
  const recibidoPor = document.getElementById('inputRecibidoPor').value.trim();

  // Validaciones básicas
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

  // Bloqueo temporal para evitar guardar 30 veces el mismo recibo
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
      // Si ya existe el número, asignar automáticamente el correlativo siguiente
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

  const receiptData = {
    id: reciboActualId || 'rec_' + Date.now(),
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
    entregadoPor: entregadoPor,
    recibidoPor: recibidoPor,
    updatedAt: new Date().toISOString()
  };

  if (reciboActualId) {
    // Actualizar recibo existente
    const index = recibos.findIndex(r => r.id === reciboActualId);
    if (index !== -1) {
      recibos[index] = receiptData;
    }
    mostrarToast(`✅ Recibo #${numeroFinal} actualizado exitosamente.`);
  } else {
    // Insertar nuevo recibo al principio de la lista
    recibos.unshift(receiptData);
    mostrarToast(`✅ Recibo #${numeroFinal} guardado exitosamente.`);
  }

  guardarEnLocalStorage();
  renderHistorial();

  // Avanzar automáticamente al siguiente número y limpiar para el próximo cliente
  setTimeout(() => {
    limpiarFormulario();
    desbloquearBotonGuardar();
  }, 400);
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
  document.getElementById('inputNumero').value = r.numero;
  document.getElementById('inputFecha').value = r.fecha;
  document.getElementById('inputRecibidoDe').value = r.cliente;
  document.getElementById('inputMonto').value = r.monto;
  
  monedaActual = r.moneda || 'DOP';
  const radioMoneda = document.querySelector(`input[name="radioMoneda"][value="${monedaActual}"]`);
  if (radioMoneda) radioMoneda.checked = true;
  actualizarMonedaUI();

  document.getElementById('inputMontoLetras').value = r.montoLetras;
  document.getElementById('inputConcepto').value = r.concepto;

  const radioPago = document.querySelector(`input[name="tipoPago"][value="${r.tipoPago}"]`);
  if (radioPago) radioPago.checked = true;

  document.getElementById('inputChequeNo').value = r.chequeNo || '';
  document.getElementById('inputChequeBanco').value = r.chequeBanco || '';
  document.getElementById('inputBancoDirecto').value = r.bancoDirecto || '';
  document.getElementById('inputEntregadoPor').value = r.entregadoPor || '';
  document.getElementById('inputRecibidoPor').value = r.recibidoPor || '';

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
  document.getElementById('inputRecibidoDe').value = r.cliente;
  document.getElementById('inputMonto').value = r.monto;
  
  monedaActual = r.moneda || 'DOP';
  const radioMoneda = document.querySelector(`input[name="radioMoneda"][value="${monedaActual}"]`);
  if (radioMoneda) radioMoneda.checked = true;
  actualizarMonedaUI();

  document.getElementById('inputMontoLetras').value = r.montoLetras;
  document.getElementById('inputConcepto').value = r.concepto;
  document.getElementById('inputEntregadoPor').value = r.entregadoPor || '';
  document.getElementById('inputRecibidoPor').value = r.recibidoPor || '';

  const radioPago = document.querySelector(`input[name="tipoPago"][value="${r.tipoPago}"]`);
  if (radioPago) radioPago.checked = true;

  togglePagoCampos();
  sincronizarVistaPrevia();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  mostrarToast(`📋 Datos de ${r.cliente} cargados para un nuevo recibo.`);
}

/**
 * Eliminar recibo con confirmación
 */
function eliminarRecibo(id) {
  const r = recibos.find(item => item.id === id);
  if (!r) return;

  if (confirm(`¿Estás seguro de que deseas eliminar el Recibo #${r.numero} de ${r.cliente}?`)) {
    recibos = recibos.filter(item => item.id !== id);
    guardarEnLocalStorage();
    renderHistorial();
    if (reciboActualId === id) {
      limpiarFormulario();
    }
    mostrarToast(`🗑️ Recibo #${r.numero} eliminado.`);
  }
}

/**
 * ========================================================
 * GENERACIÓN DE PDF ROBUSTA (PUNTOS 2 Y 3)
 * Utiliza html2canvas 1.4.1 + jsPDF 2.5.1 directamente.
 * Soporta 'descargar' o 'abrir' en nueva pestaña sin errores de pantalla en blanco.
 * ========================================================
 */
async function generarPDFRecibo(accion = 'descargar') {
  const num = document.getElementById('inputNumero').value || 'recibo';
  const clienteRaw = document.getElementById('inputRecibidoDe').value || 'cliente';
  const cliente = clienteRaw.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ]/g, '_');
  const filename = `Recibo_${num}_${cliente}.pdf`;

  const isOriginalYCopia = document.getElementById('checkOriginalYCopia').checked;
  const elemento = isOriginalYCopia 
    ? document.getElementById('printArea') 
    : document.getElementById('reciboPreview');

  if (!elemento) return;

  mostrarToast('⏳ Procesando documento PDF...');

  // 1. Guardar posición de scroll original
  const origScrollX = window.scrollX;
  const origScrollY = window.scrollY;

  // 2. Ir temporalmente al tope (0,0) para garantizar captura idéntica
  window.scrollTo(0, 0);

  try {
    // 3. Renderizar el elemento visible con html2canvas
    const canvas = await html2canvas(elemento, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    // 4. Restaurar la posición de scroll
    window.scrollTo(origScrollX, origScrollY);

    const imgData = canvas.toDataURL('image/jpeg', 0.98);

    // 5. Crear el documento jsPDF tamaño carta (Letter)
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

/**
 * Acciones desde el Historial (Punto 3: Descargar o Abrir)
 */
async function procesarPDFDesdeHistorial(id, accion = 'descargar') {
  cargarRecibo(id);
  // Pequeña espera para sincronizar la vista previa
  await new Promise(resolve => setTimeout(resolve, 150));
  generarPDFRecibo(accion);
}

/**
 * ========================================================
 * EXPORTACIÓN A EXCEL PROFESIONAL (Punto 6)
 * Utiliza SheetJS para generar un archivo .xlsx real y estilizado
 * ========================================================
 */
function exportarExcelProfesional() {
  if (recibos.length === 0) {
    alert('No hay recibos guardados para exportar.');
    return;
  }

  if (typeof XLSX === 'undefined') {
    alert('Librería de Excel no cargada. Verifique su conexión.');
    return;
  }

  // 1. Estructura de filas
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
    'Entregado Por': r.entregadoPor || '',
    'Recibido Por': r.recibidoPor || ''
  }));

  const worksheet = XLSX.utils.json_to_sheet(filas);

  // 2. Anchos óptimos de columna
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
    { wch: 22 }, // Entregado Por
    { wch: 22 }  // Recibido Por
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recibos');

  const fechaHoy = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `Talonario_Recibos_${fechaHoy}.xlsx`);
  mostrarToast('📊 Archivo Excel generado y descargado exitosamente.');
}

/**
 * ========================================================
 * STORAGE LOCAL Y HISTORIAL
 * ========================================================
 */
function guardarEnLocalStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recibos));
  } catch (e) {
    console.error('Error guardando en localStorage', e);
  }
}

function cargarRecibosDesdeStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      recibos = JSON.parse(data);
    } else {
      // Migrar si existía la versión 1 anterior
      const dataV1 = localStorage.getItem('talonario_recibos_guardados_v1');
      if (dataV1) {
        recibos = JSON.parse(dataV1);
        guardarEnLocalStorage();
      }
    }
  } catch (e) {
    recibos = [];
  }
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

  // Actualizar estadísticas separadas por moneda
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
        <button onclick="cargarRecibo('${r.id}')" title="Ver / Editar" class="px-2 py-1 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded font-bold mr-1">
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
    (r.numero && r.numero.toLowerCase().includes(q)) ||
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
  reader.onload = function(e) {
    try {
      const importados = JSON.parse(e.target.result);
      if (Array.isArray(importados)) {
        if (confirm(`Se encontraron ${importados.length} recibos en el archivo. ¿Deseas importarlos?`)) {
          recibos = importados;
          guardarEnLocalStorage();
          renderHistorial();
          limpiarFormulario();
          mostrarToast('✅ Datos restaurados exitosamente.');
        }
      } else {
        alert('El archivo no tiene el formato correcto.');
      }
    } catch (err) {
      alert('Error al leer el archivo de respaldo.');
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
