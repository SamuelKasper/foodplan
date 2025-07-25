document.addEventListener("DOMContentLoaded", (event) => {

  let params = new URLSearchParams(window.location.search);
  let search = params.get("search");
  let category = params.get("category");
  let random = params.get("random");
  let recipesAmount = 0;

  if(search && search != ""){
    let searchEl = document.getElementById('search');
    searchEl.value = search;
  }

  if(category){
    let categoryEl = document.getElementById('category_' + category);
    categoryEl.selected = true;
  }

  fetchRecipes(search, category, random)
  .then((data) => {
    buildRecipesHtml(data);
  })

  // handlePopup();
});

// Gets the data from json file
async function fetchRecipes(search = null, filter = null, random = null) {
  let response = await fetch("./recipes.json");
  let data = await response.json();
  if (search) {
    data = data.filter((entry) => entry.name.toLowerCase().includes(search.toLowerCase()));
  }
  if (filter && filter != 'all') {
    console.log(data[0].tags);
    data = data.filter((entry) => entry.tags[filter] == true);
  }

  recipesAmount = data.length;

  if(random){
    data = [data[random]];
  }

  return data;
}

function getRandom() {
  let random = Math.floor(Math.random() * recipesAmount) + 1;
  let base = window.location.origin + window.location.pathname;
  window.location.href = base + "?random=" + random;
}

function resetSearch() {
  window.location.href = window.location.origin + window.location.pathname;
}

