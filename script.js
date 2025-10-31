// Global variables for scaling and editing
let currentRecipe = null;
let originalIngredients = [];
let editingRecipeId = null;
let recipeToDelete = null;

// Track deleted recipes to prevent them from being reloaded
let deletedRecipes = JSON.parse(localStorage.getItem('recipro_deleted_recipes')) || [];

// Admin users list - you can modify this list to add/remove admin users
const adminUsers = ['admin', 'administrator', 'chef', 'instructor', 'teacher'];

// Check if current user is admin
function isCurrentUserAdmin() {
    const currentUser = localStorage.getItem('recipro_current_user');
    if (!currentUser) return false;
    
    // Check if user is in admin list (case insensitive)
    return adminUsers.some(admin => admin.toLowerCase() === currentUser.toLowerCase());
}

// Check if user name is admin (for display name check)
function isUserNameAdmin() {
    const userName = localStorage.getItem('recipro_user_name');
    if (!userName) return false;
    
    // Check if display name contains admin keywords (case insensitive)
    const lowerUserName = userName.toLowerCase();
    return adminUsers.some(admin => lowerUserName.includes(admin.toLowerCase()));
}

// Update welcome message with logged-in user name
function updateWelcomeMessage() {
    const userName = localStorage.getItem('recipro_user_name') || 'User';
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = `Welcome, ${userName}`;
    }
}

// Hide/show admin-only elements based on user permissions
function updateAdminElements() {
    const isAdmin = isCurrentUserAdmin() || isUserNameAdmin();
    
    // Hide/show database management button
    const dbManageBtn = document.querySelector('.db-manage-btn');
    if (dbManageBtn) {
        if (isAdmin) {
            dbManageBtn.style.display = 'block';
            dbManageBtn.classList.add('admin-only');
            dbManageBtn.classList.remove('admin-hidden');
            dbManageBtn.title = '🗄️ Database Management (Admin Only)';
        } else {
            dbManageBtn.style.display = 'none';
            dbManageBtn.classList.add('admin-hidden');
            dbManageBtn.classList.remove('admin-only');
        }
    }
    
    // Style user name element for admin
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        if (isAdmin) {
            const currentText = userNameElement.textContent;
            if (!currentText.includes('👑')) {
                userNameElement.textContent = currentText + ' 👑';
            }
            userNameElement.classList.add('admin-user');
            userNameElement.title = 'Click to change name (Admin User)';
        } else {
            // Remove admin styling for regular users
            userNameElement.classList.remove('admin-user');
            const currentText = userNameElement.textContent;
            if (currentText.includes('👑')) {
                userNameElement.textContent = currentText.replace(' 👑', '');
            }
            userNameElement.title = 'Click to change name';
        }
    }
    
    // Log admin status for debugging
    console.log(`User admin status: ${isAdmin ? '👑 Admin User' : '👤 Regular User'}`);
    if (isAdmin) {
        console.log('🔓 Database management access: GRANTED');
    } else {
        console.log('🔒 Database management access: DENIED');
    }
}

// Admin-protected database panel function
function openDatabasePanel() {
    const isAdmin = isCurrentUserAdmin() || isUserNameAdmin();
    
    if (!isAdmin) {
        alert('🚫 Access Denied\n\nDatabase management is restricted to administrators only.\n\nTo access this feature, please:\n1. Login with an admin account, or\n2. Change your display name to include: admin, administrator, chef, instructor, or teacher');
        return;
    }
    
    // If admin, call internal function
    openDatabasePanelInternal();
}

// Recipe data with detailed information
// Debug helper - accessible from browser console
window.debugRecipeApp = function() {
    console.log('Recipe Data:', Object.keys(recipeData));
    Object.keys(recipeData).forEach(key => {
        console.log(`  ${key}:`, recipeData[key].title);
    });
};

const recipeData = {};

// Dynamically generate image path based on recipe ID
// When you replace an image file, the app automatically uses it!
function getImagePath(recipeId) {
    return `assets/img/${recipeId}.svg`;
}

// Get category background color for badges
function getCategoryColor(category) {
    const colors = {
        'appetizer': 'rgba(52, 152, 219, 0.9)',
        'main-course': 'rgba(46, 204, 113, 0.9)',
        'dessert': 'rgba(155, 89, 182, 0.9)'
    };
    return colors[category] || 'rgba(108, 117, 125, 0.9)';
}

// Parse ingredient quantities and units
function parseIngredient(ingredient) {
    // Regex to match various quantity formats
    const patterns = [
        /^(\d+(?:\.\d+)?(?:\/\d+)?)\s*(\w+)?\s+(.+)/, // "2 cups flour" or "1.5 tbsp oil"
        /^(\d+(?:\.\d+)?(?:\/\d+)?)\s+(.+)/, // "2 eggs" (no unit)
        /^(.+)/ // Fallback for ingredients without quantities
    ];
    
    for (let pattern of patterns) {
        const match = ingredient.match(pattern);
        if (match) {
            if (match.length >= 4) {
                // Has quantity, unit, and ingredient
                return {
                    quantity: parseFloat(match[1].includes('/') ? eval(match[1]) : match[1]),
                    unit: match[2] || '',
                    ingredient: match[3],
                    original: ingredient,
                    hasQuantity: true
                };
            } else if (match.length === 3 && !isNaN(parseFloat(match[1]))) {
                // Has quantity and ingredient, no unit
                return {
                    quantity: parseFloat(match[1]),
                    unit: '',
                    ingredient: match[2],
                    original: ingredient,
                    hasQuantity: true
                };
            }
        }
    }
    
    // No quantity found
    return {
        quantity: 0,
        unit: '',
        ingredient: ingredient,
        original: ingredient,
        hasQuantity: false
    };
}

// Scale ingredient quantities
function scaleIngredient(parsedIngredient, scaleFactor) {
    if (!parsedIngredient.hasQuantity) {
        return parsedIngredient.original;
    }
    
    const scaledQuantity = parsedIngredient.quantity * scaleFactor;
    
    // Format the scaled quantity nicely
    let formattedQuantity;
    if (scaledQuantity < 1 && scaledQuantity > 0) {
        // Convert to fraction for small amounts
        const fraction = convertToFraction(scaledQuantity);
        formattedQuantity = fraction;
    } else if (scaledQuantity % 1 === 0) {
        // Whole number
        formattedQuantity = scaledQuantity.toString();
    } else {
        // Decimal, round to 2 places
        formattedQuantity = scaledQuantity.toFixed(2).replace(/\.?0+$/, '');
    }
    
    return `${formattedQuantity}${parsedIngredient.unit ? ' ' + parsedIngredient.unit : ''} ${parsedIngredient.ingredient}`;
}

// Convert decimal to fraction for better readability
function convertToFraction(decimal) {
    const tolerance = 1.0E-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = decimal;
    
    do {
        const a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);
    
    if (k1 === 1) return h1.toString();
    if (h1 > k1) {
        const whole = Math.floor(h1 / k1);
        const remainder = h1 % k1;
        return remainder === 0 ? whole.toString() : `${whole} ${remainder}/${k1}`;
    }
    return `${h1}/${k1}`;
}

// Scale recipe based on student count
function scaleRecipe() {
    if (!currentRecipe) return;
    
    const studentCount = parseInt(document.getElementById('studentCount').value) || 1;
    const originalServings = parseInt(currentRecipe.servings);
    
    // Scale factor is based on student count
    const scaleFactor = studentCount;
    
    // Calculate total servings: original servings × scale factor
    const totalServings = originalServings * scaleFactor;
    
    // Update scaling info
    document.getElementById('scaleFactor').textContent = studentCount.toString() + 'x';
    document.getElementById('totalServings').textContent = totalServings.toString();
    
    // Update ingredients display with scaled quantities
    const ingredientsList = document.getElementById('modalIngredients');
    ingredientsList.innerHTML = '';
    
    originalIngredients.forEach((ingredient) => {
        const li = document.createElement('li');
        // Parse and scale the ingredient
        const parsedIngredient = parseIngredient(ingredient);
        const scaledIngredient = scaleIngredient(parsedIngredient, scaleFactor);
        li.textContent = scaledIngredient;
        ingredientsList.appendChild(li);
    });
}

// Adjust student count with buttons
function adjustStudentCount(change) {
    const input = document.getElementById('studentCount');
    const currentValue = parseInt(input.value) || 1;
    const newValue = Math.max(1, Math.min(100, currentValue + change));
    input.value = newValue;
    scaleRecipe();
}

// Set specific student count
function setStudentCount(count) {
    document.getElementById('studentCount').value = count;
    scaleRecipe();
}

// Reset to base serving (1 student)
function resetToOriginal() {
    if (!currentRecipe) return;
    // Reset to 1 student as the base serving size
    document.getElementById('studentCount').value = 1;
    scaleRecipe();
}

// Update preset button active states
function updatePresetButtons() {
    const currentCount = parseInt(document.getElementById('studentCount').value);
    
    // Remove active class from all preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to matching preset
    const presetButtons = document.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
        const btnText = btn.textContent;
        if (btnText.includes('10') && currentCount === 10) {
            btn.classList.add('active');
        } else if (btnText.includes('20') && currentCount === 20) {
            btn.classList.add('active');
        } else if (btnText.includes('30') && currentCount === 30) {
            btn.classList.add('active');
        } else if ((btnText.includes('Reset') || btnText.includes('Reset to 1')) && currentCount === 1) {
            btn.classList.add('active');
        }
    });
}

// Open modal and populate with recipe data
function openRecipeModal(recipeId) {
    const recipe = recipeData[recipeId];
    if (!recipe) {
        console.error('Recipe not found:', recipeId, 'Available recipes:', Object.keys(recipeData));
        return;
    }

    // Ensure recipe has required fields
    if (!recipe.ingredients || !Array.isArray(recipe.ingredients)) {
        console.error('Recipe missing ingredients:', recipe);
        return;
    }

    // Store current recipe and original ingredients for scaling
    currentRecipe = recipe;
    originalIngredients = [...recipe.ingredients];

    const modal = document.getElementById('recipeModal');
    
    // Populate modal content
    document.getElementById('modalTitle').textContent = recipe.title;
    document.getElementById('modalImage').src = getImagePath(recipeId);
    document.getElementById('modalImage').alt = recipe.title;
    
    // Set badge
    const badge = document.getElementById('modalBadge');
    badge.textContent = recipe.category.replace('-', ' ').toUpperCase();
    badge.style.background = getCategoryColor(recipe.category);
    
    // Reset scaling to default (1 student as base)
    document.getElementById('studentCount').value = 1;
    scaleRecipe();
    updatePresetButtons();
    
    // Populate instructions
    const instructionsList = document.getElementById('modalInstructions');
    instructionsList.innerHTML = '';
    recipe.instructions.forEach(instruction => {
        const li = document.createElement('li');
        li.textContent = instruction;
        instructionsList.appendChild(li);
    });
    
    // Set tips
    document.getElementById('modalTips').textContent = recipe.tips;
    
    // Show modal
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Close modal
function closeModal() {
    const modal = document.getElementById('recipeModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restore scrolling
}

// Print recipe
function printRecipe() {
    if (!currentRecipe) return;
    window.print();
}

// Setup modal event listeners and initialize user display
document.addEventListener('DOMContentLoaded', function() {
    // Update welcome message with logged-in user's name
    updateWelcomeMessage();
    updateAdminElements();
    
    const modal = document.getElementById('recipeModal');
    if (!modal) return;
    
    const closeButton = modal.querySelector('.close');
    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }
    
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            closeModal();
        }
    });
});

