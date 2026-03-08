(function () {
    'use strict';

    const tagNameMap = {
        meat: 'Fleisch',
        vegetable: 'Gemüse',
        rice: 'Reis',
        noodle: 'Nudeln',
        other: 'Anderes',
        salad: 'Salat',
        lentils: 'Linsen',
        sweets: 'Süßes',
    };

    const allTags = Object.keys(tagNameMap);

    const getApiKey = () => document.getElementById('api-key').value;

    const authHeaders = () => ({
        'Content-Type': 'application/json',
        'X-API-Key': getApiKey(),
    });

    // Build tag checkboxes
    const buildTagCheckboxes = () => {
        const container = document.getElementById('tags-container');

        for (const tag of allTags) {
            const wrapper = document.createElement('div');
            wrapper.classList.add('admin__tag-checkbox');

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = 'tag-' + tag;
            checkbox.value = tag;
            checkbox.classList.add('admin__checkbox');

            const label = document.createElement('label');
            label.htmlFor = 'tag-' + tag;
            label.textContent = tagNameMap[tag];
            label.classList.add('admin__tag-label');

            wrapper.appendChild(checkbox);
            wrapper.appendChild(label);
            container.appendChild(wrapper);
        }
    };

    // Ingredient row
    const addIngredientRow = (data = {}) => {
        const container = document.getElementById('ingredients-container');
        const row = document.createElement('div');
        row.classList.add('admin__ingredient-row');

        row.innerHTML = `
            <input type="text" class="admin__input admin__input--small" placeholder="Menge" value="${data.amount || ''}">
            <input type="text" class="admin__input admin__input--small" placeholder="Einheit" value="${data.unit || ''}">
            <input type="text" class="admin__input admin__input--wide" placeholder="Zutat *" value="${data.name || ''}" required>
            <button type="button" class="button button--gray admin__remove-btn">X</button>
        `;

        row.querySelector('.admin__remove-btn').addEventListener('click', () => {
            row.remove();
        });

        container.appendChild(row);
    };

    // Collect form data
    const collectFormData = () => {
        const selectedTags = [];
        for (const tag of allTags) {
            if (document.getElementById('tag-' + tag).checked) {
                selectedTags.push(tag);
            }
        }

        const ingredientRows = [...document.querySelectorAll('.admin__ingredient-row')];
        const ingredients = ingredientRows
            .map((row) => {
                const inputs = row.querySelectorAll('input');
                return {
                    amount: inputs[0].value.trim() || null,
                    unit: inputs[1].value.trim() || null,
                    name: inputs[2].value.trim(),
                };
            })
            .filter((ing) => ing.name);

        return {
            title: document.getElementById('title').value.trim(),
            description: document.getElementById('description').value.trim() || null,
            instruction: document.getElementById('instruction').value.trim() || null,
            img: document.getElementById('img').value.trim() || null,
            calories: parseInt(document.getElementById('calories').value) || null,
            servings: document.getElementById('servings').value.trim() || null,
            duration: parseInt(document.getElementById('duration').value) || null,
            tags: selectedTags,
            ingredients: ingredients,
        };
    };

    // Reset form
    const resetForm = () => {
        document.getElementById('recipe-id').value = '';
        document.getElementById('recipe-form').reset();
        document.getElementById('ingredients-container').innerHTML = '';
        document.getElementById('form-title').textContent = 'Neues Rezept';

        for (const tag of allTags) {
            document.getElementById('tag-' + tag).checked = false;
        }
    };

    // Load recipe into form for editing
    const loadRecipeIntoForm = async (id) => {
        const response = await fetch('/api/recipes/' + id);
        const recipe = await response.json();

        document.getElementById('recipe-id').value = recipe.id;
        document.getElementById('title').value = recipe.title || '';
        document.getElementById('description').value = recipe.description || '';
        document.getElementById('instruction').value = recipe.instruction || '';
        document.getElementById('img').value = recipe.img || '';
        document.getElementById('calories').value = recipe.calories || '';
        document.getElementById('servings').value = recipe.servings || '';
        document.getElementById('duration').value = recipe.duration || '';
        document.getElementById('form-title').textContent = 'Rezept bearbeiten';

        // Tags
        for (const tag of allTags) {
            document.getElementById('tag-' + tag).checked = (recipe.tags || []).includes(tag);
        }

        // Ingredients
        document.getElementById('ingredients-container').innerHTML = '';
        for (const ing of (recipe.ingredients || [])) {
            addIngredientRow(ing);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // Delete recipe
    const deleteRecipe = async (id, title) => {
        if (!confirm('Rezept "' + title + '" wirklich loeschen?')) return;

        const response = await fetch('/api/recipes/' + id, {
            method: 'DELETE',
            headers: authHeaders(),
        });

        if (response.ok) {
            loadRecipeList();
            resetForm();
        } else {
            const data = await response.json();
            alert('Fehler: ' + data.error);
        }
    };

    // Load recipe list
    const loadRecipeList = async () => {
        const response = await fetch('/api/recipes?sort=name_asc');
        const recipes = await response.json();
        const list = document.getElementById('recipe-list');

        list.innerHTML = '';

        for (const recipe of recipes) {
            const li = document.createElement('li');
            li.classList.add('admin__recipe-item');

            const titleSpan = document.createElement('span');
            titleSpan.classList.add('admin__recipe-name');
            titleSpan.textContent = recipe.title;

            const actions = document.createElement('div');
            actions.classList.add('admin__recipe-actions');

            const editBtn = document.createElement('button');
            editBtn.type = 'button';
            editBtn.classList.add('button', 'button--gray', 'admin__action-btn');
            editBtn.textContent = 'Bearbeiten';
            editBtn.addEventListener('click', () => loadRecipeIntoForm(recipe.id));

            const deleteBtn = document.createElement('button');
            deleteBtn.type = 'button';
            deleteBtn.classList.add('button', 'button--delete', 'admin__action-btn');
            deleteBtn.textContent = 'Loeschen';
            deleteBtn.addEventListener('click', () => deleteRecipe(recipe.id, recipe.title));

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            li.appendChild(titleSpan);
            li.appendChild(actions);
            list.appendChild(li);
        }
    };

    // Submit form (create or update)
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!getApiKey()) {
            alert('Bitte API-Key eingeben');
            return;
        }

        const id = document.getElementById('recipe-id').value;
        const data = collectFormData();

        if (!data.title) {
            alert('Titel ist erforderlich');
            return;
        }

        const url = id ? '/api/recipes/' + id : '/api/recipes';
        const method = id ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: authHeaders(),
            body: JSON.stringify(data),
        });

        if (response.ok) {
            resetForm();
            loadRecipeList();
        } else {
            const result = await response.json();
            alert('Fehler: ' + result.error);
        }
    };

    // Init
    buildTagCheckboxes();
    addIngredientRow();
    loadRecipeList();

    document.getElementById('recipe-form').addEventListener('submit', handleSubmit);
    document.getElementById('add-ingredient').addEventListener('click', () => addIngredientRow());
    document.getElementById('reset-form').addEventListener('click', resetForm);
})();
