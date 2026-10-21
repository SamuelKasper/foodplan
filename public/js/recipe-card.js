'use strict';

window.RecipeCard = (() => {
    const tagNameMap = {
        meat: 'Fleisch', vegetable: 'Gemüse', rice: 'Reis', noodle: 'Nudeln',
        other: 'Anderes', salad: 'Salat', lentils: 'Linsen', sweets: 'Süßes',
    };

    function buildServingsHtml(servings) {
        const baseNumber = parseInt(String(servings).match(/(\d+)/)?.[1]);
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
    }

    function create(entry, action) {
        const listItem = document.createElement('li');
        listItem.classList.add('foodplanner__list-item');

        const tagItems = [
            ...(entry.tags || []).map((tag) => tagNameMap[tag] || tag),
            entry.duration ? `${entry.duration} min` : null,
            entry.calories ? `${entry.calories} kcal` : null,
        ].filter(Boolean);

        const tags = tagItems.map((text) =>
            `<div class="foodplanner__recipe-tag">${text}</div>`
        ).join('');

        const weekplanBtn = `
          <button type="button" class="${action.className}" aria-label="${action.label}" title="${action.label}" ${action.disabled ? 'disabled' : ''}>
            ${action.icon}
            <span class="visually-hidden">${action.label}</span>
          </button>`;

        if (action.detailUrl) {
            // Link-tile mode: whole card is a link, no toggle
            listItem.innerHTML = `
              ${weekplanBtn}
              <a href="${action.detailUrl}" class="foodplanner__card-link">
                ${entry.img ? `<img class="foodplanner__recipe-img" src="${entry.img}" alt="${entry.title}">` : ''}
                <div class="foodplanner__card-body">
                  <span class="foodplanner__recipe-name">${entry.title}</span>
                  ${tags ? `<div class="foodplanner__recipe-tags">${tags}</div>` : ''}
                </div>
              </a>`;
        } else {
            // Toggle mode: used on weekplan page
            const ingredients = (entry.ingredients || []).map((ing) => {
                const parts = [ing.amount, ing.unit, ing.name].filter(Boolean);
                const baseAmount = ing.amount ? parseFloat(ing.amount) : null;
                const dataAttr = baseAmount ? ` data-base-amount="${baseAmount}"` : '';
                return `<li class="foodplanner__ingredient"${dataAttr}>${parts.join(' ')}</li>`;
            }).join('');

            listItem.innerHTML = `
              ${entry.img ? `<img class="foodplanner__recipe-img" src="${entry.img}" alt="${entry.title}">` : ''}
              ${weekplanBtn}
              <details class="foodplanner__details-toggle">
                <summary class="foodplanner__details-summary">
                  ${entry.title}
                  ${tags ? `<div class="foodplanner__recipe-tags">${tags}</div>` : ''}
                  <div class="foodplanner__summary-icon">
                    <svg viewBox="0 0 512 512"><path d="M505.183,123.179c-9.087-9.087-23.824-9.089-32.912,0.002l-216.266,216.27L39.729,123.179c-9.087-9.087-23.824-9.089-32.912,0.002c-9.089,9.089-9.089,23.824,0,32.912L239.55,388.82c4.364,4.364,10.283,6.816,16.455,6.816c6.172,0,12.092-2.453,16.455-6.817l232.721-232.727C514.272,147.004,514.272,132.268,505.183,123.179z"/></svg>
                  </div>
                </summary>
                <div class="foodplanner__recipe-content">
                  ${entry.servings ? buildServingsHtml(entry.servings) : ''}
                  ${entry.instruction ? `<p class="foodplanner__recipe-description-headline">Anleitung</p><p class="foodplanner__recipe-description">${entry.instruction}</p>` : ''}
                  ${ingredients ? `<p class="foodplanner__ingredient-headline">Zutaten</p><ul class="foodplanner__ingredient-list">${ingredients}</ul>` : ''}
                  <button class="foodplanner__recipe-button">Kopieren</button>
                </div>
              </details>`;
        }

        listItem.querySelector(`.${action.className.split(' ')[0]}`).addEventListener('click', () => action.onClick(listItem));
        return listItem;
    }

    function bindInteractions(list) {
        if (list.dataset.recipeCardInteractionsBound) return;
        list.dataset.recipeCardInteractionsBound = 'true';

        list.addEventListener('click', (event) => {
            if (event.target.classList.contains('foodplanner__recipe-button')) {
                const items = event.target.previousElementSibling.querySelectorAll('li');
                navigator.clipboard.writeText([...items].map((item) => item.textContent).join('\n'));
            }

            if (event.target.classList.contains('js-servings-increase') || event.target.classList.contains('js-servings-decrease')) {
                const wrapper = event.target.closest('.foodplanner__servings');
                const baseServings = parseInt(wrapper.dataset.baseServings);
                const count = wrapper.querySelector('.foodplanner__servings-count');
                const current = parseInt(count.textContent);
                const next = event.target.classList.contains('js-servings-increase') ? current + 1 : Math.max(1, current - 1);
                count.textContent = next;

                const factor = next / baseServings;
                for (const ingredient of wrapper.closest('.foodplanner__recipe-content').querySelectorAll('.foodplanner__ingredient[data-base-amount]')) {
                    const scaled = Math.round(parseFloat(ingredient.dataset.baseAmount) * factor * 100) / 100;
                    const display = scaled % 1 === 0 ? String(scaled) : scaled.toLocaleString('de-DE');
                    const parts = ingredient.textContent.split(' ');
                    parts[0] = display;
                    ingredient.textContent = parts.join(' ');
                }
            }
        });
    }

    return { create, bindInteractions };
})();