// Add Recipe Form Functions
function openAddRecipeModal() {
    const modal = document.getElementById('addRecipeModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
    // Reset form
    document.getElementById('addRecipeForm').reset();
    
    // Reset dynamic fields to initial state
    resetIngredientFields();
    resetInstructionFields();
}

function closeAddRecipeModal() {
    const modal = document.getElementById('addRecipeModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    
    // Reset form state
    const modalHeader = modal.querySelector('.modal-header h2');
    modalHeader.textContent = 'Add New Recipe';
    
    const saveBtn = modal.querySelector('.btn-primary');
    saveBtn.textContent = 'Save Recipe';
    saveBtn.onclick = saveNewRecipe;
    
    editingRecipeId = null;
}

// Dynamic ingredient field management
function addIngredientField() {
    const container = document.getElementById('ingredientsContainer');
    const newGroup = document.createElement('div');
    newGroup.className = 'ingredient-input-group';
    newGroup.innerHTML = `
        <input type="text" name="ingredients[]" placeholder="e.g., 1 cup sugar" required>
        <button type="button" class="remove-ingredient-btn" onclick="removeIngredientField(this)">×</button>
    `;
    container.appendChild(newGroup);
}

function removeIngredientField(button) {
    const container = document.getElementById('ingredientsContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
    }
}

function resetIngredientFields() {
    const container = document.getElementById('ingredientsContainer');
    container.innerHTML = `
        <div class="ingredient-input-group">
            <input type="text" name="ingredients[]" placeholder="e.g., 2 cups all-purpose flour" required>
            <button type="button" class="remove-ingredient-btn" onclick="removeIngredientField(this)">×</button>
        </div>
    `;
}

// Dynamic instruction field management
function addInstructionField() {
    const container = document.getElementById('instructionsContainer');
    const stepNumber = container.children.length + 1;
    const newGroup = document.createElement('div');
    newGroup.className = 'instruction-input-group';
    newGroup.innerHTML = `
        <span class="step-number">${stepNumber}</span>
        <textarea name="instructions[]" placeholder="Describe step ${stepNumber}..." required rows="2"></textarea>
        <button type="button" class="remove-instruction-btn" onclick="removeInstructionField(this)">×</button>
    `;
    container.appendChild(newGroup);
}

function removeInstructionField(button) {
    const container = document.getElementById('instructionsContainer');
    if (container.children.length > 1) {
        button.parentElement.remove();
        updateStepNumbers();
    }
}

function updateStepNumbers() {
    const container = document.getElementById('instructionsContainer');
    const stepNumbers = container.querySelectorAll('.step-number');
    stepNumbers.forEach((stepNumber, index) => {
        stepNumber.textContent = index + 1;
    });
    
    // Update placeholders
    const textareas = container.querySelectorAll('textarea');
    textareas.forEach((textarea, index) => {
        textarea.placeholder = `Describe step ${index + 1}...`;
    });
}

function resetInstructionFields() {
    const container = document.getElementById('instructionsContainer');
    container.innerHTML = `
        <div class="instruction-input-group">
            <span class="step-number">1</span>
            <textarea name="instructions[]" placeholder="Describe the first step..." required rows="2"></textarea>
            <button type="button" class="remove-instruction-btn" onclick="removeInstructionField(this)">×</button>
        </div>
    `;
}

// Save new recipe
async function saveNewRecipe() {
    const form = document.getElementById('addRecipeForm');
    const formData = new FormData(form);
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collect ingredients
    const ingredientInputs = document.querySelectorAll('input[name="ingredients[]"]');
    const ingredients = Array.from(ingredientInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    if (ingredients.length === 0) {
        alert('Please add at least one ingredient.');
        return;
    }
    
    // Collect instructions
    const instructionInputs = document.querySelectorAll('textarea[name="instructions[]"]');
    const instructions = Array.from(instructionInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    if (instructions.length === 0) {
        alert('Please add at least one instruction step.');
        return;
    }
    
    // Create recipe object
    const newRecipe = {
        title: formData.get('title'),
        image: formData.get('image') || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        category: formData.get('category'),
        servings: formData.get('servings'),
        ingredients: ingredients,
        instructions: instructions,
        tips: formData.get('tips') || 'No special tips provided.'
    };
    
    // Generate unique ID
    const recipeId = generateRecipeId(newRecipe.title);
    newRecipe.id = recipeId;
    
    try {
        // Save to database
        await recipeDB.addRecipe(newRecipe);
        
        // Add to in-memory data for immediate use
        recipeData[recipeId] = newRecipe;
        
        // Add recipe card to the page
        addRecipeCardToPage(recipeId, newRecipe);
        
        // Close modal and show success message
        closeAddRecipeModal();
        showSuccessMessage('Recipe added successfully!');
        
    } catch (error) {
        console.error('Failed to save recipe:', error);
        alert('Failed to save recipe. Please try again.');
    }
}

// Generate unique recipe ID
function generateRecipeId(title) {
    return title.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 50);
}

// Add recipe card to the page
function addRecipeCardToPage(recipeId, recipe) {
    const recipeList = document.querySelector('.recipe-list');
    const newCard = document.createElement('div');
    newCard.className = 'recipe-card';
    newCard.innerHTML = `
        <div class="recipe-image">
            <img src="${recipe.image}" alt="${recipe.title}">
            <div class="recipe-badge ${recipe.category}">${recipe.category.replace('-', ' ').toUpperCase()}</div>
        </div>
        <div class="recipe-content">
            <h3 class="recipe-title">${recipe.title}</h3>
            <div class="recipe-meta">
                <span class="servings">🍽️ ${recipe.servings} servings</span>
            </div>
            <div class="recipe-actions">
                <button class="view-recipe-btn">View Recipe</button>
                <button class="edit-recipe-btn">✏️ Edit</button>
                <button class="delete-recipe-btn">🗑️ Delete</button>
                <button class="favorite-btn">❤️</button>
            </div>
        </div>
    `;
    
    // Add event listeners to the new card
    const viewBtn = newCard.querySelector('.view-recipe-btn');
    viewBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openRecipeModal(recipeId);
    });
    
    const editBtn = newCard.querySelector('.edit-recipe-btn');
    editBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openEditRecipeModal(recipeId);
    });
    
    const deleteBtn = newCard.querySelector('.delete-recipe-btn');
    deleteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        openDeleteModal(recipeId);
    });
    
    const favoriteBtn = newCard.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', function(e) {
        e.preventDefault();
        this.classList.toggle('active');
        
        if (this.classList.contains('active')) {
            this.style.transform = 'scale(1.2)';
            setTimeout(() => {
                this.style.transform = 'scale(1.05)';
            }, 150);
        }
    });
    
    recipeList.appendChild(newCard);
}

