/**
 * editor-features.js
 * Módulo de características interactivas del editor:
 * - Tooltips
 * - Popover de enlaces
 * - Imágenes (selección, redimensionamiento, drag & drop)
 * - Tablas (creación, toolbar, navegación)
 * - Slash commands (/ commands)
 */

// ============================================
// IMPORTS DESDE EDITOR-CORE
// ============================================

import { ICONS, SLASH_COMMANDS, $, btn, hide, show, emitChange, applyFormatBlock, sanitizeUrl } from './editor-core.js';

// Las funciones se usan directamente porque ya están importadas
// No necesitamos wrappers porque importamos las funciones directamente

// ============================================
// FUNCIONES AUXILIARES LOCALES
// ============================================

/** Crea un elemento DOM (re-exportado desde core) */
// $ ya importado desde core

/** Crea un botón con icono (re-exportado desde core) */
// btn ya importado desde core

// Las funciones $, btn, hide, show ya están importadas desde editor-core.js

// ============================================
// TOOLTIP
// ============================================

let tooltipElement = null;
let tooltipTimeout = null;

function createTooltip() {
    if (tooltipElement) return tooltipElement;
    tooltipElement = $('div', 'native-rich-editor__tooltip', { role: 'tooltip' });
    document.body.appendChild(tooltipElement);
    return tooltipElement;
}

function showTooltip(buttonElement, text) {
    if (!buttonElement || !text) {
        return;
    }

    const tooltip = createTooltip();
    tooltip.textContent = text;
    tooltip.style.display = 'block';

    // Calcular posición
    const rect = buttonElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    // Posicionar arriba del botón, centrado
    const top = rect.top + scrollY - tooltipRect.height - 8;
    const left = rect.left + scrollX + (rect.width / 2) - (tooltipRect.width / 2);

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;

    // Ajustar si se sale por la izquierda o derecha
    const viewportWidth = window.innerWidth;
    if (left < 8) {
        tooltip.style.left = `${rect.left + scrollX + 8}px`;
    } else if (left + tooltipRect.width > viewportWidth - 8) {
        tooltip.style.left = `${rect.right + scrollX - tooltipRect.width - 8}px`;
    }

    // Ajustar si se sale por arriba
    if (top < scrollY + 8) {
        tooltip.style.top = `${rect.bottom + scrollY + 8}px`;
    }
}

function hideTooltip() {
    if (tooltipElement) {
        tooltipElement.style.display = 'none';
    }
    if (tooltipTimeout) {
        clearTimeout(tooltipTimeout);
        tooltipTimeout = null;
    }
}

function setupTooltip(buttonElement, label, shortcut) {
    if (!buttonElement) {
        return;
    }

    const tooltipText = shortcut ? `${label} (${shortcut})` : label;
    let showTimeout = null;

    const clearShowTimeout = () => {
        if (showTimeout) {
            clearTimeout(showTimeout);
            showTimeout = null;
        }
    };

    buttonElement.addEventListener('mouseenter', () => {
        clearShowTimeout();
        showTimeout = setTimeout(() => {
            showTooltip(buttonElement, tooltipText);
        }, 300);
    });

    buttonElement.addEventListener('mouseleave', () => {
        clearShowTimeout();
        hideTooltip();
    });

    buttonElement.addEventListener('mousedown', () => {
        clearShowTimeout();
        hideTooltip();
    });

    buttonElement.addEventListener('focus', () => {
        clearShowTimeout();
        showTimeout = setTimeout(() => {
            showTooltip(buttonElement, tooltipText);
        }, 300);
    });

    buttonElement.addEventListener('blur', () => {
        clearShowTimeout();
        hideTooltip();
    });

    buttonElement.addEventListener('click', () => {
        clearShowTimeout();
        hideTooltip();
    });
}

// ============================================
// ENLACES - POPOVER
// ============================================

let popoverElement = null;
let popoverInputElement = null;
let popoverUrlDisplayElement = null;
let popoverEditButton = null;
let popoverDeleteButton = null;
let popoverCloseHandler = null;
let popoverMode = 'edit';
let popoverLinkNode = null;

function createPopover() {
    if (popoverElement) return popoverElement;

    popoverElement = $('div', 'native-rich-editor__popover', { role: 'dialog', 'aria-label': 'Insertar enlace' });
    const popoverContent = $('div', 'native-rich-editor__popover-content');
    const input = $('input', 'native-rich-editor__popover-input', { type: 'text', placeholder: 'URL del enlace', 'aria-label': 'URL del enlace' });
    popoverInputElement = input;

    const urlDisplay = $('div', 'native-rich-editor__popover-url-display');
    popoverUrlDisplayElement = urlDisplay;

    const buttonContainer = $('div', 'native-rich-editor__popover-actions');
    const confirmButton = btn(ICONS.check, 'native-rich-editor__popover-button native-rich-editor__popover-button--confirm', 'Confirmar');
    const cancelButton = btn(ICONS.close, 'native-rich-editor__popover-button native-rich-editor__popover-button--cancel', 'Cancelar');
    const editButton = btn(ICONS.edit, 'native-rich-editor__popover-button native-rich-editor__popover-button--edit', 'Editar enlace');
    const deleteButton = btn(ICONS.close, 'native-rich-editor__popover-button native-rich-editor__popover-button--delete', 'Eliminar enlace');
    popoverEditButton = editButton;
    popoverDeleteButton = deleteButton;

    [confirmButton, cancelButton, editButton, deleteButton].forEach(b => buttonContainer.appendChild(b));
    [input, urlDisplay, buttonContainer].forEach(el => popoverContent.appendChild(el));
    popoverElement.appendChild(popoverContent);
    document.body.appendChild(popoverElement);

    return popoverElement;
}

