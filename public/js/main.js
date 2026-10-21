'use strict';

const WEEKPLAN_STORAGE_KEY = 'foodplan-weekplan-recipe-ids';
const SHARED_WISHLIST_CODE_KEY = 'foodplan-shared-wishlist-code';
const WEEKPLAN_ICON = `<svg viewBox="0 0 640 640"><path d="M305 151.1L320 171.8L335 151.1C360 116.5 400.2 96 442.9 96C516.4 96 576 155.6 576 229.1L576 231.7C576 343.9 436.1 474.2 363.1 529.9C350.7 539.3 335.5 544 320 544C304.5 544 289.2 539.4 276.9 529.9C203.9 474.2 64 343.9 64 231.7L64 229.1C64 155.6 123.6 96 197.1 96C239.8 96 280 116.5 305 151.1z"/></svg>`;

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
    window.location.href = `${window.location.origin}/recipe.html?id=${random}`;
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
            detailUrl: `recipe.html?id=${entry.id}`,
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