// Edit Recipe Functions
function openEditRecipeModal(recipeId) {
    const recipe = recipeData[recipeId];
    if (!recipe) return;
    
    editingRecipeId = recipeId;
    
    // Open the add recipe modal but populate it with existing data
    const modal = document.getElementById('addRecipeModal');
    const modalHeader = modal.querySelector('.modal-header h2');
    modalHeader.textContent = 'Edit Recipe';
    
    // Populate form with existing data
    document.getElementById('recipeTitle').value = recipe.title;
    document.getElementById('recipeCategory').value = recipe.category;
    document.getElementById('recipeImage').value = recipe.image;
    document.getElementById('servings').value = recipe.servings;
    document.getElementById('recipeTips').value = recipe.tips;
    
    // Populate ingredients
    const ingredientsContainer = document.getElementById('ingredientsContainer');
    ingredientsContainer.innerHTML = '';
    recipe.ingredients.forEach((ingredient, index) => {
        const newGroup = document.createElement('div');
        newGroup.className = 'ingredient-input-group';
        newGroup.innerHTML = `
            <input type="text" name="ingredients[]" value="${ingredient}" required>
            <button type="button" class="remove-ingredient-btn" onclick="removeIngredientField(this)">×</button>
        `;
        ingredientsContainer.appendChild(newGroup);
    });
    
    // Populate instructions
    const instructionsContainer = document.getElementById('instructionsContainer');
    instructionsContainer.innerHTML = '';
    recipe.instructions.forEach((instruction, index) => {
        const newGroup = document.createElement('div');
        newGroup.className = 'instruction-input-group';
        newGroup.innerHTML = `
            <span class="step-number">${index + 1}</span>
            <textarea name="instructions[]" required rows="2">${instruction}</textarea>
            <button type="button" class="remove-instruction-btn" onclick="removeInstructionField(this)">×</button>
        `;
        instructionsContainer.appendChild(newGroup);
    });
    
    // Change save button text
    const saveBtn = modal.querySelector('.btn-primary');
    saveBtn.textContent = 'Update Recipe';
    saveBtn.onclick = updateExistingRecipe;
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

async function updateExistingRecipe() {
    const form = document.getElementById('addRecipeForm');
    const formData = new FormData(form);
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Collect ingredients
    const ingredientInputs = document.querySelectorAll('input[name="ingredients[]"]');
    const ingredients = Array.from(ingredientInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    if (ingredients.length === 0) {
        alert('Please add at least one ingredient.');
        return;
    }
    
    // Collect instructions
    const instructionInputs = document.querySelectorAll('textarea[name="instructions[]"]');
    const instructions = Array.from(instructionInputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');
    
    if (instructions.length === 0) {
        alert('Please add at least one instruction step.');
        return;
    }
    
    // Get existing recipe data to preserve metadata
    const existingRecipe = recipeData[editingRecipeId] || {};
    
    // Update recipe object
    const updatedRecipe = {
        ...existingRecipe,
        id: editingRecipeId,
        title: formData.get('title'),
        image: formData.get('image') || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
        category: formData.get('category'),
        servings: formData.get('servings'),
        ingredients: ingredients,
        instructions: instructions,
        tips: formData.get('tips') || 'No special tips provided.'
    };
    
    try {
        // Update in database
        await recipeDB.updateRecipe(updatedRecipe);
        
        // Update in-memory data
        recipeData[editingRecipeId] = updatedRecipe;
        
        // Update the recipe card in the DOM
        updateRecipeCardInDOM(editingRecipeId, updatedRecipe);
        
        // Reset editing state
        editingRecipeId = null;
        
        // Close modal and show success message
        closeAddRecipeModal();
        showSuccessMessage('Recipe updated successfully!');
        
    } catch (error) {
        console.error('Failed to update recipe:', error);
        alert('Failed to update recipe. Please try again.');
    }
}

function updateRecipeCardInDOM(recipeId, recipe) {
    const recipeCards = document.querySelectorAll('.recipe-card');
    const recipeIds = ['margherita-pizza', 'grilled-salmon', 'chocolate-lava-cake'];
    
    // Find the card to update
    let cardToUpdate = null;
    recipeCards.forEach((card, index) => {
        if (recipeIds[index] === recipeId) {
            cardToUpdate = card;
        } else {
            // Check if it's a dynamically added card
            const titleElement = card.querySelector('.recipe-title');
            if (titleElement && generateRecipeId(titleElement.textContent) === recipeId) {
                cardToUpdate = card;
            }
        }
    });
    
    if (cardToUpdate) {
        // Update card content
        cardToUpdate.querySelector('.recipe-title').textContent = recipe.title;
        cardToUpdate.querySelector('.recipe-image img').src = recipe.image;
        cardToUpdate.querySelector('.recipe-image img').alt = recipe.title;
        cardToUpdate.querySelector('.recipe-badge').textContent = recipe.category.replace('-', ' ').toUpperCase();
        cardToUpdate.querySelector('.recipe-badge').className = `recipe-badge ${recipe.category}`;
        cardToUpdate.querySelector('.servings').textContent = `🍽️ ${recipe.servings} servings`;
    }
}

// Delete Recipe Functions
function openDeleteModal(recipeId) {
    const recipe = recipeData[recipeId];
    if (!recipe) return;
    
    recipeToDelete = recipeId;
    document.getElementById('deleteRecipeName').textContent = recipe.title;
    
    const modal = document.getElementById('deleteConfirmModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
    recipeToDelete = null;
}

async function confirmDeleteRecipe() {
    if (!recipeToDelete) return;
    
    const recipe = recipeData[recipeToDelete];
    const recipeName = recipe.title;
    
    try {
        // Delete from database
        await recipeDB.deleteRecipe(recipeToDelete);
        
        // Add to deleted recipes list to prevent reloading
        if (!deletedRecipes.includes(recipeToDelete)) {
            deletedRecipes.push(recipeToDelete);
            localStorage.setItem('recipro_deleted_recipes', JSON.stringify(deletedRecipes));
        }
        
        // Remove from in-memory data
        delete recipeData[recipeToDelete];
        
        // Remove card from DOM
        removeRecipeCardFromDOM(recipeToDelete);
        
        // Close modal and show success message
        closeDeleteModal();
        showSuccessMessage(`"${recipeName}" deleted successfully!`);
        
    } catch (error) {
        console.error('Failed to delete recipe:', error);
        alert('Failed to delete recipe. Please try again.');
    }
}

function removeRecipeCardFromDOM(recipeId) {
    const recipeCards = document.querySelectorAll('.recipe-card');
    const recipeIds = ['margherita-pizza', 'grilled-salmon', 'chocolate-lava-cake'];
    
    recipeCards.forEach((card, index) => {
        let shouldRemove = false;
        
        if (recipeIds[index] === recipeId) {
            shouldRemove = true;
        } else {
            // Check if it's a dynamically added card
            const titleElement = card.querySelector('.recipe-title');
            if (titleElement && generateRecipeId(titleElement.textContent) === recipeId) {
                shouldRemove = true;
            }
        }
        
        if (shouldRemove) {
            console.log(`Removing recipe card for: ${recipeId}`);
            card.style.animation = 'fadeOutScale 0.3s ease';
            setTimeout(() => {
                card.remove();
                console.log(`Recipe card removed from DOM: ${recipeId}`);
            }, 300);
        }
    });
}

// Print Recipe Function - Simplified
function printRecipe() {
    if (!currentRecipe) {
        alert('No recipe selected for printing.');
        return;
    }
    
    const studentCount = parseInt(document.getElementById('studentCount').value) || 1;
    const originalServings = parseInt(currentRecipe.servings);
    
    // Scale factor is based on student count
    const scaleFactor = studentCount;
    
    // Calculate total servings: original servings × scale factor
    const totalServings = originalServings * scaleFactor;
    
    // Get ingredients - use originalIngredients if available, otherwise use current recipe ingredients
    const ingredientsToScale = originalIngredients && originalIngredients.length > 0 
        ? originalIngredients 
        : currentRecipe.ingredients || [];
    
    if (ingredientsToScale.length === 0) {
        alert('No ingredients found for this recipe.');
        return;
    }
    
    // Get scaled ingredients
    const scaledIngredients = ingredientsToScale.map(ingredient => {
        const parsedIngredient = parseIngredient(ingredient);
        return scaleIngredient(parsedIngredient, scaleFactor);
    });
    
    // Debug logging
    console.log('Print Recipe Debug Info:');
    console.log('Current Recipe:', currentRecipe.title);
    console.log('Student Count:', studentCount);
    console.log('Original Servings:', originalServings);
    console.log('Scale Factor:', scaleFactor);
    console.log('Total Servings:', totalServings);
    console.log('Original Ingredients:', ingredientsToScale);
    console.log('Scaled Ingredients:', scaledIngredients);
    
    // Create simplified print content
    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Recipe: ${currentRecipe.title}</title>
            <style>
                @media print {
                    @page {
                        margin: 0.75in;
                        size: letter;
                    }
                }
                
                body {
                    font-family: 'Arial', sans-serif;
                    line-height: 1.5;
                    color: #000;
                    margin: 0;
                    padding: 20px;
                }
                
                .recipe-header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #000;
                    padding-bottom: 15px;
                }
                
                .recipe-title {
                    font-size: 2rem;
                    font-weight: bold;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                }
                
                .student-info {
                    font-size: 1.2rem;
                    font-weight: bold;
                    margin-bottom: 20px;
                    background: #f0f0f0;
                    padding: 10px;
                    border-radius: 5px;
                }
                
                .ingredients-section {
                    margin-top: 30px;
                }
                
                .section-title {
                    font-size: 1.5rem;
                    font-weight: bold;
                    margin-bottom: 15px;
                    text-transform: uppercase;
                    border-bottom: 1px solid #000;
                    padding-bottom: 5px;
                }
                
                .ingredients-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .ingredients-list li {
                    margin-bottom: 8px;
                    padding: 8px 0;
                    font-size: 1.1rem;
                    border-bottom: 1px dotted #ccc;
                }
                
                .ingredient-bullet {
                    margin-right: 8px;
                    font-weight: bold;
                }
                
                .print-footer {
                    margin-top: 30px;
                    padding-top: 15px;
                    border-top: 1px solid #ccc;
                    font-size: 0.9rem;
                    color: #666;
                }
                
                .requested-by {
                    margin-bottom: 10px;
                    font-weight: bold;
                }
                
                .print-date {
                    font-size: 0.8rem;
                    color: #999;
                }
                
                @media print {
                    body {
                        padding: 0;
                    }
                    
                    .recipe-header {
                        page-break-after: avoid;
                    }
                    
                    .ingredients-section {
                        page-break-inside: avoid;
                    }
                    
                    .print-footer {
                        page-break-inside: avoid;
                    }
                }
            </style>
        </head>
        <body>
            <div class="recipe-header">
                <h1 class="recipe-title">${currentRecipe.title}</h1>
                <div class="student-info">
                    👥 Number of Students: ${studentCount} | 🍽️ Total Servings: ${totalServings}
                </div>
            </div>
            
            <div class="ingredients-section">
                <h2 class="section-title">Ingredients</h2>
                <ul class="ingredients-list">
                    ${scaledIngredients && scaledIngredients.length > 0 
                        ? scaledIngredients.map(ingredient => 
                            `<li><span class="ingredient-bullet">•</span>${ingredient || 'Unknown ingredient'}</li>`
                          ).join('')
                        : '<li>No ingredients available</li>'
                    }
                </ul>
            </div>
            
            <div class="print-footer">
                <div class="requested-by">
                    Requested By: ${getUserName()}
                </div>
                <div class="print-date">
                    Printed on: ${new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    // Wait for content to load then print
    printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        
        // Close print window after printing (optional)
        printWindow.onafterprint = function() {
            printWindow.close();
        };
    };
    
    console.log('Print window opened successfully');
}

// Admin function to restore all deleted recipes (for testing)
function restoreAllDeletedRecipes() {
    const confirmed = confirm('This will restore all deleted recipes. Are you sure?');
    if (confirmed) {
        deletedRecipes = [];
        localStorage.removeItem('recipro_deleted_recipes');
        
        // Reload the page to restore default recipes
        location.reload();
    }
}

// Admin function to show deleted recipes list
function showDeletedRecipes() {
    console.log('Deleted recipes:', deletedRecipes);
    if (deletedRecipes.length === 0) {
        alert('No recipes have been deleted.');
    } else {
        alert(`Deleted recipes: ${deletedRecipes.join(', ')}`);
    }
}

// Admin utility functions (for testing and management)
function promoteToAdmin() {
    const currentName = localStorage.getItem('recipro_user_name') || 'User';
    const newName = prompt('Enter admin name (will be promoted to admin):', currentName);
    
    if (newName && newName.trim()) {
        localStorage.setItem('recipro_user_name', 'Admin ' + newName.trim());
        
        // Update display
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = `Welcome, Admin ${newName.trim()}`;
        }
        
        // Refresh admin elements
        updateAdminElements();
        
        alert('✅ User promoted to admin successfully!\n\nYou now have access to database management.');
    }
}

function demoteFromAdmin() {
    const currentName = localStorage.getItem('recipro_user_name') || 'User';
    const cleanName = currentName.replace(/admin|administrator|chef|instructor|teacher/gi, '').trim();
    const newName = cleanName || 'User';
    
    localStorage.setItem('recipro_user_name', newName);
    
    // Update display
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = `Welcome, ${newName}`;
    }
    
    // Refresh admin elements
    updateAdminElements();
    
    alert('ℹ️ Admin privileges removed.\n\nDatabase management is no longer accessible.');
}

function checkAdminStatus() {
    const isAdmin = isCurrentUserAdmin() || isUserNameAdmin();
    const currentUser = localStorage.getItem('recipro_current_user') || 'Not logged in';
    const userName = localStorage.getItem('recipro_user_name') || 'Not set';
    
    alert(`🔍 Admin Status Check\n\nLogin User: ${currentUser}\nDisplay Name: ${userName}\nAdmin Access: ${isAdmin ? '✅ YES' : '❌ NO'}\n\nAdmin Keywords: ${adminUsers.join(', ')}`);
}

// Hide deleted recipe cards on page load
function hideDeletedRecipeCards() {
    deletedRecipes.forEach(deletedId => {
        // Remove from in-memory data
        if (recipeData[deletedId]) {
            delete recipeData[deletedId];
        }
        
        // Remove from DOM
        removeRecipeCardFromDOM(deletedId);
    });
    
    console.log(`Hidden ${deletedRecipes.length} deleted recipe cards`);
}

// Search and Filter Functions
function initializeSearchAndFilter() {
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('course');
    
    if (searchInput) {
        searchInput.addEventListener('input', performSearch);
    }
    
    if (categoryFilter) {
        categoryFilter.addEventListener('change', performSearch);
    }
}

function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const selectedCategory = document.getElementById('course').value;
    
    const recipeCards = document.querySelectorAll('.recipe-card');
    let visibleCount = 0;
    
    recipeCards.forEach((card, index) => {
        const title = card.querySelector('.recipe-title')?.textContent.toLowerCase() || '';
        const description = card.querySelector('.recipe-description')?.textContent.toLowerCase() || '';
        const badge = card.querySelector('.recipe-badge')?.textContent.toLowerCase() || '';
        
        // Get recipe category from badge or data attribute
        let recipeCategory = '';
        const badgeElement = card.querySelector('.recipe-badge');
        if (badgeElement) {
            // Extract category from CSS class
            const classList = Array.from(badgeElement.classList);
            const categoryClass = classList.find(cls => 
                ['appetizer', 'main-course', 'dessert', 'confectionery', 'beverage', 'side-dish'].includes(cls)
            );
            recipeCategory = categoryClass || '';
        }
        
        // Get recipe ID to check ingredients
        const recipeIds = ['margherita-pizza', 'grilled-salmon', 'chocolate-lava-cake'];
        let recipeId = recipeIds[index];
        
        // For dynamically added cards, get ID from title
        if (!recipeId) {
            const titleElement = card.querySelector('.recipe-title');
            if (titleElement) {
                recipeId = generateRecipeId(titleElement.textContent);
            }
        }
        
        // Check ingredients if recipe data exists
        let ingredientsMatch = false;
        if (recipeId && recipeData[recipeId] && recipeData[recipeId].ingredients) {
            const ingredients = recipeData[recipeId].ingredients.join(' ').toLowerCase();
            ingredientsMatch = ingredients.includes(searchTerm);
        }
        
        // Check if recipe matches search term
        const matchesSearch = searchTerm === '' || 
            title.includes(searchTerm) || 
            description.includes(searchTerm) ||
            badge.includes(searchTerm) ||
            ingredientsMatch;
        
        // Check if recipe matches category filter
        const matchesCategory = selectedCategory === 'all' || 
            recipeCategory === selectedCategory ||
            badge.includes(selectedCategory.replace('-', ' '));
        
        // Show/hide card based on filters
        if (matchesSearch && matchesCategory) {
            card.style.display = 'block';
            card.style.animation = 'fadeIn 0.3s ease';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });
    
    // Show/hide "no results" message
    updateNoResultsMessage(visibleCount, searchTerm, selectedCategory);
    
    // Update search results info
    updateSearchResultsInfo(visibleCount, searchTerm, selectedCategory);
}

function updateNoResultsMessage(visibleCount, searchTerm, selectedCategory) {
    // Remove existing no results message
    const existingMessage = document.querySelector('.no-results-message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Add no results message if needed
    if (visibleCount === 0) {
        const recipeList = document.querySelector('.recipe-list');
        const noResultsDiv = document.createElement('div');
        noResultsDiv.className = 'no-results-message';
        
        let message = 'No recipes found';
        if (searchTerm && selectedCategory !== 'all') {
            message = `No recipes found for "${searchTerm}" in ${selectedCategory.replace('-', ' ')} category`;
        } else if (searchTerm) {
            message = `No recipes found for "${searchTerm}"`;
        } else if (selectedCategory !== 'all') {
            message = `No recipes found in ${selectedCategory.replace('-', ' ')} category`;
        }
        
        noResultsDiv.innerHTML = `
            <div class="no-results-content">
                <div class="no-results-icon">🔍</div>
                <h3>${message}</h3>
                <p>Try adjusting your search terms or filters</p>
                <button class="clear-filters-btn" onclick="clearFilters()">Clear All Filters</button>
            </div>
        `;
        
        recipeList.appendChild(noResultsDiv);
    }
}

function clearFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('course').value = 'all';
    performSearch();
}

function updateSearchResultsInfo(visibleCount, searchTerm, selectedCategory) {
    const resultsInfo = document.getElementById('searchResultsInfo');
    const resultsCount = document.getElementById('resultsCount');
    const clearBtn = document.getElementById('clearFiltersBtn');
    
    const totalCards = document.querySelectorAll('.recipe-card').length;
    const hasFilters = searchTerm !== '' || selectedCategory !== 'all';
    
    if (hasFilters) {
        resultsInfo.style.display = 'flex';
        clearBtn.style.display = 'block';
        
        if (visibleCount === 0) {
            resultsCount.textContent = 'No recipes found';
        } else if (visibleCount === 1) {
            resultsCount.textContent = 'Showing 1 recipe';
        } else {
            resultsCount.textContent = `Showing ${visibleCount} recipes`;
        }
        
        if (searchTerm && selectedCategory !== 'all') {
            resultsCount.textContent += ` for "${searchTerm}" in ${selectedCategory.replace('-', ' ')}`;
        } else if (searchTerm) {
            resultsCount.textContent += ` for "${searchTerm}"`;
        } else if (selectedCategory !== 'all') {
            resultsCount.textContent += ` in ${selectedCategory.replace('-', ' ')} category`;
        }
    } else {
        if (visibleCount === totalCards) {
            resultsInfo.style.display = 'none';
        } else {
            resultsInfo.style.display = 'flex';
            clearBtn.style.display = 'none';
            resultsCount.textContent = `Showing ${visibleCount} of ${totalCards} recipes`;
        }
    }
}

// Advanced search function for multiple criteria
function searchRecipes(criteria) {
    const { title, category, difficulty, ingredients } = criteria;
    const recipeCards = document.querySelectorAll('.recipe-card');
    
    recipeCards.forEach(card => {
        let matches = true;
        
        if (title) {
            const cardTitle = card.querySelector('.recipe-title')?.textContent.toLowerCase() || '';
            matches = matches && cardTitle.includes(title.toLowerCase());
        }
        
        if (category && category !== 'all') {
            const badge = card.querySelector('.recipe-badge');
            const cardCategory = badge ? Array.from(badge.classList).find(cls => 
                ['appetizer', 'main-course', 'dessert', 'confectionery', 'beverage', 'side-dish'].includes(cls)
            ) : '';
            matches = matches && cardCategory === category;
        }
        
        if (difficulty) {
            const cardDifficulty = card.querySelector('.difficulty')?.textContent.toLowerCase() || '';
            matches = matches && cardDifficulty.includes(difficulty.toLowerCase());
        }
        
        card.style.display = matches ? 'block' : 'none';
    });
}

// Get user name for printouts
function getUserName() {
    // Try to get authenticated user's name first
    const currentUser = localStorage.getItem('recipro_current_user');
    if (currentUser) {
        const userData = JSON.parse(currentUser);
        return `${userData.firstName} ${userData.lastName}`;
    }
    
    // Fallback to stored name
    let userName = localStorage.getItem('recipro_user_name');
    
    // If no stored name, prompt user to enter their name
    if (!userName) {
        userName = prompt('Please enter your name for the recipe printout:', 'Chef');
        
        // If user provided a name, store it for future use
        if (userName && userName.trim()) {
            userName = userName.trim();
            localStorage.setItem('recipro_user_name', userName);
        } else {
            // Default name if user cancels or enters empty string
            userName = 'Chef';
        }
    }
    
    return userName;
}

// Function to update user name (can be called from settings)
function updateUserName() {
    const currentName = localStorage.getItem('recipro_user_name') || 'Chef';
    const newName = prompt('Enter your name:', currentName);
    
    if (newName && newName.trim()) {
        localStorage.setItem('recipro_user_name', newName.trim());
        
        // Update the display in the header
        const userNameElement = document.querySelector('.user-name');
        if (userNameElement) {
            userNameElement.textContent = `Welcome, ${newName.trim()}`;
        }
        
        // Update admin elements after name change
        updateAdminElements();
        
        showSuccessMessage('Name updated successfully!');
    }
}

// Database Management Functions (Admin Protected)
async function openDatabasePanelInternal() {
    const modal = document.getElementById('databaseModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        
        // Load database statistics
        await updateDatabaseStats();
    } else {
        alert('Database management panel is not available.');
    }
}

function closeDatabasePanel() {
    const modal = document.getElementById('databaseModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function updateDatabaseStats() {
    try {
        const stats = await recipeDB.getStats();
        const dbSize = await recipeDB.getDatabaseSize();
        
        // Update statistics display
        document.getElementById('totalRecipesCount').textContent = stats.totalRecipes;
        document.getElementById('categoriesCount').textContent = Object.keys(stats.categories).length;
        
        if (dbSize) {
            document.getElementById('dbSizeDisplay').textContent = `${dbSize.usedMB} MB`;
        } else {
            document.getElementById('dbSizeDisplay').textContent = 'N/A';
        }
        
        // Update recent activity
        const recentActivity = document.getElementById('recentActivity');
        if (stats.recentlyModified.length > 0) {
            recentActivity.innerHTML = stats.recentlyModified.map(recipe => `
                <div class="recent-item">
                    <div>
                        <div class="recent-item-title">${recipe.title}</div>
                        <div class="recent-item-date">${new Date(recipe.dateModified).toLocaleDateString()}</div>
                    </div>
                    <span class="recent-item-action action-updated">Updated</span>
                </div>
            `).join('');
        } else {
            recentActivity.innerHTML = '<p>No recent activity</p>';
        }
        
    } catch (error) {
        console.error('Failed to load database stats:', error);
    }
}

async function exportDatabase() {
    try {
        const exportData = await recipeDB.exportAllRecipes();
        
        // Create download link
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `recipro-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        showSuccessMessage('Database exported successfully!');
        
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export database. Please try again.');
    }
}

function importDatabase() {
    document.getElementById('importFileInput').click();
}

async function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const text = await file.text();
        const importData = JSON.parse(text);
        
        if (!importData.recipes || !Array.isArray(importData.recipes)) {
            throw new Error('Invalid backup file format');
        }
        
        // Confirm import
        const confirmed = confirm(`This will import ${importData.recipes.length} recipes. Continue?`);
        if (!confirmed) return;
        
        // Import recipes
        let successful = 0;
        let failed = 0;
        
        for (const recipe of importData.recipes) {
            try {
                await recipeDB.addRecipe(recipe);
                successful++;
            } catch (error) {
                // Try to update if recipe already exists
                try {
                    await recipeDB.updateRecipe(recipe);
                    successful++;
                } catch (updateError) {
                    console.error('Failed to import recipe:', recipe.title, updateError);
                    failed++;
                }
            }
        }
        
        showSuccessMessage(`Import completed: ${successful} successful, ${failed} failed`);
        
        // Reload recipes from database
        await loadRecipesFromDatabase();
        await updateDatabaseStats();
        
    } catch (error) {
        console.error('Import failed:', error);
        alert('Failed to import database. Please check the file format.');
    }
    
    // Reset file input
    event.target.value = '';
}

async function clearDatabase() {
    const confirmed = confirm('Are you sure you want to delete ALL recipes? This cannot be undone!');
    if (!confirmed) return;
    
    const doubleConfirmed = confirm('This will permanently delete all your recipes. Are you absolutely sure?');
    if (!doubleConfirmed) return;
    
    try {
        await recipeDB.clearAllRecipes();
        
        // Clear in-memory data (except default recipes)
        Object.keys(recipeData).forEach(key => {
            if (!['margherita-pizza', 'grilled-salmon', 'chocolate-lava-cake'].includes(key)) {
                delete recipeData[key];
            }
        });
        
        // Remove recipe cards from DOM (except default ones)
        const recipeCards = document.querySelectorAll('.recipe-card');
        recipeCards.forEach((card, index) => {
            if (index > 2) { // Keep first 3 default cards
                card.remove();
            }
        });
        
        showSuccessMessage('All recipes cleared successfully!');
        await updateDatabaseStats();
        
    } catch (error) {
        console.error('Failed to clear database:', error);
        alert('Failed to clear database. Please try again.');
    }
}

async function refreshDatabase() {
    try {
        await loadRecipesFromDatabase();
        await updateDatabaseStats();
        showSuccessMessage('Database refreshed successfully!');
    } catch (error) {
        console.error('Failed to refresh database:', error);
        alert('Failed to refresh database. Please try again.');
    }
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745, #20c997);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 600;
        z-index: 2000;
        animation: slideInRight 0.3s ease;
        box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
    `;
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(successDiv);
        }, 300);
    }, 3000);
}