function showPopover(x, y, initialValue = '', mode = 'edit', linkNode = null) {
    const popover = createPopover();
    popoverMode = mode;
    popoverLinkNode = linkNode;

    if (mode === 'view') {
        popoverInputElement.style.display = 'none';
        popoverUrlDisplayElement.style.display = 'block';
        popoverUrlDisplayElement.textContent = initialValue || '';

        const confirmButton = popover.querySelector('.native-rich-editor__popover-button--confirm');
        const cancelButton = popover.querySelector('.native-rich-editor__popover-button--cancel');
        if (confirmButton) confirmButton.style.display = 'none';
        if (cancelButton) cancelButton.style.display = 'none';
        if (popoverEditButton) popoverEditButton.style.display = 'inline-flex';
        if (popoverDeleteButton) popoverDeleteButton.style.display = 'inline-flex';
    } else {
        popoverInputElement.style.display = 'block';
        popoverUrlDisplayElement.style.display = 'none';
        popoverInputElement.value = initialValue;

        const confirmButton = popover.querySelector('.native-rich-editor__popover-button--confirm');
        const cancelButton = popover.querySelector('.native-rich-editor__popover-button--cancel');
        if (confirmButton) confirmButton.style.display = 'inline-flex';
        if (cancelButton) cancelButton.style.display = 'inline-flex';
        if (popoverEditButton) popoverEditButton.style.display = 'none';
        if (popoverDeleteButton) popoverDeleteButton.style.display = 'none';
    }

    popover.style.display = 'block';

    const popoverRect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let left = x + scrollX - (popoverRect.width / 2);
    let top = y + scrollY + 8;

    if (left < 8) {
        left = 8;
    }

    if (left + popoverRect.width > viewportWidth - 8) {
        left = viewportWidth - popoverRect.width - 8;
    }

    if (top + popoverRect.height > scrollY + viewportHeight - 8) {
        top = y + scrollY - popoverRect.height - 8;
    }

    if (top < scrollY + 8) {
        top = scrollY + 8;
    }

    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;

    if (popoverCloseHandler) {
        document.removeEventListener('click', popoverCloseHandler);
    }

    popoverCloseHandler = (e) => {
        if (!popover.contains(e.target)) {
            hidePopover();
        }
    };

    setTimeout(() => {
        document.addEventListener('click', popoverCloseHandler);
    }, 0);

    if (mode === 'edit') {
        popoverInputElement.focus();
        popoverInputElement.select();
    }
}

function hidePopover() {
    if (popoverElement) {
        popoverElement.style.display = 'none';
    }
    if (popoverCloseHandler) {
        document.removeEventListener('click', popoverCloseHandler);
        popoverCloseHandler = null;
    }
    popoverLinkNode = null;
    popoverMode = 'edit';
}

function handleLinkClick(vnode, event, linkElement) {
    event.preventDefault();
    event.stopPropagation();

    const href = linkElement.getAttribute('href') || '';
    const rect = linkElement.getBoundingClientRect();

    showPopover(rect.left + rect.width / 2, rect.bottom, href, 'view', linkElement);
}

function setupPopoverViewHandlers(vnode) {
    if (!popoverEditButton || !popoverDeleteButton) return;

    popoverEditButton.onclick = () => {
        const url = popoverUrlDisplayElement.textContent;
        popoverMode = 'edit';
        showPopover(0, 0, url, 'edit', popoverLinkNode);
    };

    popoverDeleteButton.onclick = () => {
        if (popoverLinkNode) {
            const parent = popoverLinkNode.parentNode;
            while (popoverLinkNode.firstChild) {
                parent.insertBefore(popoverLinkNode.firstChild, popoverLinkNode);
            }
            parent.removeChild(popoverLinkNode);
            emitChange(vnode);
        }
        hidePopover();
    };
}

function setupPopoverEditHandlers(vnode, isEditingExisting = false) {
    const popover = popoverElement;
    if (!popover) return;

    const confirmButton = popover.querySelector('.native-rich-editor__popover-button--confirm');
    const cancelButton = popover.querySelector('.native-rich-editor__popover-button--cancel');

    if (confirmButton) {
        confirmButton.onclick = () => {
            applyLink(vnode);
        };
    }

    if (cancelButton) {
        cancelButton.onclick = () => {
            hidePopover();
        };
    }

    popoverInputElement.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            applyLink(vnode);
        } else if (e.key === 'Escape') {
            hidePopover();
        }
    };
}

