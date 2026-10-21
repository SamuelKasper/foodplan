'use strict';

const WEEKPLAN_STORAGE_KEY = 'foodplan-weekplan-recipe-ids';

const WEEKPLAN_ICON = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M18 16L16 16M16 16L14 16M16 16L16 14M16 16L16 18"/><path d="M7 4V2.5M17 4V2.5M21.5 9H16.625H10.75M2 9H5.875"/><path d="M14 22H10C6.22876 22 4.34315 22 3.17157 20.8284C2 19.6569 2 17.7712 2 14V12C2 8.22876 2 6.34315 3.17157 5.17157C4.34315 4 6.22876 4 10 4H14C17.7712 4 19.6569 4 20.8284 5.17157C22 6.34315 22 8.22876 22 12V14C22 17.7712 22 19.6569 20.8284 20.8284C20.1752 21.4816 19.3001 21.7706 18 21.8985"/></svg>`;

function getWeekplanRecipeIds() {
    try {
        const ids = JSON.parse(localStorage.getItem(WEEKPLAN_STORAGE_KEY) || '[]');
        return Array.isArray(ids) ? ids : [];
    } catch {
        return [];
    }
}

function addToWeekplan(recipeId, button) {
    const recipeIds = getWeekplanRecipeIds();
    if (!recipeIds.includes(recipeId)) {
        recipeIds.push(recipeId);
        localStorage.setItem(WEEKPLAN_STORAGE_KEY, JSON.stringify(recipeIds));
    }
    button.disabled = true;
    button.classList.add('foodplanner__weekplan-add--added');
    button.setAttribute('aria-label', 'Bereits zum Wochenplan hinzugefügt');
    button.title = 'Bereits hinzugefügt';
}

const TAG_NAME_MAP = {
    meat: 'Fleisch', vegetable: 'Gemüse', rice: 'Reis', noodle: 'Nudeln',
    other: 'Anderes', salad: 'Salat', lentils: 'Linsen', sweets: 'Süßes',
};

function buildDetailHtml(recipe, isInWeekplan) {
    const tagItems = [
        ...(recipe.tags || []).map((tag) => TAG_NAME_MAP[tag] || tag),
        recipe.duration ? `${recipe.duration} min` : null,
        recipe.calories ? `${recipe.calories} kcal` : null,
    ].filter(Boolean);

    const tags = tagItems.map((text) =>
        `<div class="foodplanner__recipe-tag">${text}</div>`
    ).join('');

    const baseServings = recipe.servings ? parseInt(String(recipe.servings).match(/(\d+)/)?.[1]) : null;
    const servingsLabel = recipe.servings ? String(recipe.servings).replace(/\d+/, '').trim() : '';

    const servingsHtml = baseServings ? `
        <div class="foodplanner__servings" data-base-servings="${baseServings}">
            <span class="foodplanner__servings-label">Für</span>
            <button type="button" class="foodplanner__servings-btn js-servings-decrease" aria-label="Weniger Portionen">−</button>
            <span class="foodplanner__servings-count">${baseServings}</span>
            <button type="button" class="foodplanner__servings-btn js-servings-increase" aria-label="Mehr Portionen">+</button>
            <span class="foodplanner__servings-label">${servingsLabel}</span>
        </div>` : (recipe.servings ? `<p class="foodplanner__recipe-servings">Für ${recipe.servings}</p>` : '');

    const ingredientsHtml = (recipe.ingredients || []).map((ing) => {
        const parts = [ing.amount, ing.unit, ing.name].filter(Boolean);
        const baseAmount = ing.amount ? parseFloat(ing.amount) : null;
        const dataAttr = baseAmount ? ` data-base-amount="${baseAmount}"` : '';
        return `<li class="foodplanner__ingredient"${dataAttr}>${parts.join(' ')}</li>`;
    }).join('');

    const weekplanBtnClass = `foodplanner__weekplan-add${isInWeekplan ? ' foodplanner__weekplan-add--added' : ''}`;
    const weekplanLabel = isInWeekplan ? 'Bereits zum Wochenplan hinzugefügt' : 'Zum Wochenplan hinzufügen';

    return `
        ${recipe.img ? `<img class="foodplanner__recipe-img recipe-detail__img" src="${recipe.img}" alt="${recipe.title}">` : ''}
        <button type="button" class="${weekplanBtnClass}" aria-label="${weekplanLabel}" title="${weekplanLabel}" ${isInWeekplan ? 'disabled' : ''}>
            ${WEEKPLAN_ICON}
            <span class="visually-hidden">${weekplanLabel}</span>
        </button>
        <div class="recipe-detail__header">
            <h1 class="recipe-detail__title">${recipe.title}</h1>
            ${tags ? `<div class="foodplanner__recipe-tags">${tags}</div>` : ''}
        </div>
        <div class="recipe-detail__body">
            ${recipe.instruction ? `
            <div class="recipe-detail__instruction">
                <p class="foodplanner__recipe-description-headline">Anleitung</p>
                <p class="foodplanner__recipe-description">${recipe.instruction}</p>
            </div>` : ''}
            ${ingredientsHtml ? `
            <div class="recipe-detail__ingredients">
                ${servingsHtml}
                <p class="foodplanner__ingredient-headline">Zutaten</p>
                <ul class="foodplanner__ingredient-list">${ingredientsHtml}</ul>
            </div>` : ''}
        </div>
    `;
}

async function loadRecipe() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');

    const container = document.getElementById('recipe-detail');

    if (!id) {
        container.innerHTML = '<p class="recipe-detail__error">Kein Rezept angegeben.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/recipes/${encodeURIComponent(id)}`);
        if (!response.ok) {
            container.innerHTML = '<p class="recipe-detail__error">Rezept nicht gefunden.</p>';
            return;
        }

        const recipe = await response.json();
        document.title = `${recipe.title} | Foodplan`;

        const isInWeekplan = getWeekplanRecipeIds().includes(recipe.id);
        container.innerHTML = buildDetailHtml(recipe, isInWeekplan);

        container.querySelector('.foodplanner__weekplan-add')?.addEventListener('click', (e) => {
            addToWeekplan(recipe.id, e.currentTarget);
        });

        // Servings scaling
        container.addEventListener('click', (e) => {
            if (!e.target.classList.contains('js-servings-increase') && !e.target.classList.contains('js-servings-decrease')) return;
            const wrapper = e.target.closest('.foodplanner__servings');
            const baseServings = parseInt(wrapper.dataset.baseServings);
            const count = wrapper.querySelector('.foodplanner__servings-count');
            const current = parseInt(count.textContent);
            const next = e.target.classList.contains('js-servings-increase') ? current + 1 : Math.max(1, current - 1);
            count.textContent = next;

            const factor = next / baseServings;
            for (const ingredient of container.querySelectorAll('.foodplanner__ingredient[data-base-amount]')) {
                const scaled = Math.round(parseFloat(ingredient.dataset.baseAmount) * factor * 100) / 100;
                const display = scaled % 1 === 0 ? String(scaled) : scaled.toLocaleString('de-DE');
                const parts = ingredient.textContent.split(' ');
                parts[0] = display;
                ingredient.textContent = parts.join(' ');
            }
        });

    } catch {
        container.innerHTML = '<p class="recipe-detail__error">Fehler beim Laden des Rezepts.</p>';
    }
}

document.addEventListener('DOMContentLoaded', loadRecipe);
