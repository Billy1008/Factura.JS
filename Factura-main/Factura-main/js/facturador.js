// Espera a que el DOM esté completamente cargado para empezar a trabajar
document.addEventListener('DOMContentLoaded', () => {

    // --- SELECCIÓN DE ELEMENTOS DEL DOM ---
    const form = document.getElementById('add-product-form');
    const productNameInput = document.getElementById('product-name');
    const productPriceInput = document.getElementById('product-price');
    const productQuantityInput = document.getElementById('product-quantity');
    const productList = document.getElementById('product-list');

    const summarySubtotal = document.getElementById('summary-subtotal');
    const summaryDiscount = document.getElementById('summary-discount');
    const summaryIva = document.getElementById('summary-iva');
    const summaryTotal = document.getElementById('summary-total');

    const saveInvoiceBtn = document.getElementById('save-invoice-btn');
    const invoiceHistoryList = document.getElementById('invoice-history-list');

    // Elementos del Modal
    const historyModal = document.getElementById('history-modal');
    const modalDetails = document.getElementById('modal-details');
    const modalCloseBtn = document.querySelector('.modal-close');

    // --- ESTADO DE LA APLICACIÓN ---
    // Un array para guardar todos los productos. Esta es nuestra "única fuente de verdad".
    let products = [];
    let productIdCounter = 0;
    let invoiceHistory = [];

    // --- CONSTANTES ---
    const STORAGE_KEY = 'invoiceHistoryDB';
    const DISCOUNT_RATE = 0.05; // 5%
    const IVA_RATE = 0.19;      // 19%

    // --- FUNCIONES ---

    /**
     * Carga el historial de facturas desde LocalStorage.
     */
    const loadHistoryFromStorage = () => {
        const storedHistory = localStorage.getItem(STORAGE_KEY);
        if (storedHistory) {
            invoiceHistory = JSON.parse(storedHistory);
        }
    };

    /**
     * Guarda el historial de facturas en LocalStorage.
     */
    const saveHistoryToStorage = () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(invoiceHistory));
    };

    /**
     * Formatea un número como moneda (en este caso, pesos colombianos por defecto).
     * @param {number} amount - La cantidad numérica a formatear.
     * @returns {string} - La cantidad formateada como una cadena de texto de moneda.
     */
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0, // Puedes cambiar a 2 si quieres centavos
        }).format(amount);
    };

    /**
     * Calcula los totales (subtotal, descuento, IVA, total) y los muestra en el DOM.
     */
    const updateSummary = () => {
        const subtotal = products.reduce((acc, product) => acc + (product.price * product.quantity), 0);
        const discount = subtotal * DISCOUNT_RATE;
        const baseForIva = subtotal - discount;
        const iva = baseForIva * IVA_RATE;
        const total = baseForIva + iva;

        summarySubtotal.textContent = formatCurrency(subtotal);
        summaryDiscount.textContent = `-${formatCurrency(discount)}`;
        summaryIva.textContent = `+${formatCurrency(iva)}`;
        summaryTotal.textContent = formatCurrency(total);

        // Devuelve los valores calculados para poder guardarlos
        return { subtotal, discount, iva, total };
    };

    /**
     * Renderiza (dibuja) la lista de productos en la tabla del HTML.
     */
    const renderProducts = () => {
        // Limpia la tabla antes de volver a dibujarla para no duplicar filas.
        productList.innerHTML = '';

        // Si no hay productos, muestra un mensaje.
        if (products.length === 0) {
            const emptyRow = document.createElement('tr');
            emptyRow.innerHTML = `<td colspan="5" class="history-item--empty">Aún no has añadido productos.</td>`;
            productList.appendChild(emptyRow);
            return;
        }

        // Por cada producto en el array, crea una fila en la tabla.
        products.forEach(product => {
            const row = document.createElement('tr');
            row.dataset.id = product.id; // Asigna un ID a la fila para identificarla.

            const subtotal = product.price * product.quantity;

            // `contenteditable="true"` permite editar el texto directamente en la celda.
            row.innerHTML = `
                <td class="editable" data-field="name" contenteditable="true">${product.name}</td>
                <td class="editable" data-field="price" contenteditable="true">${product.price}</td>
                <td class="editable" data-field="quantity" contenteditable="true">${product.quantity}</td>
                <td>${formatCurrency(subtotal)}</td>
                <td>
                    <button class="btn--delete" title="Eliminar producto">&#10006;</button>
                </td>
            `;
            productList.appendChild(row);
        });
    };

    /**
     * Renderiza la lista del historial de facturas.
     */
    const renderHistory = () => {
        invoiceHistoryList.innerHTML = '';
        if (invoiceHistory.length === 0) {
            invoiceHistoryList.innerHTML = `<li class="history-item--empty">No hay facturas guardadas.</li>`;
            return;
        }

        // Muestra las facturas más recientes primero
        [...invoiceHistory].reverse().forEach(invoice => {
            const listItem = document.createElement('li');
            listItem.className = 'history-item';
            listItem.dataset.invoiceId = invoice.id;
            listItem.innerHTML = `
                <span>Factura del ${new Date(invoice.date).toLocaleString()}</span>
                <span class="summary-item--total">${formatCurrency(invoice.total)}</span>
            `;
            invoiceHistoryList.appendChild(listItem);
        });
    };
    /**
     * Maneja el evento de envío del formulario para añadir un nuevo producto.
     */
    const handleAddProduct = (e) => {
        e.preventDefault(); // Evita que la página se recargue.

        const name = productNameInput.value.trim();
        const price = parseFloat(productPriceInput.value);
        const quantity = parseInt(productQuantityInput.value, 10);

        // Validación simple para asegurar que los datos son correctos.
        if (name && !isNaN(price) && price >= 0 && !isNaN(quantity) && quantity > 0) {
            const newProduct = {
                id: ++productIdCounter,
                name,
                price,
                quantity,
            };
            products.push(newProduct);

            renderAndRecalculate();

            form.reset(); // Limpia el formulario.
            productNameInput.focus(); // Pone el cursor en el campo de producto.
        } else {
            alert('Por favor, ingresa datos válidos para el producto.');
        }
    };

    /**
     * Maneja las acciones en la tabla (eliminar y editar).
     */
    const handleTableActions = (e) => {
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.id) return;

        const id = parseInt(row.dataset.id, 10);

        // Si se hizo clic en el botón de eliminar.
        if (target.classList.contains('btn--delete')) {
            products = products.filter(product => product.id !== id);
            renderAndRecalculate();
        }
        // Si se terminó de editar una celda (evento 'blur').
        else if (target.classList.contains('editable') && e.type === 'blur') {
            const field = target.dataset.field;
            const rawValue = target.textContent.trim();
            let value;

            if (field === 'name') {
                value = rawValue;
            } else {
                value = parseFloat(rawValue);
                if (isNaN(value) || value < 0) {
                    alert('Por favor, ingresa un número válido.');
                    renderProducts(); // Re-render para restaurar el valor anterior
                    return;
                }
            }

            const product = products.find(p => p.id === id);
            if (product) {
                product[field] = value;
                renderAndRecalculate();
            }
        }
    };

    /**
     * Guarda la factura actual en el historial.
     */
    const handleSaveInvoice = () => {
        if (products.length === 0) {
            alert('No puedes guardar una factura vacía.');
            return;
        }

        const summary = updateSummary();
        const newInvoice = {
            id: Date.now(), // ID único basado en el tiempo
            date: new Date().toISOString(),
            products: [...products], // Copia profunda de los productos
            ...summary // Añade subtotal, discount, iva, total
        };

        invoiceHistory.push(newInvoice);
        saveHistoryToStorage();

        // Limpiar la factura actual
        products = [];
        productIdCounter = 0;
        renderAndRecalculate();
        renderHistory();
        alert('¡Factura guardada en el historial!');
    };

    /**
     * Muestra los detalles de una factura del historial en un modal.
     */
    const handleViewHistory = (e) => {
        const item = e.target.closest('.history-item');
        if (!item || !item.dataset.invoiceId) return;

        const invoiceId = parseInt(item.dataset.invoiceId, 10);
        const invoice = invoiceHistory.find(inv => inv.id === invoiceId);

        if (invoice) {
            let detailsHtml = `<h3>Factura del ${new Date(invoice.date).toLocaleString()}</h3>`;
            detailsHtml += '<table><thead><tr><th>Producto</th><th>Precio</th><th>Cant.</th><th>Subtotal</th></tr></thead><tbody>';
            invoice.products.forEach(p => {
                detailsHtml += `<tr>
                    <td>${p.name}</td>
                    <td>${formatCurrency(p.price)}</td>
                    <td>${p.quantity}</td>
                    <td>${formatCurrency(p.price * p.quantity)}</td>
                </tr>`;
            });
            detailsHtml += '</tbody></table>';
            detailsHtml += `<div class="invoice-generator__summary" style="margin-left: auto; margin-top: 20px; max-width: 300px;">
                <div class="summary-item"><span>Subtotal:</span> <span>${formatCurrency(invoice.subtotal)}</span></div>
                <div class="summary-item"><span>Descuento (5%):</span> <span>-${formatCurrency(invoice.discount)}</span></div>
                <div class="summary-item"><span>IVA (19%):</span> <span>+${formatCurrency(invoice.iva)}</span></div>
                <div class="summary-item summary-item--total"><span>PAGO NETO:</span> <span>${formatCurrency(invoice.total)}</span></div>
            </div>`;

            modalDetails.innerHTML = detailsHtml;
            historyModal.classList.add('visible');
        }
    };

    // Función auxiliar para renderizar y recalcular, evitando repetición de código.
    const renderAndRecalculate = () => {
        renderProducts();
        updateSummary();
    };

    // --- EVENT LISTENERS ---
    form.addEventListener('submit', handleAddProduct);
    saveInvoiceBtn.addEventListener('click', handleSaveInvoice);
    productList.addEventListener('click', handleTableActions); // Para el botón de eliminar
    productList.addEventListener('blur', handleTableActions, true); // Para cuando se termina de editar
    invoiceHistoryList.addEventListener('click', handleViewHistory);

    // Listeners del modal
    modalCloseBtn.addEventListener('click', () => historyModal.classList.remove('visible'));
    historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) { // Cierra si se hace clic en el fondo
            historyModal.classList.remove('visible');
        }
    });

    // --- INICIALIZACIÓN ---
    loadHistoryFromStorage();
    renderAndRecalculate();
    renderHistory();
});