function applyLink(vnode) {
    const url = popoverInputElement.value.trim();

    if (!url) {
        hidePopover();
        return;
    }

    const validUrl = sanitizeUrl(url, 'link');

    if (!validUrl) {
        popoverInputElement.focus();
        popoverInputElement.select();
        return;
    }

    const selection = window.getSelection();
    if (!selection.rangeCount) {
        hidePopover();
        return;
    }

    const range = selection.getRangeAt(0);

    if (popoverMode === 'edit' && popoverLinkNode) {
        popoverLinkNode.setAttribute('href', validUrl);
    } else {
        const link = document.createElement('a');
        link.setAttribute('href', validUrl);
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');

        if (range.collapsed) {
            link.textContent = validUrl;
        } else {
            while (range.firstChild) {
                link.appendChild(range.firstChild);
            }
        }

        range.deleteContents();
        range.insertNode(link);

        const newRange = document.createRange();
        newRange.selectNodeContents(link);
        selection.removeAllRanges();
        selection.addRange(newRange);
    }

    hidePopover();
    emitChange(vnode);
}

// ============================================
// IMÁGENES
// ============================================

let imageOverlayElement = null;
let selectedImageElement = null;
let resizeData = null;
let imageToolbarElement = null;
let imageFileInput = null;
const blobUrlRegistry = new Map();
const editorBlobUrls = new Map();

function createImageOverlay() {
    if (imageOverlayElement) return imageOverlayElement;

    imageOverlayElement = $('div', 'native-rich-editor__image-overlay');
    document.body.appendChild(imageOverlayElement);

    const positions = ['nw', 'ne', 'sw', 'se'];
    positions.forEach(pos => {
        const handle = $('div', 'native-rich-editor__image-resize-handle');
        handle.dataset.position = pos;
        imageOverlayElement.appendChild(handle);
    });

    return imageOverlayElement;
}

function createImageToolbar() {
    if (imageToolbarElement) return imageToolbarElement;

    imageToolbarElement = $('div', 'native-rich-editor__image-toolbar', { role: 'toolbar', 'aria-label': 'Alineación de imagen' });

    const alignments = [
        { value: 'left', icon: 'alignLeft', label: 'Alinear a la izquierda' },
        { value: 'center', icon: 'alignCenter', label: 'Centrar' },
        { value: 'right', icon: 'alignRight', label: 'Alinear a la derecha' }
    ];

    alignments.forEach(align => {
        const button = btn(ICONS[align.icon], 'native-rich-editor__image-toolbar-button', align.label);
        button.dataset.alignment = align.value;
        imageToolbarElement.appendChild(button);
    });

    document.body.appendChild(imageToolbarElement);
    return imageToolbarElement;
}

function showImageToolbar(vnode) {
    const toolbar = createImageToolbar();
    const image = selectedImageElement;

    if (!image) return;

    toolbar.style.display = 'inline-flex';

    const imageRect = image.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;

    let left = imageRect.left + (imageRect.width / 2) - (toolbarRect.width / 2);
    let top = imageRect.top + scrollY - toolbarRect.height - 8;

    if (left < 8) left = 8;
    if (left + toolbarRect.width > window.innerWidth - 8) {
        left = window.innerWidth - toolbarRect.width - 8;
    }

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;

    updateImageToolbarActiveState();
}

function hideImageToolbar() {
    if (imageToolbarElement) {
        imageToolbarElement.style.display = 'none';
    }
}

function updateImageToolbarActiveState() {
    if (!imageToolbarElement || !selectedImageElement) return;

    const alignment = selectedImageElement.style.float || 'none';
    const buttons = imageToolbarElement.querySelectorAll('.native-rich-editor__image-toolbar-button');

    buttons.forEach(btn => {
        const btnAlignment = btn.dataset.alignment;
        if (btnAlignment === alignment || (alignment === 'none' && btnAlignment === 'center')) {
            btn.classList.add('is-active');
        } else {
            btn.classList.remove('is-active');
        }
    });
}

function applyImageAlignment(vnode, alignment) {
    if (!selectedImageElement) return;

    if (alignment === 'center') {
        selectedImageElement.style.float = 'none';
        selectedImageElement.style.display = 'block';
        selectedImageElement.style.margin = '0 auto';
    } else {
        selectedImageElement.style.float = alignment;
        selectedImageElement.style.display = 'inline-block';
        selectedImageElement.style.margin = '';
    }

    updateImageOverlayPosition();
    updateImageToolbarActiveState();
    emitChange(vnode);
}

function setupImageToolbarHandlers(vnode) {
    const toolbar = createImageToolbar();
    const buttons = toolbar.querySelectorAll('.native-rich-editor__image-toolbar-button');

    buttons.forEach(button => {
        button.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const alignment = button.dataset.alignment;
            applyImageAlignment(vnode, alignment);
        });
    });
}

function selectImage(vnode, imgElement) {
    deselectImage();
    selectedImageElement = imgElement;

    const overlay = createImageOverlay();
    overlay.style.display = 'block';
    updateImageOverlayPosition();

    showImageToolbar(vnode);

    if (imgElement.src.startsWith('blob:')) {
        registerBlobUrl(vnode, imgElement.src, imgElement);
    }
}