// Builds the html by data
function buildRecipesHtml(data){
  let resultList = document.getElementById("foodplanner__list");

  document.querySelector('.foodplanner__results-count').innerText = recipesAmount;

  // Create elements
  data.forEach((entry) => {
    let recipe = "";
    let listItem = document.createElement("li");
    listItem.classList.add("foodplanner__list-item");

    // Img - Name - Wrapper
    let imgNameWrapper = document.createElement("div");
    imgNameWrapper.classList.add('foodplanner__recipe-img-name-wrapper');

    // Recipe Image
    if(entry.img != null && entry.img != ""){
      let img = document.createElement("img");
      img.classList.add("foodplanner__recipe-img");
      img.alt = entry.name;
      img.src = entry.img;

      // open Modal
      img.addEventListener('click', function(){
        img.classList.toggle('active');
      });

      imgNameWrapper.append(img);
    }

    // Recipe name
    let recipeName = document.createElement("p");
    recipeName.classList.add("foodplanner__recipe-name");
    recipeName.innerText = entry.name;
    imgNameWrapper.append(recipeName);

    listItem.append(imgNameWrapper);

    // Link
    if (entry.url.includes("https")) {
      recipeLink = document.createElement("a");
      recipeLink.href = entry.url;
      // recipeLink.innerText = "Zum Rezept"
      recipeLink.classList.add("foodplanner__recipe--link");
      let linkText = document.createElement("p");
      linkText.innerHTML = entry.name;
      linkText.classList.add("visually-hidden");
      recipeLink.append(linkText);

      let linkIcon = document.createElement("div");
      linkIcon.classList.add("foodplanner__recipe-icon");
      linkIcon.innerHTML =
        '<svg style="height:1rem; width:1rem;" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--!Font Awesome Free 6.7.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license/free Copyright 2025 Fonticons, Inc.--><path d="M320 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l82.7 0L201.4 265.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L448 109.3l0 82.7c0 17.7 14.3 32 32 32s32-14.3 32-32l0-160c0-17.7-14.3-32-32-32L320 0zM80 32C35.8 32 0 67.8 0 112L0 432c0 44.2 35.8 80 80 80l320 0c44.2 0 80-35.8 80-80l0-112c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 112c0 8.8-7.2 16-16 16L80 448c-8.8 0-16-7.2-16-16l0-320c0-8.8 7.2-16 16-16l112 0c17.7 0 32-14.3 32-32s-14.3-32-32-32L80 32z"/></svg>';
      recipeLink.append(linkIcon);
      listItem.append(recipeLink);
    }

    // Tags
    // let tagsContainer = document.createElement("div");
    // tagsContainer.classList.add("foodplanner__recipe-tags");
    // for (let tag in entry.tags) {
    //   if (entry.tags[tag] == true) {
    //     let tagElement = document.createElement("div");
    //     tagElement.classList.add("foodplanner__recipe-tag");
    //     switch (tag) {
    //       case "meat":
    //         tagElement.innerHTML = '<svg fill="#fff" width="1rem" height="1rem" viewBox="0 0 32 32" version="1.1" xmlns="http://www.w3.org/2000/svg"><title>meat</title><path d="M20.839 13.473c-1.103-2.126-1.201-3.988-0.245-4.128 0.227-0.033 0.479 0.027 0.77 0.175-0.578-0.453-1.155-0.691-1.574-0.63l0 0c-1.081 0.159-0.933 2.248 0.315 4.652s3.152 4.217 4.233 4.058c0.374-0.055 0.578-0.356 0.665-0.805-0.104 0.136-0.241 0.219-0.42 0.245-0.956 0.14-2.64-1.443-3.743-3.568zM28.856 9.755c0.977-1.272 0.48-2.574-0.431-3.233-0.269-0.223-0.574-0.368-0.879-0.397-0.742-0.159-1.536 0.090-2.021 0.976-0.573 1.047-1.010 1.79-1.471 2.387-2.018-2.633-4.395-4.033-5.789-3.227-0.046 0.027-0.091 0.056-0.134 0.087-0.002-0.002-0.004-0.005-0.006-0.008-5.316 4.525-7.433 4.843-10.182 5.721-2.132 0.681-2.483 4.602-0.973 8.155-1.173 0.151-2.537 0.262-4.165 0.345-3.066 0.157-1.594 4.465 1.878 3.257-3.080 1.866 0.241 5.425 1.683 2.918 0.756-1.314 1.609-2.438 2.544-3.418 2.392 2.762 5.825 4.294 7.028 2.607 1.882-2.639 5.68-4.266 10.089-5.764l0-0c-0.007-0.017-0.016-0.036-0.025-0.056 0.066-0.027 0.13-0.058 0.192-0.094 1.318-0.762 1.37-3.27 0.3-6.133 0.717-0.139 1.521-0.202 2.687-0.225 3.223-0.064 2.826-4.628-0.325-3.897zM25.456 19.039c-0.025 0.020-0.051 0.040-0.078 0.058-0.005 0.003-0.009 0.007-0.014 0.010-0.027 0.019-0.055 0.037-0.084 0.054-1.436 0.83-4.102-1.103-5.956-4.317s-2.193-6.493-0.757-7.322c0.021-0.012 0.042-0.024 0.064-0.035 0.017-0.009 0.034-0.016 0.051-0.024 0.004-0.002 0.008-0.004 0.012-0.006 0.021-0.009 0.042-0.018 0.064-0.026 0 0 0-0 0-0 0.022-0.008 0.044-0.016 0.066-0.024 1.187-0.394 3.012 0.745 4.59 2.776-0.103 0.102-0.207 0.204-0.311 0.305-0.443 0.376-0.964 0.722-1.647 1.116-0.659 1.109 0.806 3.351 1.927 3.351 0.902-0.38 1.565-0.653 2.201-0.849 0.805 2.232 0.795 4.188-0.128 4.934z"></path></svg>';
    //         tagElement.classList.add("foodplanner__recipe-tag--meat");
    //         break;
    //       case "vegetable":
    //         tagElement.innerHTML = '<svg fill="#fff" width="1rem" height="1rem" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 59.017 59.017" xml:space="preserve"><g><path d="M53.501,17.594c-1.003,0.95-2.211,1.872-3.59,2.741l-0.585,0.368l-0.685,0.076c-2.132,0.234-4.308,1.038-6.085,1.868c0.841-0.143,1.743-0.237,2.676-0.237c4.087,0,7.47,1.729,10.063,5.15l0.134,0.179c0.167,0.229,0.422,0.375,0.704,0.405c0.035,0.003,0.069,0.005,0.104,0.005c0.245,0,0.483-0.09,0.668-0.256c0.347-0.312,0.618-0.597,0.853-0.897c2.034-2.607,1.153-5.051,0.458-5.904c-1.177-1.771-2.692-3.002-4.518-3.701C53.63,17.458,53.571,17.527,53.501,17.594z"/><path d="M30.581,3.871c1.401,0.517,2.501,1.487,2.583,1.555c3.519,2.607,4.578,5.918,4.532,9.054c0.56-1.426,1.011-2.967,1.131-4.426l0.057-0.694l0.356-0.598c0.686-1.147,1.371-2.135,2.097-3.022l0.528-0.506c0.021-0.015,0.055-0.04,0.098-0.071c-0.656-1.344-1.66-2.471-3.021-3.356c-0.339-0.271-2.008-1.505-4.241-1.505c-0.966,0-1.908,0.23-2.801,0.684c-0.63,0.32-1.2,0.742-1.693,1.252c-0.235,0.243-0.332,0.588-0.256,0.917C30.028,3.484,30.264,3.753,30.581,3.871z"/><path d="M55.937,30.134c-0.853-0.089-1.623-0.531-2.122-1.215l-0.119-0.157c-2.692-3.552-6.202-4.927-10.804-4.144l-0.882,0.151c-1.189-0.447-2.479-0.871-3.859-1.269c0.022-0.097,0.03-0.198,0.022-0.301c-0.011-0.135-0.057-0.259-0.117-0.375c0.69-0.435,2.045-1.243,3.754-2.032c0.058-0.024,0.117-0.048,0.176-0.075c-0.009,0.002-0.018,0.004-0.027,0.005c1.891-0.862,4.187-1.681,6.461-1.931l0.229-0.025l0.195-0.123c1.269-0.799,2.373-1.641,3.282-2.502c1.757-1.663,2.6-3.44,2.505-5.282C54.486,8.04,52.147,6.213,52,6.103c-1.071-0.727-2.282-1.096-3.599-1.096c-2.859,0-5.239,1.755-5.339,1.83l-0.176,0.168c-0.664,0.813-1.294,1.723-1.927,2.781l-0.119,0.2l-0.019,0.231c-0.131,1.595-0.59,3.239-1.171,4.764c0.001-0.011,0.002-0.022,0.003-0.034c-0.034,0.088-0.059,0.173-0.094,0.262l-0.087,0.222c-0.936,2.328-2.115,4.33-2.773,5.367l-0.091,0.144l-0.039,0.166c-0.064,0.277-0.117,0.516-0.157,0.702c-0.24-0.926-0.503-1.815-0.784-2.669l0.068-4.691c0.045-3.103-1.172-5.529-3.723-7.417l-0.084-0.066c-0.266-0.226-1.074-0.877-2-1.219c-0.954-0.353-1.659-1.154-1.887-2.145c-0.156-0.683-0.053-1.374,0.244-1.982c-0.303,0.046-0.599,0.113-0.884,0.214c-1.552,0.55-2.568,1.871-2.718,3.535c-0.16,1.769,0.732,3.482,2.271,4.365c1.409,0.808,3.097,2.304,4.666,5.048c-0.935-0.064-1.837,0.035-2.688,0.341c-1.066,0.383-2.798,1.992-4.895,4.367l0.655,2.255c0.016,0.056,0.027,0.112,0.034,0.17c0.179,1.632,1.022,3.747,2.505,4.792c0.451,0.318,0.559,0.942,0.24,1.394c-0.194,0.276-0.504,0.423-0.818,0.423c-0.199,0-0.4-0.059-0.576-0.183c-2.095-1.478-3.098-4.197-3.33-6.119l-0.265-0.912c-1.872,2.258-3.948,4.971-6.067,7.905l0.364,3.16c0.113,1.031,0.635,2.354,1.55,3c0.451,0.318,0.559,0.942,0.24,1.394c-0.195,0.276-0.504,0.423-0.818,0.423c-0.199,0-0.4-0.059-0.576-0.183c-1.521-1.073-2.235-3.047-2.384-4.411l-0.109-0.948c-6.344,9.03-12.644,19.34-14.493,24.301c-0.257,0.688-0.186,1.397,0.194,1.945c0.361,0.52,0.945,0.818,1.603,0.818h0c0.271,0,0.544-0.051,0.814-0.152c3.815-1.422,10.759-5.422,17.865-10.042l-1.336-0.35c-1.36-0.167-3.281-0.883-4.333-2.375c-0.318-0.452-0.211-1.075,0.24-1.394c0.452-0.32,1.076-0.21,1.394,0.24c0.646,0.915,1.969,1.437,2.994,1.549c0.049,0.005,0.097,0.014,0.145,0.027l3.147,0.825c3.613-2.404,7.18-4.914,10.326-7.277h-1.077c-0.037,0-0.073-0.002-0.109-0.006c-1.926-0.211-4.708-1.213-6.208-3.341c-0.318-0.451-0.21-1.075,0.241-1.394c0.45-0.318,1.075-0.211,1.394,0.241c1.034,1.466,3.115,2.308,4.74,2.499h3.625c4.305-3.388,7.398-6.276,7.941-7.789c0.245-0.682,0.361-1.396,0.37-2.133c2.742,1.342,4.192,2.647,4.948,3.684c1.099,1.508,2.881,2.446,4.651,2.446c1.501,0,2.833-0.678,3.654-1.861c0.613-0.882,0.801-1.799,0.756-2.649c-0.536,0.437-1.199,0.684-1.892,0.684C56.137,30.149,56.037,30.144,55.937,30.134zM9.926,49.304c-0.171,0.359-0.53,0.569-0.903,0.569c-0.145,0-0.292-0.031-0.431-0.098c-0.786-0.375-1.549-0.833-2.267-1.36c-0.445-0.327-0.542-0.953-0.215-1.397c0.327-0.445,0.952-0.542,1.397-0.215c0.618,0.453,1.273,0.846,1.947,1.168C9.953,48.209,10.164,48.806,9.926,49.304z M40.958,30.229c-0.152,0.399-0.532,0.645-0.935,0.645c-0.119,0-0.239-0.021-0.356-0.066c-2.363-0.901-4.533-2.495-6.45-4.737c-0.359-0.42-0.31-1.051,0.11-1.41c0.42-0.358,1.051-0.31,1.41,0.11c1.697,1.985,3.595,3.388,5.642,4.167C40.896,29.135,41.155,29.713,40.958,30.229z"/></g></svg>';
    //         tagElement.classList.add("foodplanner__recipe-tag--vegetable");
    //         break;
    //       case "rice":
    //         tagElement.innerHTML = '<svg width="1rem" height="1rem" version="1.1" id="_x32_" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512"  xml:space="preserve"><style type="text/css">.st0{fill:#000000;}</style><g><path class="st0" d="M496.584,320.545L355.625,76.401c-20.552-35.594-58.529-57.515-99.629-57.515c-41.1,0-79.077,21.921-99.621,57.515L15.409,320.545c-10.27,17.8-15.413,37.67-15.409,57.53c-0.004,19.854,5.139,39.722,15.404,57.524c20.556,35.586,58.534,57.515,99.638,57.515h281.916c41.103,0,79.078-21.93,99.626-57.515C506.858,417.814,512,397.937,512,378.075C512,358.214,506.858,338.345,496.584,320.545zM465.655,417.743c-14.169,24.534-40.361,39.65-68.697,39.65h-48.102V244.305H163.144v213.088h-48.102c-28.336,0-54.535-15.117-68.705-39.65c-7.085-12.284-10.626-25.963-10.626-39.668c0-13.704,3.54-27.392,10.626-39.667L187.303,94.257c14.162-24.542,40.35-39.651,68.693-39.651c28.339,0,54.535,15.109,68.701,39.651l140.958,244.152c7.093,12.291,10.63,25.971,10.63,39.667C476.284,391.78,472.748,405.452,465.655,417.743z"/></g></svg>';
    //         tagElement.classList.add("foodplanner__recipe-tag--rice");
    //         break;
    //       case "noodle":
    //         tagElement.innerHTML = '<svg fill="#fff" width="1rem" height="1rem" version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" xml:space="preserve"><g><g><path d="M495.304,211.479h-244.87V100.174h233.303c8.572,0,16.091-6.282,17.028-14.802c1.106-10.072-6.746-18.589-16.592-18.589H250.435V33.391h233.303c8.572,0,16.091-6.282,17.028-14.802C501.872,8.517,494.02,0,484.174,0H67.219C58.647,0,51.128,6.282,50.19,14.802c-1.106,10.072,6.746,18.589,16.592,18.589h16.696v33.391H67.219c-8.572,0-16.091,6.282-17.028,14.802c-1.106,10.072,6.746,18.589,16.592,18.589h16.696v111.304H16.696c-9.246,0-16.7,7.565-16.696,16.81c0.043,92.348,52.115,177.985,133.565,221.125v12.499c0,27.662,22.424,50.087,50.087,50.087h144.696c27.662,0,50.087-22.424,50.087-50.087v-12.499C459.885,406.274,511.957,320.637,512,228.29C512.004,219.044,504.55,211.479,495.304,211.479z M150.261,211.478H116.87V33.391h33.391V211.478z M217.043,211.478h-33.391V33.391h33.391V211.478z"/></g></g></svg>';
    //         tagElement.classList.add("foodplanner__recipe-tag--noodle");
    //         break;
    //       case "other":
    //         tagElement.innerHTML = '<svg width="1rem" height="1rem" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg"><path fill="#fff" d="M512 64a448 448 0 1 1 0 896 448 448 0 0 1 0-896zm23.744 191.488c-52.096 0-92.928 14.784-123.2 44.352-30.976 29.568-45.76 70.4-45.76 122.496h80.256c0-29.568 5.632-52.8 17.6-68.992 13.376-19.712 35.2-28.864 66.176-28.864 23.936 0 42.944 6.336 56.32 19.712 12.672 13.376 19.712 31.68 19.712 54.912 0 17.6-6.336 34.496-19.008 49.984l-8.448 9.856c-45.76 40.832-73.216 70.4-82.368 89.408-9.856 19.008-14.08 42.24-14.08 68.992v9.856h80.96v-9.856c0-16.896 3.52-31.68 10.56-45.76 6.336-12.672 15.488-24.64 28.16-35.2 33.792-29.568 54.208-48.576 60.544-55.616 16.896-22.528 26.048-51.392 26.048-86.592 0-42.944-14.08-76.736-42.24-101.376-28.16-25.344-65.472-37.312-111.232-37.312zm-12.672 406.208a54.272 54.272 0 0 0-38.72 14.784 49.408 49.408 0 0 0-15.488 38.016c0 15.488 4.928 28.16 15.488 38.016A54.848 54.848 0 0 0 523.072 768c15.488 0 28.16-4.928 38.72-14.784a51.52 51.52 0 0 0 16.192-38.72 51.968 51.968 0 0 0-15.488-38.016 55.936 55.936 0 0 0-39.424-14.784z"/></svg>';
    //         tagElement.classList.add("foodplanner__recipe-tag--other");
    //         break;
    //       case "salad":
    //         tagElement.innerHTML = '<svg fill="#fff" width="1rem" height="1rem" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 57.569 57.569" xml:space="preserve"><g><path d="M10.553,27.865c0-1.647,0.488-3.231,1.395-4.572c-0.298-0.962-0.452-1.97-0.452-2.969c0-4.308,2.715-8.061,6.651-9.47c0.351-3.212,2.411-5.976,5.314-7.299c-1.492-2.415-3.847-3.831-6.018-3.479c-1.569,0.255-2.869,1.321-3.633,2.93c-1.375-0.632-2.805-0.737-4.059-0.296C8.394,3.188,7.34,4.21,6.703,5.665c-0.845,1.927-0.846,4.407-0.029,6.765c-1.101,0.756-1.924,1.867-2.405,3.26c-0.809,2.339-0.539,5.161,0.74,7.746c0.14,0.282,0.293,0.562,0.46,0.837c-1.201,0.781-2.1,1.939-2.582,3.352c-0.766,2.242-0.427,4.884,0.93,7.246c0.623,1.085,1.448,2.068,2.409,2.876c-0.321,1.344-0.078,2.821,0.704,4.158c1.093,1.865,3.062,3.13,5.166,3.343c2.818,5.296,6.224,7.998,11.095,10.339c-5.787-6.841-9.005-12.507-9.186-21.051C11.875,33.015,10.553,30.516,10.553,27.865z"/><path d="M55.083,20.053c0.08-3.894-2.207-7.397-5.751-8.911c-0.517-3.323-3.195-5.92-6.523-6.36c-0.03-0.331-0.093-0.661-0.188-0.987c-0.587-2.004-2.354-3.513-4.395-3.755c-1.335-0.159-2.597,0.176-3.64,0.909c-0.93-0.615-2.013-0.947-3.123-0.947c-2.859,0-5.235,2.112-5.649,4.858c-3.269,0.66-5.72,3.573-5.72,6.981c0,0.183,0.008,0.366,0.022,0.552c-3.79,0.682-6.62,3.975-6.62,7.932c0,1.144,0.247,2.278,0.721,3.321c-1.065,1.139-1.663,2.638-1.663,4.22c0,2.364,1.358,4.508,3.445,5.54c-0.092,9.063,3.209,14.565,9.649,21.979l0.363,0.413l0.066,0.075c0.976,1.095,2.381,1.697,3.958,1.697c0.273,0,0.542-0.023,0.807-0.057L30.5,56.849c-2.149-5.111-3.468-9.649-4.204-13.683c-2.773-0.854-3.972-3.07-4.025-3.172c-0.258-0.488-0.069-1.094,0.419-1.351c0.485-0.257,1.088-0.071,1.349,0.414c0.037,0.069,0.619,1.093,1.892,1.791c-0.348-2.617-0.449-5.007-0.348-7.161c-0.012-0.109-0.007-0.216,0.018-0.326c0.174-3.079,0.736-5.685,1.478-7.869c-3.369-2.009-3.785-5.749-3.495-7.564c0.087-0.545,0.601-0.922,1.145-0.83c0.545,0.087,0.916,0.598,0.831,1.142c-0.025,0.161-0.474,3.478,2.254,5.344c0.136-0.315,0.273-0.628,0.415-0.921c2.63-5.428,6.389-8.129,7.844-9.02c-0.003-2.003,1.31-3.743,1.372-3.824c0.335-0.439,0.965-0.521,1.401-0.187c0.438,0.335,0.522,0.962,0.188,1.4c-0.223,0.296-0.661,1.033-0.857,1.844c2.303-0.261,4.551,1.039,4.665,1.107c0.477,0.281,0.634,0.894,0.354,1.369c-0.187,0.316-0.521,0.492-0.862,0.492c-0.173,0-0.347-0.044-0.506-0.138c-0.697-0.407-2.819-1.306-4.273-0.61c-0.253,0.129-1.955,1.045-3.892,3.066c3.967-0.289,6.726,0.889,6.865,0.949c0.505,0.223,0.735,0.813,0.514,1.318c-0.165,0.374-0.532,0.598-0.917,0.598c-0.133,0-0.269-0.026-0.399-0.084c-0.075-0.032-3.458-1.434-7.942-0.501c-0.898,1.263-1.762,2.777-2.478,4.581c-0.002,0.132-0.029,0.266-0.087,0.394c-0.038,0.085-0.089,0.159-0.145,0.227c-0.569,1.559-1.028,3.312-1.304,5.292c2.261-1.418,5.113-1.48,5.276-1.482c0.004,0,0.008,0,0.012,0c0.546,0,0.991,0.438,0.999,0.986c0.008,0.552-0.434,1.005-0.985,1.014c-0.042,0.001-4.157,0.097-5.557,2.484c-0.098,2.439,0.071,5.162,0.591,8.192c0.005,0.023,0.008,0.046,0.011,0.07c0.7,4.039,2.016,8.61,4.197,13.799l0.476,0.918c0.734-0.37,1.366-0.882,1.817-1.512c0.753-1.052,0.931-2.328,0.499-3.593c-1.808-5.305-1.752-9.353,0.166-12.033c2.486-3.475,7.664-3.994,10.528-3.994c1.475,0,2.488,0.136,2.498,0.138l1.028,0.14l0.103-1.032c0.014-0.136,0.309-3.358-1.571-5.547c-0.109-0.127-0.224-0.247-0.342-0.362c0.531-0.119,1.056-0.288,1.572-0.506C52.652,27.113,55.006,23.751,55.083,20.053z"/></g></svg>';
    //         tagElement.classList.add("foodplanner__recipe-tag--salad");
    //         break;
    //       case "lentils":
    //         tagElement.innerHTML = '<svg fill="#fff" width="1rem" height="1rem" version="1.1" id="Capa_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 490 490" xml:space="preserve"><g><circle cx="245" cy="122.5" r="102.187"/><circle cx="387.814" cy="367.5" r="102.187"/><circle cx="102.187" cy="367.5" r="102.187"/></g></svg>';
    //         tagElement.classList.add("foodplanner__recipe-tag--lentils");
    //         break;

    //       default:
    //         tagElement.innerText = "";
    //     }

    //     tagsContainer.append(tagElement);
    //   }
    // }
    // listItem.append(tagsContainer);

    // Details toggle
    let detailsEl = document.createElement("details");
    detailsEl.classList.add("foodplanner__details-toggle");
    let detailsSummary = document.createElement("summary");
    detailsSummary.innerText = "Details";
    detailsEl.appendChild(detailsSummary);
    listItem.append(detailsEl);

    // Calories
    let kaloriesEl = document.createElement("p");
    kaloriesEl.classList.add("foodplanner__recipe-calories");
    let cal = entry.calories;
    if(cal){
      kaloriesEl.innerText = 'Portion: ' + cal;
      detailsEl.append(kaloriesEl);
    }
    
    // Beschreibung
    let descriptionEl = document.createElement("p");
    descriptionEl.classList.add("foodplanner__recipe-description");
    let description = entry.description;
    if(description){
      descriptionEl.innerText = description;
      detailsEl.append(descriptionEl);
    }

    // Zutaten
    if(entry.ingredients && Object.keys(entry.ingredients).length > 0){
      let ingredientsHeadline = document.createElement("p");
      ingredientsHeadline.innerText = "Zutaten";
      ingredientsHeadline.classList.add("foodplanner__ingredient-headline");
      detailsEl.append(ingredientsHeadline);

      let ingredientList = document.createElement("ul");
      ingredientList.classList.add("foodplanner__ingredient-list");
      for (let key in entry.ingredients) {
        let ingredientListItem = document.createElement("li");
        ingredientListItem.classList.add("foodplanner__ingredient");
        ingredientListItem.innerText = entry.ingredients[key];
        ingredientList.append(ingredientListItem);
      }

      detailsEl.append(ingredientList);
    }

    // Copy Button
    let copyBtn = document.createElement("button");
    copyBtn.classList.add("foodplanner__recipe-button");
    copyBtn.innerText = "Kopieren";
    detailsEl.append(copyBtn);
    copyBtn.addEventListener("click", (e) => {
      let element = e.target;
      let list = element.previousElementSibling;
      let listItems = list.querySelectorAll('li');
      let content = "";
      listItems.forEach(function(item) {
        content += item.textContent + "\n";
      });

      navigator.clipboard.writeText(content).then(function() {
      }).catch(function(error) {
        console.error('Fehler beim Kopieren:', error);
      });
    });

    // Rezept bearbeiten Button
    // let editBtn = document.createElement("button");
    // editBtn.classList.add("foodplanner__recipe-button");
    // editBtn.innerText = "Bearbeiten";
    // buttonWrapperEl.append(editBtn);

    // Build html
    resultList.append(listItem);
  });
}

// function handlePopup(){
//   const dialog = document.querySelector("dialog");
//   const openButton = document.getElementById("popup__open");
//   const closeButton = document.getElementById("popup__close");

//   openButton.addEventListener("click", () => {
//     dialog.showModal();
//   });

//   closeButton.addEventListener("click", () => {
//     dialog.close();
//   });
// }