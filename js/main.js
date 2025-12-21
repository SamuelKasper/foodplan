document.addEventListener("DOMContentLoaded", (event) => {
  let params = new URLSearchParams(window.location.search);
  let search = params.get("search");
  let category = params.get("category");
  let random = params.get("random");

  if (search && search != "") {
    let searchEl = document.getElementById("search");
    searchEl.value = search;
  }

  if (category) {
    let categoryEl = document.getElementById("category_" + category);
    categoryEl.selected = true;
  }

  fetchRecipes(search, category, random).then(({ data, recipesAmount }) => {
    buildRecipesHtml(data, recipesAmount);
  });
});

// Gets the data from json file
async function fetchRecipes(search = null, filter = null, random = null) {
  let response = await fetch("./recipes.json");
  let data = await response.json();
  if (search) {
    data = data.filter((entry) =>
      entry.name.toLowerCase().includes(search.toLowerCase())
    );
  }
  if (filter && filter != "all") {
    data = data.filter((entry) => entry.tags[filter] == true);
  }

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

    const tags = Object.keys(entry.tags)
      .filter((tag) => entry.tags[tag])
      .map((tag) => {
        let tagName = "";
        switch (tag) {
          case "meat":
            tagName = "Fleisch";
            break;
          case "vegetable":
            tagName = "Gemüse";
            break;
          case "rice":
            tagName = "Reis";
            break;
          case "noodle":
            tagName = "Nudeln";
            break;
          case "other":
            tagName = "Anderes";
            break;
          case "salad":
            tagName = "Salat";
            break;
          case "lentils":
            tagName = "Linsen";
            break;
          case "sweets":
            tagName = "Süßes";
            break;
        }
        return `<div class="foodplanner__recipe-tag">${tagName}</div>`;
      })
      .join("");

    const ingredients = entry.ingredients
      ? Object.values(entry.ingredients)
          .map(
            (ingredient) =>
              `<li class="foodplanner__ingredient">${ingredient}</li>`
          )
          .join("")
      : "";

    listItem.innerHTML = `
      ${entry.img ? `<img class="foodplanner__recipe-img" src="${entry.img}" alt="${entry.name}">` : ''}
      <details class="foodplanner__details-toggle">
        <summary class="foodplanner__details-summary">
          ${entry.name}
          <div class="foodplanner__recipe-tags">${tags}</div>
          <div class="foodplanner__summary-icon">
            <svg viewBox="0 0 512 512"><path d="M505.183,123.179c-9.087-9.087-23.824-9.089-32.912,0.002l-216.266,216.27L39.729,123.179c-9.087-9.087-23.824-9.089-32.912,0.002c-9.089,9.089-9.089,23.824,0,32.912L239.55,388.82c4.364,4.364,10.283,6.816,16.455,6.816c6.172,0,12.092-2.453,16.455-6.817l232.721-232.727C514.272,147.004,514.272,132.268,505.183,123.179z"/></svg>
          </div>
        </summary>
        <div class="foodplanner__recipe-content">
          ${entry.serving && entry.serving_unit ? `<p class="foodplanner__recipe-servings">Für ${entry.serving} ${entry.serving_unit}</p>` : ''}
          ${entry.calories ? `<p class="foodplanner__recipe-calories">Pro Portion: ${entry.calories}</p>` : ''}
          ${entry.description ? `<p class="foodplanner__recipe-description-headline">Anleitung</p><p class="foodplanner__recipe-description">${entry.description}</p>` : ''}
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