function deselectImage() {
    selectedImageElement = null;
    resizeData = null;

    if (imageOverlayElement) {
        imageOverlayElement.style.display = 'none';
    }

    hideImageToolbar();
}

function updateImageOverlayPosition() {
    if (!imageOverlayElement || !selectedImageElement) return;

    const imgRect = selectedImageElement.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    imageOverlayElement.style.left = `${imgRect.left + scrollX}px`;
    imageOverlayElement.style.top = `${imgRect.top + scrollY}px`;
    imageOverlayElement.style.width = `${imgRect.width}px`;
    imageOverlayElement.style.height = `${imgRect.height}px`;

    const handles = imageOverlayElement.querySelectorAll('.native-rich-editor__image-resize-handle');
    handles.forEach(handle => {
        const pos = handle.dataset.position;
        let left = 'auto';
        let right = 'auto';
        let top = 'auto';
        let bottom = 'auto';

        if (pos.includes('w')) left = '-6px';
        if (pos.includes('e')) right = '-6px';
        if (pos.includes('n')) top = '-6px';
        if (pos.includes('s')) bottom = '-6px';

        handle.style.left = left;
        handle.style.right = right;
        handle.style.top = top;
        handle.style.bottom = bottom;
    });
}

function setupImageResizeHandlers(vnode) {
    const overlay = createImageOverlay();
    const handles = overlay.querySelectorAll('.native-rich-editor__image-resize-handle');

    handles.forEach(handle => {
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!selectedImageElement) return;

            const pos = handle.dataset.position;
            const startX = e.clientX;
            const startY = e.clientY;
            const startWidth = selectedImageElement.offsetWidth;
            const startHeight = selectedImageElement.offsetHeight;
            const aspectRatio = startWidth / startHeight;

            resizeData = {
                pos,
                startX,
                startY,
                startWidth,
                startHeight,
                aspectRatio
            };

            const onMouseMove = (moveEvent) => {
                if (!resizeData || !selectedImageElement) return;

                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;

                let newWidth = startWidth;
                let newHeight = startHeight;

                if (pos === 'se') {
                    newWidth = Math.max(50, startWidth + deltaX);
                    newHeight = newWidth / aspectRatio;
                } else if (pos === 'sw') {
                    newWidth = Math.max(50, startWidth - deltaX);
                    newHeight = newWidth / aspectRatio;
                } else if (pos === 'ne') {
                    newWidth = Math.max(50, startWidth + deltaX);
                    newHeight = newWidth / aspectRatio;
                } else if (pos === 'nw') {
                    newWidth = Math.max(50, startWidth - deltaX);
                    newHeight = newWidth / aspectRatio;
                }

                selectedImageElement.style.width = `${newWidth}px`;
                selectedImageElement.style.height = `${newHeight}px`;

                updateImageOverlayPosition();
            };

            const onMouseUp = () => {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                resizeData = null;
                emitChange(vnode);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });
    });

    document.addEventListener('click', (e) => {
        if (selectedImageElement &&
            !imageOverlayElement.contains(e.target) &&
            !imageToolbarElement?.contains(e.target) &&
            e.target !== selectedImageElement) {
            deselectImage();
        }
    });
}

function handleImageClick(vnode, event, imgElement) {
    event.stopPropagation();
    selectImage(vnode, imgElement);
}

function registerBlobUrl(vnode, blobUrl, imgElement) {
    if (!blobUrlRegistry.has(blobUrl)) {
        blobUrlRegistry.set(blobUrl, new Set());
    }
    blobUrlRegistry.get(blobUrl).add(imgElement);

    if (!editorBlobUrls.has(vnode)) {
        editorBlobUrls.set(vnode, new Set());
    }
    editorBlobUrls.get(vnode).add(blobUrl);
}

function revokeBlobUrl(blobUrl) {
    const imgElements = blobUrlRegistry.get(blobUrl);
    if (imgElements) {
        imgElements.forEach(img => {
            if (img.src === blobUrl) {
                URL.revokeObjectURL(blobUrl.replace('blob:'));
            }
        });
        blobUrlRegistry.delete(blobUrl);
    }
}

function cleanupUnusedBlobUrls(vnode) {
    const urls = editorBlobUrls.get(vnode);
    if (!urls) return;

    urls.forEach(url => {
        const imgElements = blobUrlRegistry.get(url);
        if (!imgElements || imgElements.size === 0) {
            revokeBlobUrl(url);
        }
    });
}

function cleanupAllBlobUrls(vnode) {
    const urls = editorBlobUrls.get(vnode);
    if (!urls) return;

    urls.forEach(url => revokeBlobUrl(url));
    editorBlobUrls.delete(vnode);
}

function createImageFileInput(vnode) {
    if (imageFileInput) {
        // Actualizar la referencia al vnode actual
        imageFileInput._editorVnode = vnode;
        return imageFileInput;
    }

    imageFileInput = document.createElement('input');
    imageFileInput.type = 'file';
    imageFileInput.accept = 'image/*';
    imageFileInput.multiple = true;
    imageFileInput.style.display = 'none';
    imageFileInput._editorVnode = vnode; // Guardar referencia al vnode
    document.body.appendChild(imageFileInput);

    // Usar la referencia guardada en el input
    imageFileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        const currentVnode = imageFileInput._editorVnode;
        if (files && files.length > 0 && currentVnode) {
            insertImageContent(currentVnode, files);
        }
        imageFileInput.value = '';
    });

    return imageFileInput;
}

