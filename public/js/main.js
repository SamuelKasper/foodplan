// Wartet bis das HTML vollständig geladen ist, bevor das Script ausgeführt wird.
// Ohne das könnte getElementById() null zurückgeben, weil die Elemente noch nicht existieren.
document.addEventListener("DOMContentLoaded", (event) => {
  // URL-Parameter auslesen (z.B. ?search=burger&category=meat&sort=name_asc)
  // URLSearchParams parst den Query-String der aktuellen URL
  let params = new URLSearchParams(window.location.search);
  let search = params.get("search");
  let category = params.get("category");
  let random = params.get("random");
  let sort = params.get("sort");

  // Falls URL-Parameter vorhanden sind, die entsprechenden Formularfelder vorausfüllen,
  // damit der User sieht welche Filter aktiv sind
  if (search && search != "") {
    let searchEl = document.getElementById("search");
    searchEl.value = search;
  }

  if (category) {
    let categoryEl = document.getElementById("category_" + category);
    categoryEl.selected = true;
  }

  if (sort) {
    let sortEl = document.getElementById("sort");
    sortEl.value = sort;
  }

  // Rezepte vom Server laden und HTML-Karten bauen
  fetchRecipes(search, category, random, sort).then(({ data, recipesAmount }) => {
    buildRecipesHtml(data, recipesAmount);
  });
});

// Holt Rezepte von der API mit optionalen Filtern.
// fetch() sendet einen HTTP-GET-Request an den Server.
// Die Parameter werden als Query-String angehängt (z.B. /api/recipes?search=burger&sort=name_asc)
async function fetchRecipes(search = null, filter = null, random = null, sort = null) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filter && filter !== 'all') params.set('category', filter);
  if (sort) params.set('sort', sort);

  const response = await fetch('/api/recipes?' + params.toString());
  // response.json() parst die JSON-Antwort vom Server in ein JavaScript-Array
  let data = await response.json();

  const recipesAmount = data.length;

  // Bei ?random=3 wird nur das Rezept an Index 3 angezeigt
  if (random) {
    data = [data[random]];
  }

  return { data, recipesAmount };
}

// Zufälliges Rezept: Lädt alle Rezepte, wählt einen zufälligen Index
// und leitet per URL-Parameter dorthin weiter
async function getRandom() {
  const { recipesAmount } = await fetchRecipes();
  let random = Math.floor(Math.random() * recipesAmount);
  let base = window.location.origin + window.location.pathname;
  window.location.href = base + "?random=" + random;
}

// Alle Filter zurücksetzen: Einfach die Seite ohne Parameter neu laden
function resetSearch() {
  window.location.href = window.location.origin + window.location.pathname;
}

// Extrahiert die Zahl aus einem Portionen-String wie "4 Portionen" oder "2"
// match(/(\d+)/) sucht die erste Zahl im String
const parseServingsNumber = (servingsStr) => {
    const match = String(servingsStr).match(/(\d+)/);
    return match ? parseInt(match[1]) : null;
};