// Load recipes from database
async function loadRecipesFromDatabase() {
    try {
        const recipes = await recipeDB.getAllRecipes();
        
        // Clear existing in-memory data, but respect deleted recipes
        Object.keys(recipeData).forEach(key => {
            if (!['margherita-pizza', 'grilled-salmon', 'chocolate-lava-cake'].includes(key)) {
                delete recipeData[key];
            }
        });
        
        // Remove deleted default recipes from memory and DOM
        deletedRecipes.forEach(deletedId => {
            if (recipeData[deletedId]) {
                delete recipeData[deletedId];
                removeRecipeCardFromDOM(deletedId);
            }
        });
        
        // Load database recipes into memory and display them
        recipes.forEach(recipe => {
            if (recipe.id && !recipeData[recipe.id] && !deletedRecipes.includes(recipe.id)) {
                recipeData[recipe.id] = recipe;
                
                // Only add cards for non-default recipes (default ones are already in HTML)
                if (!['margherita-pizza', 'grilled-salmon', 'chocolate-lava-cake'].includes(recipe.id)) {
                    addRecipeCardToPage(recipe.id, recipe);
                }
            }
        });
        
        console.log(`Loaded ${recipes.length} recipes from database`);
        console.log(`Deleted recipes: ${deletedRecipes.length}`);
    } catch (error) {
        console.error('Failed to load recipes from database:', error);
    }
}