function insertImageContent(vnode, files) {
    Array.from(files).forEach(file => {
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target.result;
            applyImage(vnode, dataUrl);
        };
        reader.readAsDataURL(file);
    });
}

function applyImage(vnode, src) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);
    const img = document.createElement('img');
    img.src = src;
    img.alt = 'Imagen';

    if (range.collapsed) {
        const p = document.createElement('p');
        p.appendChild(img);
        range.insertNode(p);
    } else {
        range.deleteContents();
        range.insertNode(img);
    }

    if (src.startsWith('blob:')) {
        registerBlobUrl(vnode, src, img);
    }

    emitChange(vnode);
}

// ============================================
// TABLAS
// ============================================

let tableToolbarElement = null;
let selectedTableCell = null;
let selectedTableElement = null;

function applyTable(vnode) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const range = selection.getRangeAt(0);

    const table = document.createElement('table');
    const tbody = document.createElement('tbody');

    for (let i = 0; i < 2; i++) {
        const tr = document.createElement('tr');
        for (let j = 0; j < 2; j++) {
            const cell = i === 0 ? document.createElement('th') : document.createElement('td');
            cell.textContent = '';
            cell.contentEditable = 'true';
            tr.appendChild(cell);
        }
        tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    if (range.collapsed) {
        const p = document.createElement('p');
        p.appendChild(table);
        range.insertNode(p);
    } else {
        range.deleteContents();
        range.insertNode(table);
    }

    emitChange(vnode);
}

function createTableToolbar() {
    if (tableToolbarElement) return tableToolbarElement;

    tableToolbarElement = $('div', 'native-rich-editor__table-toolbar', { role: 'toolbar', 'aria-label': 'Tabla' });

    const buttons = [
        { icon: 'arrowUp', action: 'row-above', label: 'Insertar fila arriba' },
        { icon: 'arrowDown', action: 'row-below', label: 'Insertar fila abajo' },
        { icon: 'arrowLeft', action: 'col-left', label: 'Insertar columna izquierda' },
        { icon: 'arrowRight', action: 'col-right', label: 'Insertar columna derecha' },
        { icon: 'trash', action: 'delete-row', label: 'Eliminar fila' },
        { icon: 'trash', action: 'delete-col', label: 'Eliminar columna' },
        { icon: 'trash', action: 'delete-table', label: 'Eliminar tabla' }
    ];

    buttons.forEach(b => {
        const button = btn(ICONS[b.icon], 'native-rich-editor__table-toolbar-button', b.label);
        button.dataset.action = b.action;
        tableToolbarElement.appendChild(button);
    });

    document.body.appendChild(tableToolbarElement);
    return tableToolbarElement;
}

function showTableToolbar(vnode, cellElement) {
    const toolbar = createTableToolbar();
    selectedTableCell = cellElement;
    selectedTableElement = cellElement.closest('table');

    toolbar.style.display = 'flex';

    const cellRect = cellElement.getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;

    let left = cellRect.left + (cellRect.width / 2) - (toolbarRect.width / 2);
    let top = cellRect.top + scrollY - toolbarRect.height - 8;

    if (left < 8) left = 8;
    if (left + toolbarRect.width > window.innerWidth - 8) {
        left = window.innerWidth - toolbarRect.width - 8;
    }
    if (top < scrollY + 8) {
        top = cellRect.bottom + scrollY + 8;
    }

    toolbar.style.left = `${left}px`;
    toolbar.style.top = `${top}px`;
}

function hideTableToolbar(vnode) {
    if (tableToolbarElement) {
        tableToolbarElement.style.display = 'none';
    }
    selectedTableCell = null;
    selectedTableElement = null;
}

function getCellPosition(cell) {
    const row = cell.parentNode;
    const table = row.parentNode.parentNode;
    const cellIndex = Array.from(row.children).indexOf(cell);
    const rowIndex = Array.from(table.tBodies[0].rows).indexOf(row);

    return { cellIndex, rowIndex, table, row };
}

function setSelectionToCell(cell) {
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(false);

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
}

function insertRowAbove(vnode) {
    if (!selectedTableCell) return;

    const { table, cellIndex } = getCellPosition(selectedTableCell);
    const tbody = table.tBodies[0];
    const newRow = tbody.insertRow(0);

    const colCount = tbody.rows[0]?.cells.length || 1;

    for (let i = 0; i < colCount; i++) {
        const cell = newRow.insertCell(i);
        cell.contentEditable = 'true';
        cell.textContent = '';
    }

    emitChange(vnode);
}

function insertRowBelow(vnode) {
    if (!selectedTableCell) return;

    const { table, rowIndex } = getCellPosition(selectedTableCell);
    const tbody = table.tBodies[0];
    const newRow = tbody.insertRow(rowIndex + 1);

    const colCount = tbody.rows[0]?.cells.length || 1;

    for (let i = 0; i < colCount; i++) {
        const cell = newRow.insertCell(i);
        cell.contentEditable = 'true';
        cell.textContent = '';
    }

    emitChange(vnode);
}

