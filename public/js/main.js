'use strict';

const WEEKPLAN_STORAGE_KEY = 'foodplan-weekplan-recipe-ids';
const SHARED_WISHLIST_CODE_KEY = 'foodplan-shared-wishlist-code';
const WEEKPLAN_ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 16L16 16M16 16L14 16M16 16L16 14M16 16L16 18"/><path d="M7 4V2.5M17 4V2.5M21.5 9H16.625H10.75M2 9H5.875"/><path d="M14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C20.1752 21.4816 19.3001 21.7706 18 21.8985"/></svg>`;

function getWeekplanRecipeIds() {
    try {
        const ids = JSON.parse(localStorage.getItem(WEEKPLAN_STORAGE_KEY) || '[]');
        return Array.isArray(ids) ? ids : [];
    } catch {
        return [];
    }
}

async function addToWeekplan(recipeId, button) {
    const recipeIds = getWeekplanRecipeIds();
    if (!recipeIds.includes(recipeId)) {
        recipeIds.push(recipeId);
        localStorage.setItem(WEEKPLAN_STORAGE_KEY, JSON.stringify(recipeIds));
    }

    const code = localStorage.getItem(SHARED_WISHLIST_CODE_KEY);
    if (code) {
        try {
            const response = await fetch(`/api/merklisten/${encodeURIComponent(code)}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipeIds }),
            });
            if (!response.ok) throw new Error();
        } catch {
            localStorage.removeItem(SHARED_WISHLIST_CODE_KEY);
            alert('Die geteilte Merkliste konnte nicht aktualisiert werden.');
        }
    }

    button.disabled = true;
    button.classList.add('foodplanner__weekplan-add--added');
    button.setAttribute('aria-label', 'Bereits zum Wochenplan hinzugefügt');
    button.title = 'Bereits hinzugefügt';
}

function toWeekplan() {
    window.location.href = 'weekplan.html';
}

async function fetchRecipes(search = null, filter = null, random = null) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filter && filter !== 'all') params.set('category', filter);

    const response = await fetch(`/api/recipes?${params}`);
    let data = await response.json();
    const recipesAmount = data.length;
    if (random) data = [data[random]];
    return { data, recipesAmount };
}

async function getRandom() {
    const { recipesAmount } = await fetchRecipes();
    const random = Math.floor(Math.random() * recipesAmount);
    window.location.href = `${window.location.origin}${window.location.pathname}?random=${random}`;
}

function buildRecipesHtml(data, recipesAmount) {
    const resultList = document.getElementById('foodplanner__list');
    const fragment = document.createDocumentFragment();
    document.querySelector('.foodplanner__results-count').textContent = recipesAmount;

    data.forEach((entry) => {
        const isInWeekplan = getWeekplanRecipeIds().includes(entry.id);
        const button = RecipeCard.create(entry, {
            className: `foodplanner__weekplan-add${isInWeekplan ? ' foodplanner__weekplan-add--added' : ''}`,
            label: isInWeekplan ? 'Bereits zum Wochenplan hinzugefügt' : 'Zum Wochenplan hinzufügen',
            icon: WEEKPLAN_ICON,
            disabled: isInWeekplan,
            onClick: (card) => addToWeekplan(entry.id, card.querySelector('.foodplanner__weekplan-add')),
        });
        fragment.appendChild(button);
    });

    resultList.replaceChildren(fragment);
    RecipeCard.bindInteractions(resultList);
}

function handleChange() {
    const search = document.getElementById('search').value;
    const category = document.getElementById('categories').value;
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (category) params.set('category', category);
    window.history.pushState({}, '', `${window.location.pathname}?${params}`);
    fetchRecipes(search, category).then(({ data, recipesAmount }) => buildRecipesHtml(data, recipesAmount));
}

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const search = params.get('search');
    const category = params.get('category');
    const random = params.get('random');

    if (search) document.getElementById('search').value = search;
    const categoryOption = category ? document.getElementById(`category_${category}`) : null;
    if (categoryOption) categoryOption.selected = true;

    fetchRecipes(search, category, random).then(({ data, recipesAmount }) => buildRecipesHtml(data, recipesAmount));
    document.getElementById('categories').addEventListener('change', handleChange);
});
