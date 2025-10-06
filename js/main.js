document.addEventListener("DOMContentLoaded", (event) => {
  let params = new URLSearchParams(window.location.search);
  let search = params.get("search");
  let category = params.get("category");
  let random = params.get("random");
  let recipesAmount = 0;

  if (search && search != "") {
    let searchEl = document.getElementById("search");
    searchEl.value = search;
  }

  if (category) {
    let categoryEl = document.getElementById("category_" + category);
    categoryEl.selected = true;
  }

  fetchRecipes(search, category, random).then((data) => {
    buildRecipesHtml(data);
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

  recipesAmount = data.length;

  if (random) {
    data = [data[random]];
  }

  return data;
}

function getRandom() {
  let random = Math.floor(Math.random() * recipesAmount);
  let base = window.location.origin + window.location.pathname;
  window.location.href = base + "?random=" + random;
}

function resetSearch() {
  window.location.href = window.location.origin + window.location.pathname;
}

// Builds the html by data
function buildRecipesHtml(data) {
  let resultList = document.getElementById("foodplanner__list");

  document.querySelector(".foodplanner__results-count").innerText =
    recipesAmount;

  // Create elements
  data.forEach((entry) => {
    let recipe = "";
    let listItem = document.createElement("li");
    listItem.classList.add("foodplanner__list-item");

    // Img - Name - Wrapper
    // let imgNameWrapper = document.createElement("div");
    // imgNameWrapper.classList.add('foodplanner__recipe-img-name-wrapper');

    // Recipe Image
    // if(entry.img != null && entry.img != ""){
    //   let img = document.createElement("img");
    //   img.classList.add("foodplanner__recipe-img");
    //   img.alt = entry.name;
    //   img.src = entry.img;

    //   // open Modal
    //   img.addEventListener('click', function(){
    //     img.classList.toggle('active');
    //   });

    //   imgNameWrapper.append(img);
    // }

    // Recipe name
    // let recipeName = document.createElement("p");
    // recipeName.classList.add("foodplanner__recipe-name");
    // recipeName.innerText = entry.name;
    // imgNameWrapper.append(recipeName);

    // listItem.append(imgNameWrapper);

    // Link
    // if (entry.url.includes("https")) {
    //   recipeLink = document.createElement("a");
    //   recipeLink.href = entry.url;
    //   // recipeLink.innerText = "Zum Rezept"
    //   recipeLink.classList.add("foodplanner__recipe--link");
    //   let linkText = document.createElement("p");
    //   linkText.innerHTML = entry.name;
    //   linkText.classList.add("visually-hidden");
    //   recipeLink.append(linkText);

    //   let linkIcon = document.createElement("div");
    //   linkIcon.classList.add("foodplanner__recipe-icon");
    //   linkIcon.innerHTML =
    //     '<svg style="height:1rem; width:1rem;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l82.7 0L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3l0 82.7c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160c0-17.7-14.3-32-32-32L320 0zM80 32C35.8 32 0 67.8 0 112L0 432c0 44.2 35.8 80 80 80l320 0c44.2 0 80-35.8 80-80l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-320c0-8.8 7.2-16 16-16l112 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 32z"/></svg>';
    //   recipeLink.append(linkIcon);
    //   listItem.append(recipeLink);
    // }

    // Tags
    let tagsContainer = document.createElement("div");
    tagsContainer.classList.add("foodplanner__recipe-tags");
    for (let tag in entry.tags) {
      if (entry.tags[tag] == true) {
        let tagElement = document.createElement("div");
        tagElement.classList.add("foodplanner__recipe-tag");
        switch (tag) {
          case "meat":
            tagElement.innerText = 'Fleisch';
            tagElement.classList.add("foodplanner__recipe-tag");
            break;
          case "vegetable":
            tagElement.innerText = 'Gemüse';
            tagElement.classList.add("foodplanner__recipe-tag");
            break;
          case "rice":
            tagElement.innerText = 'Reis';
            tagElement.classList.add("foodplanner__recipe-tag");
            break;
          case "noodle":
            tagElement.innerText = 'Nudeln';
            tagElement.classList.add("foodplanner__recipe-tag");
            break;
          case "other":
            tagElement.innerText = 'Anderes';
            tagElement.classList.add("foodplanner__recipe-tag");
            break;
          case "salad":
            tagElement.innerText = 'Salat';
            tagElement.classList.add("foodplanner__recipe-tag");
            break;
          case "lentils":
            tagElement.innerText = 'Linsen';
            tagElement.classList.add("foodplanner__recipe-tag");
            break;

          default:
            tagElement.innerText = "";
        }

        tagsContainer.append(tagElement);
      }
    }

    // Details toggle
    let detailsEl = document.createElement("details");
    detailsEl.classList.add("foodplanner__details-toggle");

    let detailsSummary = document.createElement("summary");
    detailsSummary.classList.add("foodplanner__details-summary");
    detailsSummary.innerText = entry.name;
    detailsSummary.appendChild(tagsContainer);

    let svg = document.createElement('div');
    svg.classList.add('foodplanner__summary-icon');
    svg.innerHTML = `<svg viewBox="0 0 512 512"><path d="M505.183,123.179c-9.087-9.087-23.824-9.089-32.912,0.002l-216.266,216.27L39.729,123.179c-9.087-9.087-23.824-9.089-32.912,0.002c-9.089,9.089-9.089,23.824,0,32.912L239.55,388.82c4.364,4.364,10.283,6.816,16.455,6.816c6.172,0,12.092-2.453,16.455-6.817l232.721-232.727C514.272,147.004,514.272,132.268,505.183,123.179z"/></svg>`

    detailsSummary.appendChild(svg);
    detailsEl.appendChild(detailsSummary);
    listItem.append(detailsEl);

    let content = document.createElement("div");
    content.classList.add('foodplanner__recipe-content');

    //Portionen
    let servingEl = document.createElement("p");
    servingEl.classList.add("foodplanner__recipe-servings");
    let serving = entry.serving;
    let serving_unit = entry.serving_unit;
    if (serving && serving_unit) {
      servingEl.innerText = "Für " + serving + " " + serving_unit;
      content.append(servingEl);
    }

    // Calories
    let kaloriesEl = document.createElement("p");
    kaloriesEl.classList.add("foodplanner__recipe-calories");
    let cal = entry.calories;
    if (cal) {
      kaloriesEl.innerText = "Pro Portion: " + cal;
      content.append(kaloriesEl);
    }

    // Beschreibung
    let descriptionHeadline = document.createElement("p");
    descriptionHeadline.classList.add(
      "foodplanner__recipe-description-headline"
    );
    descriptionHeadline.innerText = "Anleitung";
    content.append(descriptionHeadline);
    let descriptionEl = document.createElement("p");
    descriptionEl.classList.add("foodplanner__recipe-description");
    let description = entry.description;
    if (description) {
      descriptionEl.innerText = description;
      content.append(descriptionEl);
    }

    // Zutaten
    if (entry.ingredients && Object.keys(entry.ingredients).length > 0) {
      let ingredientsHeadline = document.createElement("p");
      ingredientsHeadline.innerText = "Zutaten";
      ingredientsHeadline.classList.add("foodplanner__ingredient-headline");
      content.append(ingredientsHeadline);

      let ingredientList = document.createElement("ul");
      ingredientList.classList.add("foodplanner__ingredient-list");
      for (let key in entry.ingredients) {
        let ingredientListItem = document.createElement("li");
        ingredientListItem.classList.add("foodplanner__ingredient");
        ingredientListItem.innerText = entry.ingredients[key];
        ingredientList.append(ingredientListItem);
      }

      content.append(ingredientList);
    }

    // Copy Button
    let copyBtn = document.createElement("button");
    copyBtn.classList.add("foodplanner__recipe-button");
    copyBtn.innerText = "Kopieren";
    content.append(copyBtn);
    copyBtn.addEventListener("click", (e) => {
      let element = e.target;
      let list = element.previousElementSibling;
      let listItems = list.querySelectorAll("li");
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
    });

    // Build html
    detailsEl.appendChild(content);
    resultList.append(listItem);
  });
}