function insertColLeft(vnode) {
    if (!selectedTableCell) return;

    const { table, cellIndex } = getCellPosition(selectedTableCell);

    table.tBodies[0].rows.forEach(row => {
        const cell = row.insertCell(cellIndex);
        cell.contentEditable = 'true';
        cell.textContent = '';
    });

    emitChange(vnode);
}

function insertColRight(vnode) {
    if (!selectedTableCell) return;

    const { table, cellIndex } = getCellPosition(selectedTableCell);

    table.tBodies[0].rows.forEach(row => {
        const cell = row.insertCell(cellIndex + 1);
        cell.contentEditable = 'true';
        cell.textContent = '';
    });

    emitChange(vnode);
}

function deleteRow(vnode) {
    if (!selectedTableCell) return;

    const { row } = getCellPosition(selectedTableCell);
    const table = row.closest('table');

    if (table.tBodies[0].rows.length <= 1) {
        table.remove();
        hideTableToolbar(vnode);
    } else {
        row.remove();
    }

    emitChange(vnode);
}

function deleteCol(vnode) {
    if (!selectedTableCell) return;

    const { table, cellIndex } = getCellPosition(selectedTableCell);
    const firstRow = table.tBodies[0].rows[0];

    if (firstRow.children.length <= 1) {
        table.remove();
        hideTableToolbar(vnode);
    } else {
        table.tBodies[0].rows.forEach(row => {
            row.cells[cellIndex]?.remove();
        });
    }

    emitChange(vnode);
}

function deleteTable(vnode) {
    if (!selectedTableElement) return;

    selectedTableElement.remove();
    hideTableToolbar(vnode);
    emitChange(vnode);
}

function setupTableToolbarHandlers(vnode) {
    const toolbar = createTableToolbar();

    toolbar.addEventListener('mousedown', (e) => {
        const button = e.target.closest('.native-rich-editor__table-toolbar-button');
        if (!button) return;

        e.preventDefault();
        e.stopPropagation();

        const action = button.dataset.action;

        switch (action) {
            case 'row-above': insertRowAbove(vnode); break;
            case 'row-below': insertRowBelow(vnode); break;
            case 'col-left': insertColLeft(vnode); break;
            case 'col-right': insertColRight(vnode); break;
            case 'delete-row': deleteRow(vnode); break;
            case 'delete-col': deleteCol(vnode); break;
            case 'delete-table': deleteTable(vnode); break;
        }
    });
}

function handleTableCellClick(vnode, event, cellElement) {
    event.stopPropagation();
    showTableToolbar(vnode, cellElement);
}

function handleTableKeyboardNavigation(vnode, event) {
    if (!selectedTableCell) return;

    const { table, cellIndex, rowIndex } = getCellPosition(selectedTableCell);
    const tbody = table.tBodies[0];
    const rowCount = tbody.rows.length;
    const colCount = tbody.rows[0]?.cells.length || 1;

    let nextCell = null;

    if (event.key === 'Tab') {
        event.preventDefault();

        if (event.shiftKey) {
            if (cellIndex > 0) {
                nextCell = tbody.rows[rowIndex].cells[cellIndex - 1];
            } else if (rowIndex > 0) {
                nextCell = tbody.rows[rowIndex - 1].cells[colCount - 1];
            }
        } else {
            if (cellIndex < colCount - 1) {
                nextCell = tbody.rows[rowIndex].cells[cellIndex + 1];
            } else if (rowIndex < rowCount - 1) {
                nextCell = tbody.rows[rowIndex + 1].cells[0];
            } else {
                const newRow = tbody.insertRow(rowIndex + 1);
                for (let i = 0; i < colCount; i++) {
                    const cell = newRow.insertCell(i);
                    cell.contentEditable = 'true';
                }
                nextCell = newRow.cells[0];
            }
        }

        if (nextCell) {
            setSelectionToCell(nextCell);
            showTableToolbar(vnode, nextCell);
        }
    }
}

// ============================================
// SLASH COMMANDS
// ============================================

let slashMenuElement = null;
let slashMenuSelectedIndex = 0;
let slashMenuFilter = '';
let slashMenuQuery = '';
let slashMenuRange = null;
let slashMenuCloseHandler = null;
let currentEditorVnode = null;

function hasImageFiles(dataTransfer) {
    if (!dataTransfer || !dataTransfer.items || dataTransfer.items.length === 0) {
        return false;
    }
    return Array.from(dataTransfer.items).some(item =>
        item.kind === 'file' && item.type.startsWith('image/')
    );
}

function handleDragOver(event) {
    if (hasImageFiles(event.dataTransfer)) {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = 'copy';
    }
}

function handleDragEnter(event) {
    if (hasImageFiles(event.dataTransfer)) {
        event.preventDefault();
    }
}

function handleDragLeave(event) {
    // Opcional: lógica adicional al salir del área de drop
}

function createSlashMenu() {
    if (slashMenuElement) return slashMenuElement;

    slashMenuElement = $('div', 'native-rich-editor__slash-menu', { role: 'listbox', 'aria-label': 'Comandos' });
    document.body.appendChild(slashMenuElement);

    return slashMenuElement;
}