// Initialize user name display
function initializeUserName() {
    const userName = localStorage.getItem('recipro_user_name');
    const userNameElement = document.querySelector('.user-name');
    
    if (userNameElement) {
        if (userName) {
            userNameElement.textContent = `Welcome, ${userName}`;
        } else {
            userNameElement.textContent = 'Welcome, User';
        }
    }
}

// Authentication check
function checkAuthentication() {
    const currentUser = localStorage.getItem('recipro_current_user');
    
    if (!currentUser) {
        // Redirect to login page if not authenticated
        window.location.href = 'login.html';
        return false;
    }
    
    const userData = JSON.parse(currentUser);
    
    // Update user display with authenticated user info
    const userNameElement = document.querySelector('.user-name');
    if (userNameElement) {
        userNameElement.textContent = `Welcome, ${userData.firstName}`;
    }
    
    // Set user role for permissions
    document.body.setAttribute('data-user-role', userData.role);
    
    return true;
}

// Logout function
function logout() {
    const confirmed = confirm('Are you sure you want to logout?');
    if (confirmed) {
        localStorage.removeItem('recipro_current_user');
        localStorage.removeItem('recipro_remember_me');
        localStorage.removeItem('recipro_user_role');
        window.location.href = 'login.html';
    }
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAuthentication()) {
        return;
    }
    
    // Initialize user name display
    initializeUserName();
    
    // Update admin elements visibility
    updateAdminElements();
    
    // Hide deleted recipe cards immediately
    hideDeletedRecipeCards();
    
    // Initialize search and filter functionality
    initializeSearchAndFilter();
    
    // Load recipes from database after a short delay to ensure database is initialized
    setTimeout(loadRecipesFromDatabase, 500);
    
    // Add Recipe button event listener
    const addRecipeBtn = document.querySelector('.add-recipe-btn');
    if (addRecipeBtn) {
        addRecipeBtn.addEventListener('click', openAddRecipeModal);
    }
    
    // Add click event listeners to recipe cards
    const recipeCards = document.querySelectorAll('.recipe-card');
    recipeCards.forEach((card, index) => {
        const recipeIds = ['margherita-pizza', 'grilled-salmon', 'chocolate-lava-cake'];
        const recipeId = recipeIds[index];
        
        if (recipeId) {
            const viewBtn = card.querySelector('.view-recipe-btn');
            if (viewBtn) {
                viewBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openRecipeModal(recipeId);
                });
            }
            
            const editBtn = card.querySelector('.edit-recipe-btn');
            if (editBtn) {
                editBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openEditRecipeModal(recipeId);
                });
            }
            
            const deleteBtn = card.querySelector('.delete-recipe-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', function(e) {
                    e.preventDefault();
                    openDeleteModal(recipeId);
                });
            }
        }
    });
    
    // Close modal when clicking the X button
    const closeBtn = document.querySelector('#recipeModal .close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }
    
    // Close modal when clicking outside of it
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal();
            }
        });
    }
    
    // Close add recipe modal when clicking outside of it
    const addRecipeModal = document.getElementById('addRecipeModal');
    if (addRecipeModal) {
        addRecipeModal.addEventListener('click', function(e) {
            if (e.target === addRecipeModal) {
                closeAddRecipeModal();
            }
        });
    }
    
    // Close modals with Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeModal();
            closeAddRecipeModal();
        }
    });
    
    // Add functionality to favorite buttons
    const favoriteButtons = document.querySelectorAll('.favorite-btn');
    favoriteButtons.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            this.classList.toggle('active');
            
            // Optional: Add visual feedback
            if (this.classList.contains('active')) {
                this.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    this.style.transform = 'scale(1.05)';
                }, 150);
            }
        });
    });
});

// Search functionality (basic implementation)
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-bar input');
    const courseFilter = document.getElementById('course');
    const recipeCards = document.querySelectorAll('.recipe-card');
    
    function filterRecipes() {
        const searchTerm = searchInput.value.toLowerCase();
        const selectedCourse = courseFilter.value;
        
        recipeCards.forEach(card => {
            const title = card.querySelector('.recipe-title')?.textContent.toLowerCase() || '';
            const badge = card.querySelector('.recipe-badge')?.textContent.toLowerCase() || '';
            
            const matchesSearch = title.includes(searchTerm);
            const matchesCourse = selectedCourse === 'all' || badge.includes(selectedCourse.replace('-', ' '));
            
            if (matchesSearch && matchesCourse) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', filterRecipes);
    }
    
    if (courseFilter) {
        courseFilter.addEventListener('change', filterRecipes);
    }
});

// Recipe Combiner Functionality
let recipeCombiner = null;
let currentShoppingList = '';

// Test function to check if button click works
function testCombinerButton() {
    console.log('Button clicked!');
    alert('Button is working! Now calling openRecipeCombiner...');
    openRecipeCombiner();
}

// Initialize recipe combiner when database is ready
async function initializeRecipeCombiner() {
    console.log('initializeRecipeCombiner called');
    console.log('recipeDB available:', !!recipeDB);
    
    if (!recipeDB) {
        console.error('Database not initialized');
        return;
    }
    
    try {
        recipeCombiner = new RecipeCombiner(recipeDB);
        console.log('Recipe combiner initialized successfully');
    } catch (error) {
        console.error('Error initializing recipe combiner:', error);
    }
}

// Open recipe combiner modal
async function openRecipeCombiner() {
    console.log('openRecipeCombiner called');
    console.log('recipeCombiner:', recipeCombiner);
    console.log('recipeDB:', recipeDB);
    
    if (!recipeCombiner) {
        console.log('Initializing recipe combiner...');
        await initializeRecipeCombiner();
    }
    
    const modal = document.getElementById('recipeCombinerModal');
    if (!modal) {
        console.error('Recipe combiner modal not found!');
        return;
    }
    
    console.log('Opening modal...');
    modal.style.display = 'block';
    
    // Load available recipes
    try {
        await loadAvailableRecipes();
        
        // Clear any previous selections
        if (recipeCombiner) {
            recipeCombiner.clear();
            updateSelectedRecipesList();
            updateShoppingListDisplay();
        }
    } catch (error) {
        console.error('Error in openRecipeCombiner:', error);
    }
}

// Close recipe combiner modal
function closeRecipeCombiner() {
    const modal = document.getElementById('recipeCombinerModal');
    modal.style.display = 'none';
    
    // Clear search
    const searchInput = document.getElementById('combinerSearchInput');
    if (searchInput) {
        searchInput.value = '';
    }
}

