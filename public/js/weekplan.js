'use strict';

const WEEKPLAN_STORAGE_KEY = 'foodplan-weekplan-recipe-ids';
const SHARED_WISHLIST_CODE_KEY = 'foodplan-shared-wishlist-code';
const REMOVE_ICON = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M15 4C14.48 4 13.94 4.18 13.56 4.56 13.18 4.94 13 5.48 13 6v1H7v2h1v16c0 1.64 1.36 3 3 3h12c1.64 0 3-1.36 3-3V9h1V7h-6V6c0-.52-.18-1.06-.56-1.44C20.06 4.18 19.52 4 19 4h-4zm0 2h4v1h-4V6zm-5 3h14v16c0 .55-.45 1-1 1H11c-.55 0-1-.45-1-1V9zm2 3v11h2V12h-2zm4 0v11h2V12h-2zm4 0v11h2V12h-2z"/></svg>';

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
    const code = prompt('Gib einen genau 4 Zeichen langen Code ein (z. B. A7!?):');
    if (code === null) return;
    if (!/^[\x21-\x7E]{4}$/.test(code)) return alert('Der Code muss genau 4 sichtbare Zeichen enthalten.');
    try {
        const response = await fetch('/api/merklisten', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, recipeIds: getWeekplanRecipeIds() }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Teilen fehlgeschlagen.');
        localStorage.setItem(SHARED_WISHLIST_CODE_KEY, code);
        updateSharedWishlistStatus();
        alert(`Merkliste geteilt. Teile diesen Code: ${code}`);
    } catch (error) { alert(error.message); }
}

async function openWishlist() {
    const code = prompt('Gib den vierstelligen Merklistencode ein:');
    if (code === null) return;
    if (!/^[\x21-\x7E]{4}$/.test(code)) return alert('Der Code muss genau 4 sichtbare Zeichen enthalten.');
    try {
        const response = await fetch(`/api/merklisten/${encodeURIComponent(code)}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Merkliste nicht gefunden.');
        saveWeekplanRecipeIds(data.recipeIds.map(Number));
        localStorage.setItem(SHARED_WISHLIST_CODE_KEY, code);
        updateSharedWishlistStatus();
        await renderWeekplan();
        alert(`Merkliste ${code} geoeffnet.`);
    } catch (error) { alert(error.message); }
}

document.addEventListener('DOMContentLoaded', () => {
    updateSharedWishlistStatus();
    renderWeekplan();
});