function getFilteredSlashCommands(query) {
    const commands = SLASH_COMMANDS;
    if (!query) return commands;

    const lowerQuery = query.toLowerCase();
    return commands.filter(cmd =>
        cmd.label.toLowerCase().includes(lowerQuery) ||
        cmd.description.toLowerCase().includes(lowerQuery)
    );
}

function renderSlashMenu(commands, selectedIndex, vnode) {
    const menu = createSlashMenu();
    menu.innerHTML = '';

    if (commands.length === 0) {
        menu.style.display = 'none';
        return;
    }

    commands.forEach((cmd, index) => {
        const item = $('div', `native-rich-editor__slash-menu-item${index === selectedIndex ? ' is-selected' : ''}`);
        item.dataset.index = index;
        item.dataset.command = cmd.id;

        const icon = $('div', 'native-rich-editor__slash-menu-item-icon');
        icon.innerHTML = ICONS[cmd.icon] || '';

        const content = $('div', 'native-rich-editor__slash-menu-item-content');
        const label = $('div', 'native-rich-editor__slash-menu-item-label');
        label.textContent = cmd.label;
        const description = $('div', 'native-rich-editor__slash-menu-item-description');
        description.textContent = cmd.description;

        content.appendChild(label);
        content.appendChild(description);

        item.appendChild(icon);
        item.appendChild(content);

        item.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            applySlashCommand(vnode, cmd);
        });

        item.addEventListener('mouseenter', () => {
            slashMenuSelectedIndex = index;
            renderSlashMenu(commands, index, vnode);
        });

        menu.appendChild(item);
    });

    menu.style.display = 'block';
}

function showSlashMenu(vnode, x, y, query = '') {
    currentEditorVnode = vnode;
    const commands = getFilteredSlashCommands(query);

    if (commands.length === 0) {
        hideSlashMenu();
        return;
    }

    const menu = createSlashMenu();
    slashMenuQuery = query;
    slashMenuSelectedIndex = 0;

    const menuRect = menu.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    let left = x + scrollX;
    let top = y + scrollY;

    if (left + 240 > window.innerWidth) {
        left = window.innerWidth - 250;
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;

    renderSlashMenu(commands, 0, vnode);

    if (slashMenuCloseHandler) {
        document.removeEventListener('click', slashMenuCloseHandler);
    }

    slashMenuCloseHandler = (e) => {
        if (!menu.contains(e.target)) {
            hideSlashMenu();
        }
    };

    setTimeout(() => {
        document.addEventListener('click', slashMenuCloseHandler);
    }, 0);
}

function hideSlashMenu() {
    if (slashMenuElement) {
        slashMenuElement.style.display = 'none';
    }

    if (slashMenuCloseHandler) {
        document.removeEventListener('click', slashMenuCloseHandler);
        slashMenuCloseHandler = null;
    }

    slashMenuQuery = '';
    slashMenuSelectedIndex = 0;
    slashMenuRange = null;
    currentEditorVnode = null;
}

function applySlashCommand(vnode, command) {
    hideSlashMenu();

    if (!slashMenuRange) return;

    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(slashMenuRange);

    // Eliminar el texto del comando
    const range = slashMenuRange.cloneRange();
    range.setStart(range.startContainer, slashMenuQuery.length);
    range.deleteContents();

    switch (command.command) {
        case 'formatBlock':
            applyFormatBlock(vnode, command.args.tagName);
            break;
        case 'insertUnorderedList':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'insertOrderedList':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'image':
            if (imageFileInput) {
                imageFileInput.click();
            }
            break;
        case 'table':
            applyTable(vnode);
            break;
        default:
            break;
    }

    emitChange(vnode);
}

function isCursorAtStartOfLine() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;

    const range = selection.getRangeAt(0);

    if (range.collapsed) {
        const node = range.startContainer;
        if (node.nodeType === Node.TEXT_NODE) {
            return range.startOffset === 0;
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            return range.startOffset === 0;
        }
    }

    return false;
}

function getSlashCommandQuery() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);

    if (!range.collapsed) return null;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return null;

    const text = node.textContent;
    const offset = range.startOffset;

    if (offset < 1) return null;

    const beforeCursor = text.substring(0, offset);
    const lastNewline = beforeCursor.lastIndexOf('\n');
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const lineText = beforeCursor.substring(lineStart);

    const match = lineText.match(/^\/(\w*)$/);

    if (match) {
        return {
            query: match[1],
            range: range,
            node: node,
            lineStart: lineStart,
            offset: offset
        };
    }

    return null;
}

