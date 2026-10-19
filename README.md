# 🧾 Talonario de Recibos Digital (Web & PDF)

Sistema web diseñado especialmente para sustituir el talonario físico tradicional de recibos por una versión digital moderna, rápida y fiel al formato original en papel.

---

## ✨ Características Principales

1. **Diseño Idéntico al Talonario Físico Dominicano**:
   - Marco azul marino con esquinas redondeadas.
   - Tipografía serif clásica con título **RECIBO**.
   - Cuadro superior de **FECHA** dividido en **DIA | MES | AÑO**.
   - Líneas punteadas/sólidas continuas para *HEMOS RECIBIDO DE*, *LA SUMA DE* y *POR CONCEPTO DE*.
   - Casilla destacada en fondo celeste/gris para el monto numérico **`RD$ [  ]`**.
   - Casillas de selección para **EFECTIVO**, **CHEQUE No.** y **BANCO**.
   - Líneas de firma para **ENTREGADO POR** y **RECIBIDO POR**.

2. **Facilidades para Ahorrar Tiempo**:
   - **Conversor automático a letras en español**: Escribes el número (ej. `15000`) y el sistema escribe automáticamente `"QUINCE MIL PESOS CON 00/100"`.
   - **Botón "Poner Hoy"**: Asigna la fecha actual automáticamente en las tres casillas de Día, Mes y Año.
   - **Autoincremento de Número de Recibo**: Sugiere de forma correlativa el siguiente recibo (0001, 0002...).

3. **Descarga en PDF e Impresión**:
   - **Descargar PDF**: Genera y guarda directamente el archivo `.pdf` con el nombre del cliente y número de recibo.
   - **Imprimir Directo**: Compatible con cualquier impresora (Ctrl + P) o guardado nativo en tamaño carta o media carta.
   - **Modo Original y Copia (2 en 1 hoja)**: Opción para imprimir dos recibos en una misma hoja con línea punteada de corte, tal cual los talonarios tradicionales de dos hojas.

4. **Historial y Base de Datos en la Propia Web**:
   - Guarda automáticamente todos los recibos en la memoria del navegador de la computadora (`localStorage`).
   - Buscador rápido por cliente, número, concepto o fecha.
   - Estadísticas en tiempo real: Total de recibos emitidos y monto total recaudado en RD$.
   - **Botón "Duplicar"**: Permite emitir un nuevo recibo a un cliente frecuente con un solo clic.
   - **Exportar a Excel / CSV**: Para llevar la contabilidad en una hoja de cálculo.
   - **Copia de Seguridad (Respaldar / Restaurar)**: Para guardar todos los recibos en un archivo seguro y poder transferirlos a otra PC si se desea.

---

## 🚀 Cómo Usarlo

1. Haz doble clic en el archivo **`abrir_talonario.bat`** o abre directamente **`index.html`** con Google Chrome, Microsoft Edge o cualquier navegador web.
2. Llena los campos del formulario a la izquierda. Verás cómo el recibo de la derecha se va llenando en vivo.
3. Haz clic en **"Guardar Recibo"** para almacenarlo en el historial, y en **"Descargar PDF"** para obtener el documento.
