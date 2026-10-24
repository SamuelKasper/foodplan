'use strict';

const WEEKPLAN_STORAGE_KEY = 'foodplan-weekplan-recipe-ids';
const SHARED_WISHLIST_CODE_KEY = 'foodplan-shared-wishlist-code';
const REMOVE_ICON = '<svg viewBox="0 0 640 640"><path d="M232.7 69.9C237.1 56.8 249.3 48 263.1 48L377 48C390.8 48 403 56.8 407.4 69.9L416 96L512 96C529.7 96 544 110.3 544 128C544 145.7 529.7 160 512 160L128 160C110.3 160 96 145.7 96 128C96 110.3 110.3 96 128 96L224 96L232.7 69.9zM128 208L512 208L512 512C512 547.3 483.3 576 448 576L192 576C156.7 576 128 547.3 128 512L128 208zM216 272C202.7 272 192 282.7 192 296L192 488C192 501.3 202.7 512 216 512C229.3 512 240 501.3 240 488L240 296C240 282.7 229.3 272 216 272zM320 272C306.7 272 296 282.7 296 296L296 488C296 501.3 306.7 512 320 512C333.3 512 344 501.3 344 488L344 296C344 282.7 333.3 272 320 272zM424 272C410.7 272 400 282.7 400 296L400 488C400 501.3 410.7 512 424 512C437.3 512 448 501.3 448 488L448 296C448 282.7 437.3 272 424 272z"/></svg>';

function getWeekplanRecipeIds() {
    try {
        const ids = JSON.parse(localStorage.getItem(WEEKPLAN_STORAGE_KEY) || '[]');
        return Array.isArray(ids) ? ids : [];
    } catch {
        return [];
    }
}

function saveWeekplanRecipeIds(ids) {
    localStorage.setItem(WEEKPLAN_STORAGE_KEY, JSON.stringify(ids));
}

function getSharedWishlistCode() {
    return localStorage.getItem(SHARED_WISHLIST_CODE_KEY) || '';
}

function updateSharedWishlistStatus() {
    const status = document.getElementById('shared-wishlist-status');
    const code = getSharedWishlistCode();
    if (!status) return;
    status.textContent = code ? `${code}` : '';
    status.hidden = !code;
}

async function saveSharedWishlist() {
    const code = getSharedWishlistCode();
    if (!code) return;
    const response = await fetch(`/api/merklisten/${encodeURIComponent(code)}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipeIds: getWeekplanRecipeIds() }),
    });
    if (!response.ok) throw new Error((await response.json()).error || 'Speichern fehlgeschlagen.');
}

function removeFromWeekplan(recipeId) {
    saveWeekplanRecipeIds(getWeekplanRecipeIds().filter((id) => id !== recipeId));
    saveSharedWishlist().then(renderWeekplan).catch((error) => alert(error.message));
}

async function renderWeekplan() {
    const list = document.getElementById('weekplan__list');
    const count = document.querySelector('.foodplanner__results-count');
    const recipeIds = getWeekplanRecipeIds();
    const recipes = (await Promise.all(recipeIds.map(async (id) => {
        const response = await fetch(`/api/recipes/${id}`);
        return response.ok ? response.json() : null;
    }))).filter(Boolean);

    const existingIds = recipes.map((recipe) => recipe.id);
    if (existingIds.length !== recipeIds.length) saveWeekplanRecipeIds(existingIds);

    count.textContent = recipes.length;
    list.replaceChildren(...recipes.map((recipe) => RecipeCard.create(recipe, {
        className: 'foodplanner__weekplan-remove',
        label: 'Aus dem Wochenplan entfernen',
        icon: REMOVE_ICON,
        detailUrl: `recipe.html?id=${recipe.id}`,
        onClick: () => removeFromWeekplan(recipe.id),
    })));

    if (!list.children.length) {
        const message = document.createElement('p');
        message.className = 'weekplan__empty';
        message.textContent = 'Noch keine Rezepte hinzugefügt.';
        list.appendChild(message);
    }

    RecipeCard.bindInteractions(list);
}

function resetWeekplan() {
    if (!confirm('Die gesamte Merkliste leeren?')) return;
    saveWeekplanRecipeIds([]);
    saveSharedWishlist().then(renderWeekplan).catch((error) => alert(error.message));
}

async function shareWishlist() {
    let popup = document.getElementById('foodplanner__sharelist-popup');
    let popupCode = document.getElementById('foodplanner__sharelist-popup-code');
    let popupClose = document.getElementById('foodplanner__sharelist-popup-close');
    let popupCopy = document.getElementById('foodplanner__sharelist-popup-copy');
    popupClose.addEventListener('click', () => {
        popup.close();
    });

    popupCopy.addEventListener('click', () => {
        navigator.clipboard.writeText(popupCode.innerText);
    });

    const code = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    try {
        const response = await fetch('/api/merklisten', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, recipeIds: getWeekplanRecipeIds() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Teilen fehlgeschlagen.');
        localStorage.setItem(SHARED_WISHLIST_CODE_KEY, code);
        updateSharedWishlistStatus();
        popupCode.innerText=code;
        popup.showModal();
    } catch (error) { alert(error.message); }
}

async function openWishlist() {
    const code = prompt('Gib den Merklistencode ein:');
    if (code === null) return;
    try {
        const response = await fetch(`/api/merklisten/${encodeURIComponent(code)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Merkliste nicht gefunden.');
        saveWeekplanRecipeIds(data.recipeIds.map(Number));
        localStorage.setItem(SHARED_WISHLIST_CODE_KEY, code);
        updateSharedWishlistStatus();
        await renderWeekplan();
    } catch (error) { alert(error.message); }
}

document.addEventListener('DOMContentLoaded', () => {
    updateSharedWishlistStatus();
    renderWeekplan();
});