function handleSlashCommandKeydown(vnode, event) {
    const result = getSlashCommandQuery();

    if (!result) {
        hideSlashMenu();
        return false;
    }

    const { query, range, node } = result;

    if (event.key === 'Escape') {
        hideSlashMenu();
        event.preventDefault();
        return true;
    }

    if (slashMenuElement && slashMenuElement.style.display !== 'none') {
        const commands = getFilteredSlashCommands(slashMenuQuery);

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            slashMenuSelectedIndex = (slashMenuSelectedIndex + 1) % commands.length;
            renderSlashMenu(commands, slashMenuSelectedIndex, vnode);
            return true;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            slashMenuSelectedIndex = (slashMenuSelectedIndex - 1 + commands.length) % commands.length;
            renderSlashMenu(commands, slashMenuSelectedIndex, vnode);
            return true;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            if (commands[slashMenuSelectedIndex]) {
                slashMenuRange = range;
                applySlashCommand(vnode, commands[slashMenuSelectedIndex]);
            }
            return true;
        }

        if (event.key === 'Tab') {
            event.preventDefault();
            if (commands[slashMenuSelectedIndex]) {
                slashMenuRange = range;
                applySlashCommand(vnode, commands[slashMenuSelectedIndex]);
            }
            return true;
        }
    }

    // Mostrar menú si hay query
    if (query || event.key === '/') {
        slashMenuRange = range;
        slashMenuQuery = query;

        const rect = range.getBoundingClientRect();
        showSlashMenu(vnode, rect.left, rect.bottom, query);

        return true;
    }

    return false;
}

// ============================================
// DRAG & DROP
// ============================================

function handleDrop(vnode, event) {
    const { state } = vnode;

    if (hasImageFiles(event.dataTransfer)) {
        event.preventDefault();

        const editorEl = state.editorEl;
        if (!editorEl) return;

        const files = event.dataTransfer.files;

        editorEl.classList.add('native-rich-editor__content--dragging');

        const cleanup = () => {
            editorEl.classList.remove('native-rich-editor__content--dragging');
        };

        setTimeout(cleanup, 200);

        insertImageContent(vnode, files);
    }
}

// ============================================
// EXPORTAR - Variables y funciones usadas desde editor.js
// ============================================

// Exportar variables globales que necesita editor.js
const EditorFeaturesGlobals = {
    // Tooltip
    get tooltipElement() { return tooltipElement; },
    get tooltipTimeout() { return tooltipTimeout; },

    // Popover
    get popoverElement() { return popoverElement; },
    get popoverInputElement() { return popoverInputElement; },
    get popoverUrlDisplayElement() { return popoverUrlDisplayElement; },
    get popoverEditButton() { return popoverEditButton; },
    get popoverDeleteButton() { return popoverDeleteButton; },
    get popoverCloseHandler() { return popoverCloseHandler; },
    get popoverMode() { return popoverMode; },
    get popoverLinkNode() { return popoverLinkNode; },

    // Images
    get imageOverlayElement() { return imageOverlayElement; },
    get selectedImageElement() { return selectedImageElement; },
    get resizeData() { return resizeData; },
    get imageToolbarElement() { return imageToolbarElement; },
    get imageFileInput() { return imageFileInput; },

    // Tables
    get tableToolbarElement() { return tableToolbarElement; },
    get selectedTableCell() { return selectedTableCell; },
    get selectedTableElement() { return selectedTableElement; },

    // Slash
    get slashMenuElement() { return slashMenuElement; },
    get slashMenuSelectedIndex() { return slashMenuSelectedIndex; },
    get slashMenuFilter() { return slashMenuFilter; },
    get slashMenuQuery() { return slashMenuQuery; },
    get slashMenuRange() { return slashMenuRange; },
    get slashMenuCloseHandler() { return slashMenuCloseHandler; },
    get currentEditorVnode() { return currentEditorVnode; }
};

// Exportar funciones necesarias
export {
    // Tooltip
    createTooltip,
    showTooltip,
    hideTooltip,
    setupTooltip,
    // Popover/Links
    createPopover,
    showPopover,
    hidePopover,
    handleLinkClick,
    setupPopoverViewHandlers,
    setupPopoverEditHandlers,
    applyLink,
    // Images
    createImageOverlay,
    createImageToolbar,
    showImageToolbar,
    hideImageToolbar,
    updateImageToolbarActiveState,
    applyImageAlignment,
    setupImageToolbarHandlers,
    selectImage,
    deselectImage,
    updateImageOverlayPosition,
    setupImageResizeHandlers,
    handleImageClick,
    registerBlobUrl,
    revokeBlobUrl,
    cleanupUnusedBlobUrls,
    cleanupAllBlobUrls,
    createImageFileInput,
    insertImageContent,
    applyImage,
    // Tables
    applyTable,
    createTableToolbar,
    showTableToolbar,
    hideTableToolbar,
    getCellPosition,
    setSelectionToCell,
    insertRowAbove,
    insertRowBelow,
    insertColLeft,
    insertColRight,
    deleteRow,
    deleteCol,
    deleteTable,
    setupTableToolbarHandlers,
    handleTableCellClick,
    handleTableKeyboardNavigation,
    // Slash Commands
    hasImageFiles,
    handleDragOver,
    handleDragEnter,
    handleDragLeave,
    createSlashMenu,
    getFilteredSlashCommands,
    renderSlashMenu,
    showSlashMenu,
    hideSlashMenu,
    applySlashCommand,
    isCursorAtStartOfLine,
    getSlashCommandQuery,
    handleSlashCommandKeydown,
    // Drag & Drop
    handleDrop
};
