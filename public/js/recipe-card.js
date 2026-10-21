'use strict';

window.RecipeCard = (() => {
    const CLOCK_ICON = `<svg class="recipe__tag-icon" viewBox="0 0 640 640"><path d="M320 64C461.4 64 576 178.6 576 320C576 461.4 461.4 576 320 576C178.6 576 64 461.4 64 320C64 178.6 178.6 64 320 64zM296 184L296 320C296 328 300 335.5 306.7 340L402.7 404C413.7 411.4 428.6 408.4 436 397.3C443.4 386.2 440.4 371.4 429.3 364L344 307.2L344 184C344 170.7 333.3 160 320 160C306.7 160 296 170.7 296 184z"/></svg>`;
    const FIRE_ICON = `<svg class="recipe__tag-icon" viewBox="0 0 640 640"><path d="M256.5 37.6C265.8 29.8 279.5 30.1 288.4 38.5C300.7 50.1 311.7 62.9 322.3 75.9C335.8 92.4 352 114.2 367.6 140.1C372.8 133.3 377.6 127.3 381.8 122.2C382.9 120.9 384 119.5 385.1 118.1C393 108.3 402.8 96 415.9 96C429.3 96 438.7 107.9 446.7 118.1C448 119.8 449.3 121.4 450.6 122.9C460.9 135.3 474.6 153.2 488.3 175.3C515.5 219.2 543.9 281.7 543.9 351.9C543.9 475.6 443.6 575.9 319.9 575.9C196.2 575.9 96 475.7 96 352C96 260.9 137.1 182 176.5 127C196.4 99.3 216.2 77.1 231.1 61.9C239.3 53.5 247.6 45.2 256.6 37.7zM321.7 480C347 480 369.4 473 390.5 459C432.6 429.6 443.9 370.8 418.6 324.6C414.1 315.6 402.6 315 396.1 322.6L370.9 351.9C364.3 359.5 352.4 359.3 346.2 351.4C328.9 329.3 297.1 289 280.9 268.4C275.5 261.5 265.7 260.4 259.4 266.5C241.1 284.3 207.9 323.3 207.9 370.8C207.9 439.4 258.5 480 321.6 480z"/></svg>`;
    const PLATE_ICON = `<svg class="recipe__tag-icon" viewBox="0 0 640 640"><path d="M240 96C284.2 96 320 131.8 320 176L320 192C320 200.8 312.8 208 304 208C259.8 208 224 172.2 224 128L224 112C224 103.2 231.2 96 240 96zM120 128L168 128C181.3 128 192 138.7 192 152C192 165.3 181.3 176 168 176L120 176C106.7 176 96 165.3 96 152C96 138.7 106.7 128 120 128zM88 200L200 200C213.3 200 224 210.7 224 224C224 237.3 213.3 248 200 248L88 248C74.7 248 64 237.3 64 224C64 210.7 74.7 200 88 200zM96 296C96 282.7 106.7 272 120 272L168 272C181.3 272 192 282.7 192 296C192 309.3 181.3 320 168 320L120 320C106.7 320 96 309.3 96 296zM336 112C336 103.2 343.2 96 352 96C396.2 96 432 131.8 432 176L432 192C432 200.8 424.8 208 416 208C371.8 208 336 172.2 336 128L336 112zM464 96C508.2 96 544 131.8 544 176L544 192C544 200.8 536.8 208 528 208C483.8 208 448 172.2 448 128L448 112C448 103.2 455.2 96 464 96zM544 256L544 272C544 316.2 508.2 352 464 352C455.2 352 448 344.8 448 336L448 320C448 275.8 483.8 240 528 240C536.8 240 544 247.2 544 256zM416 240C424.8 240 432 247.2 432 256L432 272C432 316.2 396.2 352 352 352C343.2 352 336 344.8 336 336L336 320C336 275.8 371.8 240 416 240zM320 256L320 272C320 316.2 284.2 352 240 352C231.2 352 224 344.8 224 336L224 320C224 275.8 259.8 240 304 240C312.8 240 320 247.2 320 256zM67.5 411.6C65.6 396.9 77 384 91.8 384L548.2 384C563 384 574.4 396.9 572.6 411.6C566.3 461.8 528.2 501 480 510L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 510C111.8 501 73.7 461.8 67.5 411.6z"/></svg>`;


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
            `${PLATE_ICON}` + (entry.tags || []).map((tag) => tagNameMap[tag] || tag).join(', '), 
            entry.duration ? `${CLOCK_ICON} ${entry.duration} min` : null,
            entry.calories ? `${FIRE_ICON}${entry.calories} kcal` : null,
        ].filter(Boolean);

        const tags = tagItems.map((text) =>
            `<div class="foodplanner__recipe-tag">${text}</div>`
        ).join('');

        const weekplanBtn = `
          <button type="button" class="${action.className}" aria-label="${action.label}" title="${action.label}" ${action.disabled ? 'disabled' : ''}>
            ${action.icon}
            <span class="visually-hidden">${action.label}</span>
          </button>`;

        listItem.innerHTML = `
            ${weekplanBtn}
            <a href="${action.detailUrl}" class="foodplanner__card-link">
            ${entry.img ? `<img class="foodplanner__recipe-img" src="${entry.img}" alt="${entry.title}">` : ''}
            <div class="foodplanner__card-body">
                <span class="foodplanner__recipe-name">${entry.title}</span>
                ${tags ? `<div class="foodplanner__recipe-tags">${tags}</div>` : ''}
            </div>
            </a>`;

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
