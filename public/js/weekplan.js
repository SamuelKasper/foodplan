'use strict';

const WEEKPLAN_STORAGE_KEY = 'foodplan-weekplan-recipe-ids';

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

const parseServingsNumber = (servingsStr) => {
    const match = String(servingsStr).match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
};

const buildServingsHtml = (servings) => {
    const baseNumber = parseServingsNumber(servings);
    if (!baseNumber) return `<p class="foodplanner__recipe-servings">Für ${servings}</p>`;

    const label = String(servings).replace(/\d+/, '').trim();
    return `
        <div class="foodplanner__servings" data-base-servings="${baseNumber}">
            <span class="foodplanner__servings-label">Für</span>
            <button type="button" class="foodplanner__servings-btn js-servings-decrease" aria-label="Weniger Portionen">−</button>
            <span class="foodplanner__servings-count">${baseNumber}</span>
            <button type="button" class="foodplanner__servings-btn js-servings-increase" aria-label="Mehr Portionen">+</button>
            <span class="foodplanner__servings-label">${label}</span>
        </div>
    `;
};

function updateIngredients(recipeContent, baseServings, newServings) {
    const factor = newServings / baseServings;
    const ingredients = recipeContent.querySelectorAll('.foodplanner__ingredient[data-base-amount]');

    for (const li of ingredients) {
        const baseAmount = parseFloat(li.dataset.baseAmount);
        const scaled = Math.round(baseAmount * factor * 100) / 100;
        const display = scaled % 1 === 0 ? scaled.toString() : scaled.toLocaleString('de-DE');
        const parts = li.textContent.split(' ');
        parts[0] = display;
        li.textContent = parts.join(' ');
    }
}

function removeFromWeekplan(recipeId) {
    saveWeekplanRecipeIds(getWeekplanRecipeIds().filter((id) => id !== recipeId));
    renderWeekplan();
}

function createWeekplanRecipe(entry) {
    const listItem = document.createElement('li');
    listItem.classList.add('foodplanner__list-item');

    const tagNameMap = {
        meat: 'Fleisch', vegetable: 'Gemüse', rice: 'Reis', noodle: 'Nudeln',
        other: 'Anderes', salad: 'Salat', lentils: 'Linsen', sweets: 'Süßes',
    };
    const tags = (entry.tags || [])
        .map((tag) => `<div class="foodplanner__recipe-tag">${tagNameMap[tag] || tag}</div>`)
        .join('');
    const ingredientsList = entry.ingredients || [];
    const ingredients = ingredientsList.length
        ? ingredientsList.map((ing) => {
            const parts = [ing.amount, ing.unit, ing.name].filter(Boolean);
            const baseAmount = ing.amount ? parseFloat(ing.amount) : null;
            return `<li class="foodplanner__ingredient"${baseAmount ? ` data-base-amount="${baseAmount}"` : ''}>${parts.join(' ')}</li>`;
        }).join('')
        : '';

    listItem.innerHTML = `
      ${entry.img ? `<img class="foodplanner__recipe-img" src="${entry.img}" alt="${entry.title}">` : ''}
      <button type="button" class="foodplanner__weekplan-remove" aria-label="Aus dem Wochenplan entfernen" title="Aus dem Wochenplan entfernen">
        <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M15 4C14.48 4 13.94 4.18 13.56 4.56 13.18 4.94 13 5.48 13 6v1H7v2h1v16c0 1.64 1.36 3 3 3h12c1.64 0 3-1.36 3-3V9h1V7h-6V6c0-.52-.18-1.06-.56-1.44C20.06 4.18 19.52 4 19 4h-4zm0 2h4v1h-4V6zm-5 3h14v16c0 .55-.45 1-1 1H11c-.55 0-1-.45-1-1V9zm2 3v11h2V12h-2zm4 0v11h2V12h-2zm4 0v11h2V12h-2z"/></svg>
        <span class="visually-hidden">Aus dem Wochenplan entfernen</span>
      </button>
      <details class="foodplanner__details-toggle">
        <summary class="foodplanner__details-summary">
          ${entry.title}
          <div class="foodplanner__recipe-tags">${tags}</div>
          <div class="foodplanner__summary-icon">
            <svg viewBox="0 0 512 512"><path d="M505.183,123.179c-9.087-9.087-23.824-9.089-32.912,0.002l-216.266,216.27L39.729,123.179c-9.087-9.087-23.824-9.089-32.912,0.002c-9.089,9.089-23.824,9.089-32.912,0.002c-9.089-9.089-23.824-9.089-32.912,0.002L239.55,388.82c4.364,4.364,10.283,6.816,16.455,6.816c6.172,0,12.092-2.453,16.455-6.817l232.721-232.727C514.272,147.004,514.272,132.268,505.183,123.179z"/></svg>
          </div>
        </summary>
        <div class="foodplanner__recipe-content">
          ${entry.servings ? buildServingsHtml(entry.servings) : ''}
          ${entry.calories ? `<p class="foodplanner__recipe-calories">Pro Portion: ${entry.calories} kcal</p>` : ''}
          ${entry.duration ? `<p class="foodplanner__recipe-duration">Dauer: ${entry.duration} min</p>` : ''}
          ${entry.instruction ? `<p class="foodplanner__recipe-description-headline">Anleitung</p><p class="foodplanner__recipe-description">${entry.instruction}</p>` : ''}
          ${ingredients ? `<p class="foodplanner__ingredient-headline">Zutaten</p><ul class="foodplanner__ingredient-list">${ingredients}</ul>` : ''}
          <button class="foodplanner__recipe-button">Kopieren</button>
        </div>
      </details>
    `;

    listItem.querySelector('.foodplanner__weekplan-remove').addEventListener('click', () => removeFromWeekplan(entry.id));
    return listItem;
}

function renderEmptyState() {
    const list = document.getElementById('weekplan__list');
    if (!list.children.length) {
        const message = document.createElement('p');
        message.className = 'weekplan__empty';
        message.textContent = 'Noch keine Rezepte hinzugefügt.';
        list.appendChild(message);
    }
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
    list.replaceChildren(...recipes.map(createWeekplanRecipe));
    renderEmptyState();
}

function resetWeekplan() {
    if (!confirm('Den gesamten Wochenplan leeren?')) return;
    saveWeekplanRecipeIds([]);
    renderWeekplan();
}

function addWeekplanInteractions() {
    const list = document.getElementById('weekplan__list');
    list.addEventListener('click', (event) => {
        if (event.target.classList.contains('foodplanner__recipe-button')) {
            const items = event.target.previousElementSibling.querySelectorAll('li');
            navigator.clipboard.writeText([...items].map((item) => item.textContent).join('\n'));
        }

        if (event.target.classList.contains('js-servings-increase') || event.target.classList.contains('js-servings-decrease')) {
            const wrapper = event.target.closest('.foodplanner__servings');
            const baseServings = parseInt(wrapper.dataset.baseServings);
            const count = wrapper.querySelector('.foodplanner__servings-count');
            let current = parseInt(count.textContent);
            current = event.target.classList.contains('js-servings-increase') ? current + 1 : Math.max(1, current - 1);
            count.textContent = current;
            updateIngredients(wrapper.closest('.foodplanner__recipe-content'), baseServings, current);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    addWeekplanInteractions();
    renderWeekplan();
});
