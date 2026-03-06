document.addEventListener("DOMContentLoaded", (event) => {
  let params = new URLSearchParams(window.location.search);
  let search = params.get("search");
  let category = params.get("category");
  let random = params.get("random");
  let sort = params.get("sort");

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

  fetchRecipes(search, category, random, sort).then(({ data, recipesAmount }) => {
    buildRecipesHtml(data, recipesAmount);
  });
});

// Gets the data from API
async function fetchRecipes(search = null, filter = null, random = null, sort = null) {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (filter && filter !== 'all') params.set('category', filter);
  if (sort) params.set('sort', sort);

  const response = await fetch('/api/recipes?' + params.toString());
  let data = await response.json();

  const recipesAmount = data.length;

  if (random) {
    data = [data[random]];
  }

  return { data, recipesAmount };
}

async function getRandom() {
  const { recipesAmount } = await fetchRecipes();
  let random = Math.floor(Math.random() * recipesAmount);
  let base = window.location.origin + window.location.pathname;
  window.location.href = base + "?random=" + random;
}

function resetSearch() {
  window.location.href = window.location.origin + window.location.pathname;
}

// Builds the html by data
function buildRecipesHtml(data, recipesAmount) {
  let resultList = document.getElementById("foodplanner__list");
  const fragment = document.createDocumentFragment();

  document.querySelector(".foodplanner__results-count").innerText = recipesAmount;

  // Create elements
  data.forEach((entry) => {
    const listItem = document.createElement("li");
    listItem.classList.add("foodplanner__list-item");

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
          ${entry.servings ? `<p class="foodplanner__recipe-servings">Für ${entry.servings}</p>` : ''}
          ${entry.calories ? `<p class="foodplanner__recipe-calories">Pro Portion: ${entry.calories} kcal</p>` : ''}
          ${entry.duration ? `<p class="foodplanner__recipe-duration">Dauer: ${entry.duration} min</p>` : ''}
          ${entry.instruction ? `<p class="foodplanner__recipe-description-headline">Anleitung</p><p class="foodplanner__recipe-description">${entry.instruction}</p>` : ''}
          ${ingredients ? `<p class="foodplanner__ingredient-headline">Zutaten</p><ul class="foodplanner__ingredient-list">${ingredients}</ul>` : ''}
          <button class="foodplanner__recipe-button">Kopieren</button>
        </div>
      </details>
    `;

    fragment.appendChild(listItem);
  });

  resultList.innerHTML = "";
  resultList.appendChild(fragment);

  resultList.addEventListener("click", (e) => {
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
  });
}

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

document.getElementById("categories").addEventListener("change", handleChange);
document.getElementById("sort").addEventListener("change", handleChange);