// Baut das HTML für den Portionen-Zähler mit +/− Buttons.
// Falls keine Zahl im String gefunden wird (z.B. "Eine Portion"),
// wird nur der Text ohne Buttons angezeigt.
// data-base-servings speichert die Original-Portionszahl für die Berechnung.
const buildServingsHtml = (servings) => {
    const baseNumber = parseServingsNumber(servings);
    if (!baseNumber) {
        return `<p class="foodplanner__recipe-servings">Für ${servings}</p>`;
    }

    // Label extrahieren: "4 Portionen" → "Portionen"
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

// Baut die Zutatenliste mit data-base-amount Attributen.
// Die Originalmenge wird als data-Attribut gespeichert,
// damit beim Portionen-Ändern immer vom Originalwert aus gerechnet wird
// (statt vom bereits skalierten Wert, was zu Rundungsfehlern führen würde).
const buildScalableIngredients = (ingredientsList) => {
    return ingredientsList.map((ing) => {
        const baseAmount = ing.amount ? parseFloat(ing.amount) : null;
        const dataAttr = baseAmount ? ` data-base-amount="${baseAmount}"` : '';
        const displayAmount = ing.amount || '';
        const parts = [displayAmount, ing.unit, ing.name].filter(Boolean);
        return `<li class="foodplanner__ingredient"${dataAttr}>${parts.join(' ')}</li>`;
    }).join('');
};

// Skaliert alle Zutatenmengen basierend auf der neuen Portionszahl.
// factor = Verhältnis neue zu originale Portionen (z.B. 6/4 = 1.5 → 50% mehr)
// Rechnet immer vom Originalwert (data-base-amount), nicht vom aktuell angezeigten.
const updateIngredients = (recipeContent, baseServings, newServings) => {
    const factor = newServings / baseServings;
    const ingredients = recipeContent.querySelectorAll('.foodplanner__ingredient[data-base-amount]');

    for (const li of [...ingredients]) {
        const baseAmount = parseFloat(li.dataset.baseAmount);
        const scaled = Math.round(baseAmount * factor * 100) / 100;
        // Ganze Zahlen ohne Dezimalstellen anzeigen, Kommazahlen im deutschen Format
        const display = scaled % 1 === 0 ? scaled.toString() : scaled.toLocaleString('de-DE');
        const ing = li.textContent.split(' ');
        ing[0] = display;
        li.textContent = ing.join(' ');
    }
};

// Baut aus den API-Daten die Rezeptkarten im HTML.
// DocumentFragment = ein "unsichtbarer" Container.
// Alle Elemente werden erst im Fragment gebaut und dann auf einmal ins DOM eingefügt.
// Das ist schneller als jedes Element einzeln einzufügen (weniger Reflow/Repaint).
function buildRecipesHtml(data, recipesAmount) {
  let resultList = document.getElementById("foodplanner__list");
  const fragment = document.createDocumentFragment();

  document.querySelector(".foodplanner__results-count").innerText = recipesAmount;

  // Create elements
  data.forEach((entry) => {
    const listItem = document.createElement("li");
    listItem.classList.add("foodplanner__list-item");

    // Mapping von internen Tag-Keys (DB) auf deutsche Anzeigenamen
    const tagNameMap = {
      meat: "Fleisch",
      vegetable: "Gemüse",
      rice: "Reis",
      noodle: "Nudeln",
      other: "Anderes",
      salad: "Salat",
      lentils: "Linsen",
      sweets: "Süßes",
    };

    const tags = (entry.tags || [])
      .map((tag) => `<div class="foodplanner__recipe-tag">${tagNameMap[tag] || tag}</div>`)
      .join("");

    const ingredientsList = entry.ingredients || [];
    const ingredients = ingredientsList.length
      ? ingredientsList
          .map((ing) => {
            const parts = [ing.amount, ing.unit, ing.name].filter(Boolean);
            return `<li class="foodplanner__ingredient">${parts.join(' ')}</li>`;
          })
          .join("")
      : "";

    listItem.innerHTML = `
      ${entry.img ? `<img class="foodplanner__recipe-img" src="${entry.img}" alt="${entry.title}">` : ''}
      <details class="foodplanner__details-toggle">
        <summary class="foodplanner__details-summary">
          ${entry.title}
          <div class="foodplanner__recipe-tags">${tags}</div>
          <div class="foodplanner__summary-icon">
            <svg viewBox="0 0 512 512"><path d="M505.183,123.179c-9.087-9.087-23.824-9.089-32.912,0.002l-216.266,216.27L39.729,123.179c-9.087-9.087-23.824-9.089-32.912,0.002c-9.089,9.089-9.089,23.824,0,32.912L239.55,388.82c4.364,4.364,10.283,6.816,16.455,6.816c6.172,0,12.092-2.453,16.455-6.817l232.721-232.727C514.272,147.004,514.272,132.268,505.183,123.179z"/></svg>
          </div>
        </summary>
        <div class="foodplanner__recipe-content">
          ${entry.servings ? buildServingsHtml(entry.servings) : ''}
          ${entry.calories ? `<p class="foodplanner__recipe-calories">Pro Portion: ${entry.calories} kcal</p>` : ''}
          ${entry.duration ? `<p class="foodplanner__recipe-duration">Dauer: ${entry.duration} min</p>` : ''}
          ${entry.instruction ? `<p class="foodplanner__recipe-description-headline">Anleitung</p><p class="foodplanner__recipe-description">${entry.instruction}</p>` : ''}
          ${ingredients ? `<p class="foodplanner__ingredient-headline">Zutaten</p><ul class="foodplanner__ingredient-list">${buildScalableIngredients(ingredientsList)}</ul>` : ''}
          <button class="foodplanner__recipe-button">Kopieren</button>
        </div>
      </details>
    `;

    fragment.appendChild(listItem);
  });

  resultList.innerHTML = "";
  resultList.appendChild(fragment);

  // Event Delegation: Ein einziger Event-Listener auf der Liste statt
  // auf jedem einzelnen Button. Klicks "bubblen" hoch zum Elternelement.
  // e.target ist das tatsächlich angeklickte Element.
  // Das ist effizienter und funktioniert auch für dynamisch hinzugefügte Elemente.
  resultList.addEventListener("click", (e) => {

    // "Kopieren"-Button: Sammelt alle Zutatentexte und kopiert sie in die Zwischenablage.
    // navigator.clipboard.writeText() ist die moderne Browser-API dafür.
    if (e.target.classList.contains("foodplanner__recipe-button")) {
      const list = e.target.previousElementSibling;
      const listItems = list.querySelectorAll("li");
      let content = "";
      listItems.forEach(function (item) {
        content += item.textContent + "\n";
      });

      navigator.clipboard
        .writeText(content)
        .then(function () {})
        .catch(function (error) {
          console.error("Fehler beim Kopieren:", error);
        });
    }

    // Portionen +/− Buttons: Passt die angezeigte Portionszahl an
    // und skaliert die Zutatenmengen über updateIngredients()
    if (e.target.classList.contains('js-servings-increase') || e.target.classList.contains('js-servings-decrease')) {
      // closest() sucht das nächste Elternelement mit dem Selektor (geht den DOM-Baum hoch)
      const servingsWrapper = e.target.closest('.foodplanner__servings');
      const baseServings = parseInt(servingsWrapper.dataset.baseServings);
      const countEl = servingsWrapper.querySelector('.foodplanner__servings-count');
      let current = parseInt(countEl.textContent);

      if (e.target.classList.contains('js-servings-increase')) {
        current++;
      } else if (current > 1) {
        current--;
      }

      countEl.textContent = current;
      const recipeContent = servingsWrapper.closest('.foodplanner__recipe-content');
      updateIngredients(recipeContent, baseServings, current);
    }
  });
}

// Wird bei Änderung von Kategorie oder Sortierung aufgerufen.
// Aktualisiert die URL-Parameter (damit man den Link teilen kann)
// und lädt die Rezepte neu vom Server.
// pushState() ändert die URL ohne die Seite neu zu laden.
function handleChange() {
    const search = document.getElementById("search").value;
    const category = document.getElementById("categories").value;
    const sort = document.getElementById("sort").value;

    let params = new URLSearchParams();
    if(search) params.set("search", search);
    if(category) params.set("category", category);
    if(sort) params.set("sort", sort);

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', newUrl);

    fetchRecipes(search, category, null, sort).then(({ data, recipesAmount }) => {
        buildRecipesHtml(data, recipesAmount);
    });
}

// "change"-Event feuert wenn der User eine neue Option im Dropdown auswählt
document.getElementById("categories").addEventListener("change", handleChange);
document.getElementById("sort").addEventListener("change", handleChange);