// Load available recipes for selection
async function loadAvailableRecipes(searchTerm = '') {
    try {
        const recipes = await recipeDB.getAllRecipes();
        const availableList = document.getElementById('availableRecipesList');
        
        if (!recipes || recipes.length === 0) {
            availableList.innerHTML = '<p class="empty-state">No recipes found. Add some recipes first!</p>';
            return;
        }
        
        // Filter recipes based on search term
        const filteredRecipes = searchTerm ? 
            recipes.filter(recipe => 
                recipe.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                recipe.category.toLowerCase().includes(searchTerm.toLowerCase())
            ) : recipes;
        
        if (filteredRecipes.length === 0) {
            availableList.innerHTML = '<p class="empty-state">No recipes match your search.</p>';
            return;
        }
        
        availableList.innerHTML = filteredRecipes.map(recipe => `
            <div class="available-recipe-item" onclick="addRecipeToSelection('${recipe.id}')">
                <div class="available-recipe-info">
                    <h4>${recipe.title}</h4>
                    <p>${recipe.category} • ${recipe.servings} servings</p>
                </div>
                <button class="add-recipe-btn-small" onclick="event.stopPropagation(); addRecipeToSelection('${recipe.id}')">
                    + Add
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Error loading available recipes:', error);
        document.getElementById('availableRecipesList').innerHTML = 
            '<p class="empty-state">Error loading recipes. Please try again.</p>';
    }
}

// Search recipes for combiner
function searchRecipesForCombiner() {
    const searchInput = document.getElementById('combinerSearchInput');
    const searchTerm = searchInput.value.trim();
    loadAvailableRecipes(searchTerm);
}

// Add recipe to selection
async function addRecipeToSelection(recipeId) {
    try {
        await recipeCombiner.addRecipe(recipeId, 1);
        updateSelectedRecipesList();
        updateShoppingListButtons();
        
        // Show success feedback
        showToast('Recipe added to combination!', 'success');
        
    } catch (error) {
        console.error('Error adding recipe to selection:', error);
        showToast('Error adding recipe. Please try again.', 'error');
    }
}

// Remove recipe from selection
function removeRecipeFromSelection(recipeId) {
    recipeCombiner.removeRecipe(recipeId);
    updateSelectedRecipesList();
    updateShoppingListButtons();
    updateShoppingListDisplay();
    
    showToast('Recipe removed from combination.', 'info');
}

// Update recipe multiplier
function updateRecipeMultiplier(recipeId, multiplier) {
    const numMultiplier = parseFloat(multiplier);
    if (numMultiplier > 0) {
        recipeCombiner.updateRecipeMultiplier(recipeId, numMultiplier);
        updateSelectedRecipesList();
        updateShoppingListDisplay();
    }
}

// Update selected recipes list display
function updateSelectedRecipesList() {
    const selectedList = document.getElementById('selectedRecipesList');
    const selectedRecipes = recipeCombiner.getSelectedRecipes();
    
    if (selectedRecipes.length === 0) {
        selectedList.innerHTML = '<p class="empty-state">No recipes selected yet. Choose recipes from the left panel.</p>';
        return;
    }
    
    selectedList.innerHTML = selectedRecipes.map(recipe => `
        <div class="selected-recipe-item">
            <div class="selected-recipe-header">
                <h4 class="selected-recipe-title">${recipe.title}</h4>
                <button class="remove-recipe-btn" onclick="removeRecipeFromSelection('${recipe.id}')">
                    ✕ Remove
                </button>
            </div>
            <div class="recipe-multiplier">
                <label>Multiplier:</label>
                <input type="number" 
                       class="multiplier-input" 
                       value="${recipe.multiplier}" 
                       min="0.1" 
                       step="0.1" 
                       onchange="updateRecipeMultiplier('${recipe.id}', this.value)">
            </div>
            <div class="recipe-servings-info">
                <span>Original: ${recipe.originalServings} servings</span>
                <span>Adjusted: ${recipe.adjustedServings} servings</span>
            </div>
        </div>
    `).join('');
}

// Update shopping list buttons state
function updateShoppingListButtons() {
    const selectedRecipes = recipeCombiner.getSelectedRecipes();
    const hasRecipes = selectedRecipes.length > 0;
    
    document.getElementById('generateListBtn').disabled = !hasRecipes;
    document.getElementById('printListBtn').disabled = !hasRecipes || !currentShoppingList;
    document.getElementById('exportListBtn').disabled = !hasRecipes || !currentShoppingList;
}

// Generate shopping list
function generateShoppingList() {
    try {
        currentShoppingList = recipeCombiner.generateShoppingList();
        updateShoppingListDisplay();
        updateShoppingListButtons();
        
        showToast('Shopping list generated!', 'success');
        
    } catch (error) {
        console.error('Error generating shopping list:', error);
        showToast('Error generating shopping list. Please try again.', 'error');
    }
}

// Update shopping list display
function updateShoppingListDisplay() {
    const content = document.getElementById('shoppingListContent');
    const selectedRecipes = recipeCombiner.getSelectedRecipes();
    
    if (selectedRecipes.length === 0) {
        content.innerHTML = '<p class="empty-state">Select recipes to generate a shopping list.</p>';
        currentShoppingList = '';
        return;
    }
    
    if (currentShoppingList) {
        // Add summary at the top
        const summary = recipeCombiner.getSummary();
        const summaryHtml = `
            <div class="shopping-list-summary">
                <div class="summary-item">
                    <span>Total Recipes:</span>
                    <span>${summary.totalRecipes}</span>
                </div>
                <div class="summary-item">
                    <span>Total Servings:</span>
                    <span>${summary.totalServings}</span>
                </div>
                <div class="summary-item">
                    <span>Total Ingredients:</span>
                    <span>${summary.totalIngredients}</span>
                </div>
            </div>
        `;
        
        content.innerHTML = summaryHtml + '<pre>' + currentShoppingList + '</pre>';
    } else {
        content.innerHTML = '<p class="empty-state">Click "Generate List" to create your shopping list.</p>';
    }
}

// Print shopping list
function printShoppingList() {
    if (!currentShoppingList) {
        showToast('Please generate a shopping list first.', 'warning');
        return;
    }
    
    const printWindow = window.open('', '_blank');
    const summary = recipeCombiner.getSummary();
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Shopping List - Recipe Combiner</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    margin: 20px;
                    color: #333;
                }
                .header {
                    text-align: center;
                    border-bottom: 2px solid #333;
                    padding-bottom: 10px;
                    margin-bottom: 20px;
                }
                .summary {
                    background: #f5f5f5;
                    padding: 15px;
                    border-radius: 5px;
                    margin-bottom: 20px;
                }
                .summary h3 {
                    margin-top: 0;
                }
                .shopping-list {
                    font-family: 'Courier New', monospace;
                    white-space: pre-wrap;
                    font-size: 14px;
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🛒 Shopping List</h1>
                <p>Generated from Recipe Combiner</p>
            </div>
            <div class="summary">
                <h3>Summary</h3>
                <p><strong>Recipes:</strong> ${summary.totalRecipes} | <strong>Servings:</strong> ${summary.totalServings} | <strong>Ingredients:</strong> ${summary.totalIngredients}</p>
                <p><strong>Recipes included:</strong></p>
                <ul>
                    ${summary.recipes.map(r => `<li>${r.title} ${r.multiplier !== 1 ? `(×${r.multiplier})` : ''} - ${r.adjustedServings} servings</li>`).join('')}
                </ul>
            </div>
            <div class="shopping-list">${currentShoppingList}</div>
            <script>
                window.onload = function() {
                    window.print();
                    window.onafterprint = function() {
                        window.close();
                    };
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Export shopping list as text file
function exportShoppingList() {
    if (!currentShoppingList) {
        showToast('Please generate a shopping list first.', 'warning');
        return;
    }
    
    const summary = recipeCombiner.getSummary();
    const exportContent = `RECIPE COMBINER - SHOPPING LIST
Generated on ${new Date().toLocaleString()}

SUMMARY:
- Total Recipes: ${summary.totalRecipes}
- Total Servings: ${summary.totalServings}
- Total Ingredients: ${summary.totalIngredients}

RECIPES INCLUDED:
${summary.recipes.map(r => `- ${r.title} ${r.multiplier !== 1 ? `(×${r.multiplier})` : ''} - ${r.adjustedServings} servings`).join('\n')}

${currentShoppingList}

---
Generated by Recipe Manager - Recipe Combiner Module`;
    
    const blob = new Blob([exportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shopping-list-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('Shopping list exported successfully!', 'success');
}

// Clear all selected recipes
function clearAllSelectedRecipes() {
    if (recipeCombiner.getSelectedRecipes().length === 0) {
        showToast('No recipes to clear.', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to clear all selected recipes?')) {
        recipeCombiner.clear();
        currentShoppingList = '';
        updateSelectedRecipesList();
        updateShoppingListDisplay();
        updateShoppingListButtons();
        
        showToast('All recipes cleared.', 'info');
    }
}

// Simple toast notification function
function showToast(message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    // Style the toast
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '12px 20px',
        borderRadius: '6px',
        color: 'white',
        fontWeight: '500',
        zIndex: '10000',
        opacity: '0',
        transform: 'translateY(-20px)',
        transition: 'all 0.3s ease',
        maxWidth: '300px',
        wordWrap: 'break-word'
    });
    
    // Set background color based on type
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    toast.style.backgroundColor = colors[type] || colors.info;
    
    // Add to document
    document.body.appendChild(toast);
    
    // Animate in
    setTimeout(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    // Remove after delay
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Logout function
function logout() {
    // Clear user session
    localStorage.removeItem('recipro_current_user');
    localStorage.removeItem('recipro_user_name');
    localStorage.removeItem('recipro_user_role');
    localStorage.removeItem('recipro_remember_me');
    
    // Redirect to login page
    window.location.href = 'login.html';
}

// Update user display name
function updateUserName() {
    const currentName = localStorage.getItem('recipro_user_name') || 'User';
    const newName = prompt('Enter your display name:', currentName);
    
    if (newName && newName.trim() !== '') {
        localStorage.setItem('recipro_user_name', newName.trim());
        updateWelcomeMessage();
        updateAdminElements();
        showSuccessMessage(`Display name updated to: ${newName}`);
    }
}

// List of available images in assets/img folder
const availableImages = [
    'margherita-pizza.svg',
    'grilled-salmon.svg',
    'chocolate-lava-cake.svg',
    'rock cakes.jpg'
];

// Open image browser modal
function openImageBrowser() {
    const modal = document.getElementById('imageBrowserModal');
    const gallery = document.getElementById('imageBrowserGallery');
    
    // Clear gallery
    gallery.innerHTML = '';
    
    // Load available images
    availableImages.forEach(imageName => {
        const imagePath = `assets/img/${imageName}`;
        
        const imageItem = document.createElement('div');
        imageItem.style.cssText = 'cursor: pointer; text-align: center;';
        imageItem.innerHTML = `
            <div style="position: relative; overflow: hidden; border-radius: 8px; background: #f0f0f0; aspect-ratio: 1; display: flex; align-items: center; justify-content: center; border: 2px solid #ddd; transition: all 0.3s ease;">
                <img src="${imagePath}" alt="${imageName}" style="max-width: 100%; max-height: 100%; object-fit: cover; width: 100%; height: 100%;">
            </div>
            <p style="font-size: 11px; margin-top: 8px; word-break: break-word; color: #666;">${imageName}</p>
        `;
        
        // Add hover effect
        imageItem.onmouseover = function() {
            imageItem.querySelector('div').style.borderColor = '#3498db';
            imageItem.querySelector('div').style.boxShadow = '0 0 8px rgba(52, 152, 219, 0.5)';
        };
        imageItem.onmouseout = function() {
            imageItem.querySelector('div').style.borderColor = '#ddd';
            imageItem.querySelector('div').style.boxShadow = 'none';
        };
        
        // Handle image selection
        imageItem.onclick = function() {
            selectImage(imagePath, imageName);
        };
        
        gallery.appendChild(imageItem);
    });
    
    modal.style.display = 'block';
}

// Close image browser
function closeImageBrowser() {
    const modal = document.getElementById('imageBrowserModal');
    modal.style.display = 'none';
}

// Select image from browser
function selectImage(imagePath, imageName) {
    document.getElementById('recipeImage').value = imagePath;
    previewSelectedImage(imagePath, imageName);
    closeImageBrowser();
}

// Preview image after selection
function previewImage() {
    const fileInput = document.getElementById('recipeImageFile');
    const file = fileInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('recipeImage').value = e.target.result;
            previewSelectedImage(e.target.result, file.name);
        };
        reader.readAsDataURL(file);
    }
}

// Display image preview
function previewSelectedImage(imagePath, imageName) {
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const previewText = document.getElementById('previewText');
    
    previewImg.src = imagePath;
    previewText.textContent = `✓ Selected: ${imageName}`;
    preview.style.display = 'block';
}

// Open Add Recipe Modal
function openAddRecipeModal() {
    const modal = document.getElementById('addRecipeModal');
    if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
        // Reset form when opening
        const form = document.getElementById('addRecipeForm');
        if (form) {
            form.reset();
            document.getElementById('imagePreview').style.display = 'none';
        }
    }
}

// Close Add Recipe Modal
function closeAddRecipeModal() {
    const modal = document.getElementById('addRecipeModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Add ingredient input field
function addIngredientField() {
    const container = document.getElementById('ingredientsContainer');
    if (!container) return;
    
    const newField = document.createElement('div');
    newField.className = 'ingredient-input-group';
    newField.innerHTML = `
        <input type="text" name="ingredients[]" placeholder="e.g., 2 cups all-purpose flour" required>
        <button type="button" class="remove-ingredient-btn" onclick="removeIngredientField(this)">×</button>
    `;
    container.appendChild(newField);
}

// Remove ingredient input field
function removeIngredientField(button) {
    const container = document.getElementById('ingredientsContainer');
    if (container && container.children.length > 1) {
        button.parentElement.remove();
    } else {
        showToast('You must have at least one ingredient', 'warning');
    }
}

// Add instruction input field
function addInstructionField() {
    const container = document.getElementById('instructionsContainer');
    if (!container) return;
    
    const stepNumber = container.children.length + 1;
    const newField = document.createElement('div');
    newField.className = 'instruction-input-group';
    newField.innerHTML = `
        <span class="step-number">${stepNumber}</span>
        <textarea name="instructions[]" placeholder="Describe step ${stepNumber}..." required rows="2"></textarea>
        <button type="button" class="remove-instruction-btn" onclick="removeInstructionField(this)">×</button>
    `;
    container.appendChild(newField);
}

// Remove instruction input field
function removeInstructionField(button) {
    const container = document.getElementById('instructionsContainer');
    if (container && container.children.length > 1) {
        button.parentElement.remove();
        // Renumber remaining steps
        Array.from(container.children).forEach((el, index) => {
            el.querySelector('.step-number').textContent = index + 1;
            el.querySelector('textarea').placeholder = `Describe step ${index + 1}...`;
        });
    } else {
        showToast('You must have at least one instruction', 'warning');
    }
}

// Save new recipe to database
async function saveNewRecipe() {
    try {
        const form = document.getElementById('addRecipeForm');
        if (!form) {
            showToast('Form not found', 'error');
            return;
        }
        
        const formData = new FormData(form);
        
        // Validate required fields
        const title = formData.get('title')?.trim();
        const category = formData.get('category')?.trim();
        const servings = formData.get('servings')?.trim();
        const image = formData.get('image')?.trim();
        
        if (!title || !category || !servings) {
            showToast('Please fill in all required fields (Title, Category, Servings)', 'warning');
            return;
        }
        
        // Get ingredients as array
        const ingredients = Array.from(formData.getAll('ingredients[]'))
            .map(ing => ing.trim())
            .filter(ing => ing.length > 0);
        
        // Get instructions as array
        const instructions = Array.from(formData.getAll('instructions[]'))
            .map(ins => ins.trim())
            .filter(ins => ins.length > 0);
        
        if (ingredients.length === 0 || instructions.length === 0) {
            showToast('Please add at least one ingredient and one instruction', 'warning');
            return;
        }
        
        const tips = formData.get('tips')?.trim() || '';
        
        // Create recipe object
        const newRecipe = {
            title,
            category,
            servings: parseInt(servings),
            ingredients,
            instructions,
            tips,
            image: image || getImagePath(title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'))
        };
        
        // Save to IndexedDB using recipeDB
        if (typeof recipeDB !== 'undefined' && recipeDB && recipeDB.db) {
            const savedRecipe = await recipeDB.addRecipe(newRecipe);
            showToast(`Recipe "${title}" saved successfully!`, 'success');
            closeAddRecipeModal();
            
            // Refresh recipe display
            displayAllRecipes();
        } else {
            showToast('Database not ready. Please refresh the page.', 'error');
        }
    } catch (error) {
        console.error('Error saving recipe:', error);
        showToast(`Error saving recipe: ${error.message}`, 'error');
    }
}

// Display all recipes from database
async function displayAllRecipes() {
    try {
        if (typeof recipeDB === 'undefined' || !recipeDB || !recipeDB.db) {
            console.log('Database not ready yet');
            return;
        }
        
        const recipes = await recipeDB.getAllRecipes();
        console.log('Loaded recipes:', recipes.length);
        
        const recipeList = document.querySelector('.recipe-list');
        if (!recipeList) return;
        
        // Clear existing recipe cards (keep only HTML structure)
        recipeList.innerHTML = '';
        
        // If no recipes, show message
        if (recipes.length === 0) {
            recipeList.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #999;"><p>No recipes yet. Click "Add Recipe" to create one!</p></div>';
            return;
        }
        
        // Display each recipe
        recipes.forEach(recipe => {
            const card = createRecipeCard(recipe);
            recipeList.appendChild(card);
        });
    } catch (error) {
        console.error('Error displaying recipes:', error);
    }
}

// Create a recipe card element
function createRecipeCard(recipe) {
    const card = document.createElement('div');
    card.className = 'recipe-card';
    
    const categoryColor = getCategoryColor(recipe.category);
    const imageUrl = recipe.image || getImagePath(recipe.title);
    
    card.innerHTML = `
        <div class="recipe-image">
            <img src="${imageUrl}" alt="${recipe.title}" onerror="this.src='assets/img/placeholder.svg'">
            <div class="recipe-badge ${recipe.category}">${recipe.category.replace('-', ' ').toUpperCase()}</div>
        </div>
        <div class="recipe-content">
            <h3 class="recipe-title">${recipe.title}</h3>
            <div class="recipe-meta">
                <span class="servings">🍽️ ${recipe.servings} servings</span>
            </div>
            <div class="recipe-actions">
                <button class="view-recipe-btn" onclick="openRecipeModal('${recipe.id}')">View Recipe</button>
                <button class="edit-recipe-btn" onclick="editRecipe('${recipe.id}')">✏️ Edit</button>
                <button class="delete-recipe-btn" onclick="openDeleteConfirmModal('${recipe.id}', '${recipe.title}')">🗑️ Delete</button>
            </div>
        </div>
    `;
    
    return card;
}

// Initialize page and set up event listeners
function initializeRecipePage() {
    // Set up Add Recipe button click handler
    const addRecipeBtn = document.querySelector('.add-recipe-btn');
    if (addRecipeBtn) {
        addRecipeBtn.addEventListener('click', openAddRecipeModal);
    }
    
    // Close modal when clicking outside
    const addRecipeModal = document.getElementById('addRecipeModal');
    if (addRecipeModal) {
        addRecipeModal.addEventListener('click', function(event) {
            if (event.target === addRecipeModal) {
                closeAddRecipeModal();
            }
        });
    }
    
    // Load and display recipes
    displayAllRecipes();
}

// Open recipe modal to view details
async function openRecipeModal(recipeId) {
    try {
        if (typeof recipeDB === 'undefined' || !recipeDB || !recipeDB.db) {
            showToast('Database not ready', 'error');
            return;
        }
        
        const recipe = await recipeDB.getRecipe(recipeId);
        if (!recipe) {
            showToast('Recipe not found', 'error');
            return;
        }
        
        // Update modal title and badge
        document.getElementById('modalTitle').textContent = recipe.title;
        document.getElementById('modalBadge').textContent = recipe.category.replace('-', ' ').toUpperCase();
        document.getElementById('modalBadge').className = `recipe-badge-large ${recipe.category}`;
        
        // Update image
        const modalImage = document.getElementById('modalImage');
        if (recipe.image) {
            modalImage.src = recipe.image;
        } else {
            // Use a placeholder or default image
            modalImage.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"%3E%3Crect fill="%23f0f0f0" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="20"%3ENo Image%3C/text%3E%3C/svg%3E';
        }
        
        // Update ingredients
        const ingredientsList = document.getElementById('modalIngredients');
        ingredientsList.innerHTML = '';
        recipe.ingredients.forEach(ingredient => {
            const li = document.createElement('li');
            li.textContent = ingredient;
            ingredientsList.appendChild(li);
        });
        
        // Update instructions
        const instructionsList = document.getElementById('modalInstructions');
        instructionsList.innerHTML = '';
        recipe.instructions.forEach(instruction => {
            const li = document.createElement('li');
            li.textContent = instruction;
            instructionsList.appendChild(li);
        });
        
        // Update tips
        document.getElementById('modalTips').textContent = recipe.tips || 'No additional tips available.';
        
        // Reset scaling to original
        resetToOriginal();
        
        // Show modal
        const modal = document.getElementById('recipeModal');
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    } catch (error) {
        console.error('Error loading recipe:', error);
        showToast('Error loading recipe', 'error');
    }
}

// Close recipe modal
function closeModal() {
    const modal = document.getElementById('recipeModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Edit recipe
async function editRecipe(recipeId) {
    try {
        if (typeof recipeDB === 'undefined' || !recipeDB || !recipeDB.db) {
            showToast('Database not ready', 'error');
            return;
        }
        
        const recipe = await recipeDB.getRecipe(recipeId);
        if (!recipe) {
            showToast('Recipe not found', 'error');
            return;
        }
        
        // Populate form with recipe data
        document.getElementById('recipeTitle').value = recipe.title;
        document.getElementById('recipeCategory').value = recipe.category;
        document.getElementById('servings').value = recipe.servings;
        document.getElementById('recipeTips').value = recipe.tips || '';
        
        // Clear and populate ingredients
        const ingredientsContainer = document.getElementById('ingredientsContainer');
        ingredientsContainer.innerHTML = '';
        recipe.ingredients.forEach(ingredient => {
            const field = document.createElement('div');
            field.className = 'ingredient-input-group';
            field.innerHTML = `
                <input type="text" name="ingredients[]" value="${ingredient}" required>
                <button type="button" class="remove-ingredient-btn" onclick="removeIngredientField(this)">×</button>
            `;
            ingredientsContainer.appendChild(field);
        });
        
        // Clear and populate instructions
        const instructionsContainer = document.getElementById('instructionsContainer');
        instructionsContainer.innerHTML = '';
        recipe.instructions.forEach((instruction, index) => {
            const field = document.createElement('div');
            field.className = 'instruction-input-group';
            field.innerHTML = `
                <span class="step-number">${index + 1}</span>
                <textarea name="instructions[]" required rows="2">${instruction}</textarea>
                <button type="button" class="remove-instruction-btn" onclick="removeInstructionField(this)">×</button>
            `;
            instructionsContainer.appendChild(field);
        });
        
        // Store the recipe ID for update
        document.getElementById('addRecipeForm').dataset.recipeId = recipeId;
        
        // Change button text and title
        document.querySelector('#addRecipeModal .modal-header h2').textContent = 'Edit Recipe';
        const saveBtn = document.querySelector('#addRecipeModal .btn-primary');
        saveBtn.textContent = 'Update Recipe';
        saveBtn.onclick = () => updateRecipe(recipeId);
        
        openAddRecipeModal();
    } catch (error) {
        console.error('Error editing recipe:', error);
        showToast('Error loading recipe for editing', 'error');
    }
}

// Update existing recipe
async function updateRecipe(recipeId) {
    try {
        const form = document.getElementById('addRecipeForm');
        const formData = new FormData(form);
        
        const title = formData.get('title')?.trim();
        const category = formData.get('category')?.trim();
        const servings = formData.get('servings')?.trim();
        const image = formData.get('image')?.trim();
        
        if (!title || !category || !servings) {
            showToast('Please fill in all required fields', 'warning');
            return;
        }
        
        const ingredients = Array.from(formData.getAll('ingredients[]'))
            .map(ing => ing.trim())
            .filter(ing => ing.length > 0);
        
        // Get instructions as array
        const instructions = Array.from(formData.getAll('instructions[]'))
            .map(ins => ins.trim())
            .filter(ins => ins.length > 0);
        
        if (ingredients.length === 0 || instructions.length === 0) {
            showToast('Please add at least one ingredient and one instruction', 'warning');
            return;
        }
        
        const updatedRecipe = {
            id: recipeId,
            title,
            category,
            servings: parseInt(servings),
            ingredients,
            instructions,
            tips: formData.get('tips')?.trim() || '',
            image: image || getImagePath(title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-'))
        };
        
        if (typeof recipeDB !== 'undefined' && recipeDB && recipeDB.db) {
            await recipeDB.updateRecipe(updatedRecipe);
            showToast(`Recipe "${title}" updated successfully!`, 'success');
            closeAddRecipeModal();
            resetAddRecipeModal();
            displayAllRecipes();
        } else {
            showToast('Database not ready', 'error');
        }
    } catch (error) {
        console.error('Error updating recipe:', error);
        showToast(`Error updating recipe: ${error.message}`, 'error');
    }
}

// Reset Add Recipe Modal
function resetAddRecipeModal() {
    const form = document.getElementById('addRecipeForm');
    if (form) {
        form.reset();
        form.dataset.recipeId = '';
    }
    
    // Reset modal header and button
    document.querySelector('#addRecipeModal .modal-header h2').textContent = 'Add New Recipe';
    const saveBtn = document.querySelector('#addRecipeModal .btn-primary');
    saveBtn.textContent = 'Save Recipe';
    saveBtn.onclick = saveNewRecipe;
}

// Open delete confirmation modal
function openDeleteConfirmModal(recipeId, recipeName) {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        document.getElementById('deleteRecipeName').textContent = recipeName;
        const confirmBtn = modal.querySelector('.btn-danger');
        confirmBtn.onclick = () => deleteRecipe(recipeId);
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

// Close delete confirmation modal
function closeDeleteModal() {
    const modal = document.getElementById('deleteConfirmModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Delete recipe
async function deleteRecipe(recipeId) {
    try {
        if (typeof recipeDB === 'undefined' || !recipeDB || !recipeDB.db) {
            showToast('Database not ready', 'error');
            return;
        }
        
        await recipeDB.deleteRecipe(recipeId);
        showToast('Recipe deleted successfully!', 'success');
        closeDeleteModal();
        displayAllRecipes();
    } catch (error) {
        console.error('Error deleting recipe:', error);
        showToast(`Error deleting recipe: ${error.message}`, 'error');
    }
}

// Get image path from recipe name or return default
function getImagePath(recipeName) {
    // Check if file exists in assets/img folder
    // For now, return a placeholder path
    const imageName = recipeName.replace(/[^a-z0-9-]/g, '').toLowerCase();
    return `assets/img/${imageName}.svg`;
}

// Preview image from file input
function previewImage() {
    const fileInput = document.getElementById('recipeImageFile');
    const preview = document.getElementById('imagePreview');
    const previewImg = document.getElementById('previewImg');
    const previewText = document.getElementById('previewText');
    const recipeImageInput = document.getElementById('recipeImage');
    
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            previewImg.src = e.target.result;
            previewText.textContent = `Selected: ${fileInput.files[0].name}`;
            preview.style.display = 'block';
            // Store the data URL in the hidden input
            recipeImageInput.value = e.target.result;
        };
        
        reader.readAsDataURL(fileInput.files[0]);
    }
}

// Print recipe
function printRecipe() {
    const modalTitle = document.getElementById('modalTitle').textContent;
    const printWindow = window.open('', '', 'height=600,width=800');
    
    const ingredients = Array.from(document.querySelectorAll('#modalIngredients li'))
        .map(li => li.textContent)
        .join('\n');
    
    const instructions = Array.from(document.querySelectorAll('#modalInstructions li'))
        .map(li => li.textContent)
        .join('\n');
    
    const tips = document.getElementById('modalTips').textContent;
    
    const content = `
        <html>
            <head>
                <title>${modalTitle}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px; }
                    h2 { color: #666; margin-top: 20px; }
                    pre { white-space: pre-wrap; word-wrap: break-word; }
                </style>
            </head>
            <body>
                <h1>${modalTitle}</h1>
                <h2>Ingredients:</h2>
                <pre>${ingredients}</pre>
                <h2>Instructions:</h2>
                <pre>${instructions}</pre>
                <h2>Chef's Tips:</h2>
                <pre>${tips}</pre>
            </body>
        </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
}

// Image browser functions
function openImageBrowser() {
    const modal = document.getElementById('imageBrowserModal');
    if (modal) {
        loadAvailableImages();
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
    }
}

function closeImageBrowser() {
    const modal = document.getElementById('imageBrowserModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

function loadAvailableImages() {
    const gallery = document.getElementById('imageBrowserGallery');
    if (!gallery) return;
    
    gallery.innerHTML = '';
    
    // List of available images from the assets/img folder
    const imageNames = [
        'banana custard.jpeg',
        'banana smoothie.jpeg',
        'black tea.jpeg',
        'brown betty.jpeg',
        'chocolate-lava-cake.svg',
        'coffee.jpeg',
        'coleslaw salad.jpeg',
        'cornflour mould.jpeg',
        'crunchy sausage salad.jpeg',
        'date banana cake.jpeg',
        'egg flip.jpeg',
        'fresh fruit salad.jpeg',
        'ginger bread.jpeg',
        'grilled-salmon.svg',
        'lemon surprise pudding.jpeg',
        'liver pillaf.jpeg',
        'macaroni cheese.jpeg',
        'margherita-pizza.svg',
        'minestrone soup.jpeg',
        'mixed salad.jpeg',
        'orange cup cakes.jpeg',
        'orangeade.jpeg',
        'peanut soup.jpeg',
        'potato salad.jpeg',
        'rock cakes.jpg',
        'savoury macaroni.jpeg',
        'shepherds pie.jpeg',
        'spaghetti bolognese.jpeg',
        'stuffed peppers.jpeg',
        'tea scones.jpeg',
        'tomato and onion salad.jpeg',
        'tomato soup.jpeg',
        'waldorf salad.jpg'
    ];
    
    imageNames.forEach(imageName => {
        const img = document.createElement('div');
        img.style.cssText = `
            cursor: pointer;
            border: 2px solid #e0e0e0;
            border-radius: 4px;
            padding: 5px;
            transition: border-color 0.2s;
        `;
        img.onmouseover = () => img.style.borderColor = '#17a2b8';
        img.onmouseout = () => img.style.borderColor = '#e0e0e0';
        
        const imgElement = document.createElement('img');
        imgElement.src = `assets/img/${imageName}`;
        imgElement.style.cssText = `width: 100%; height: 120px; object-fit: cover; border-radius: 3px;`;
        imgElement.onerror = () => {
            imgElement.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%23f0f0f0" width="100" height="100"/%3E%3C/svg%3E';
        };
        
        const label = document.createElement('p');
        label.textContent = imageName;
        label.style.cssText = 'margin: 5px 0 0 0; font-size: 12px; text-align: center; overflow: hidden; text-overflow: ellipsis;';
        
        img.appendChild(imgElement);
        img.appendChild(label);
        
        img.addEventListener('click', () => {
            document.getElementById('recipeImage').value = `assets/img/${imageName}`;
            closeImageBrowser();
            showToast('Image selected', 'success');
        });
        
        gallery.appendChild(img);
    });
}

// Recipe scaling functions
let originalServings = 1;

function setStudentCount(count) {
    document.getElementById('studentCount').value = count;
    scaleRecipe();
}

function adjustStudentCount(delta) {
    const input = document.getElementById('studentCount');
    const newValue = Math.max(1, Math.min(100, parseInt(input.value) + delta));
    input.value = newValue;
    scaleRecipe();
}

function scaleRecipe() {
    const studentCount = parseInt(document.getElementById('studentCount').value) || 1;
    const scaleFactor = studentCount;
    
    document.getElementById('scaleFactor').textContent = `${scaleFactor}x`;
    document.getElementById('totalServings').textContent = originalServings * scaleFactor;
    
    // Scale ingredients
    const ingredients = document.querySelectorAll('#modalIngredients li');
    ingredients.forEach(ingredient => {
        const text = ingredient.getAttribute('data-original') || ingredient.textContent;
        ingredient.setAttribute('data-original', text);
        
        // Try to scale numbers in the ingredient
        const scaled = text.replace(/(\d+(?:\.\d+)?)/g, (match) => {
            return (parseFloat(match) * scaleFactor).toFixed(2).replace(/\.?0+$/, '');
        });
        ingredient.textContent = scaled;
    });
}

function resetToOriginal() {
    document.getElementById('studentCount').value = 1;
    document.getElementById('scaleFactor').textContent = '1x';
    document.getElementById('totalServings').textContent = originalServings;
    
    // Reset ingredients to original
    const ingredients = document.querySelectorAll('#modalIngredients li');
    ingredients.forEach(ingredient => {
        const original = ingredient.getAttribute('data-original');
        if (original) {
            ingredient.textContent = original;
        }
    });
}

// Show toast notification
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }
    
    // Create toast element
    const toast = document.createElement('div');
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    
    toast.style.cssText = `
        background-color: ${colors[type] || colors.info};
        color: white;
        padding: 15px 20px;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        min-width: 250px;
        animation: slideIn 0.3s ease-out;
    `;
    
    toast.textContent = message;
    toastContainer.appendChild(toast);
    
    // Add animation
    const style = document.createElement('style');
    if (!document.querySelector('style[data-toast-animation]')) {
        style.setAttribute('data-toast-animation', 'true');
        style.textContent = `
            @keyframes slideIn {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOut {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // Remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize recipe combiner when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Initialize recipe page (set up buttons and display recipes)
    initializeRecipePage();

    // Initialize combiner after database is ready
    if (typeof recipeDB !== 'undefined' && recipeDB) {
        initializeRecipeCombiner();
    } else {
        // Wait for database to be initialized
        const checkDb = setInterval(() => {
            if (typeof recipeDB !== 'undefined' && recipeDB) {
                initializeRecipeCombiner();
                clearInterval(checkDb);
            }
        }, 100);
    }
});

// Cleanup function to remove the three hardcoded recipes from IndexedDB
async function removeHardcodedRecipes() {
    try {
        if (typeof recipeDB === 'undefined' || !recipeDB) {
            console.error('❌ Database not initialized');
            return;
        }

        // Recipes to remove by title
        const recipesToRemove = [
            'Molten Chocolate Lava Cake',
            'Herb-Crusted Grilled Salmon',
            'Classic Margherita Pizza'
        ];

        // Get all recipes
        const allRecipes = await recipeDB.getAllRecipes();
        console.log(`📋 Total recipes in database: ${allRecipes.length}`);

        // Find and delete matching recipes
        let deletedCount = 0;
        for (const recipe of allRecipes) {
            if (recipesToRemove.includes(recipe.title)) {
                await recipeDB.deleteRecipe(recipe.id);
                console.log(`✅ Deleted: "${recipe.title}" (ID: ${recipe.id})`);
                deletedCount++;
            }
        }

        if (deletedCount > 0) {
            console.log(`\n✨ Successfully removed ${deletedCount} recipe(s) from the database!`);
            console.log('🔄 Please refresh the page to see the changes.');
            return true;
        } else {
            console.log('ℹ️ None of the target recipes were found in the database.');
            console.log('Available recipes:');
            allRecipes.forEach(r => console.log(`  • ${r.title}`));
            return false;
        }
    } catch (error) {
        console.error('❌ Error removing recipes:', error);
        return false;
    }
}