// Recipe Combiner Module - Combine multiple recipes and generate consolidated ingredient lists
class RecipeCombiner {
    constructor(database) {
        this.database = database;
        this.selectedRecipes = new Map(); // Map of recipeId -> { recipe, multiplier }
        this.consolidatedIngredients = new Map(); // Map of ingredient key -> consolidated data
    }

    // Add a recipe to the combination with optional multiplier
    async addRecipe(recipeId, multiplier = 1) {
        try {
            const recipe = await this.database.getRecipe(recipeId);
            if (!recipe) {
                throw new Error(`Recipe with ID ${recipeId} not found`);
            }

            this.selectedRecipes.set(recipeId, {
                recipe: recipe,
                multiplier: multiplier
            });

            this.updateConsolidatedIngredients();
            return true;
        } catch (error) {
            console.error('Error adding recipe to combination:', error);
            throw error;
        }
    }

    // Remove a recipe from the combination
    removeRecipe(recipeId) {
        const removed = this.selectedRecipes.delete(recipeId);
        if (removed) {
            this.updateConsolidatedIngredients();
        }
        return removed;
    }

    // Update the multiplier for a recipe
    updateRecipeMultiplier(recipeId, multiplier) {
        const recipeData = this.selectedRecipes.get(recipeId);
        if (recipeData) {
            recipeData.multiplier = multiplier;
            this.updateConsolidatedIngredients();
            return true;
        }
        return false;
    }

    // Get all selected recipes
    getSelectedRecipes() {
        return Array.from(this.selectedRecipes.entries()).map(([id, data]) => ({
            id,
            title: data.recipe.title,
            multiplier: data.multiplier,
            originalServings: data.recipe.servings,
            adjustedServings: parseInt(data.recipe.servings) * data.multiplier
        }));
    }

    // Parse ingredient string into components
    parseIngredient(ingredientString) {
        // Enhanced regex patterns for better ingredient parsing
        const patterns = [
            // Pattern for "2 1/2 cups flour" or "1.5 tbsp oil"
            /^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s+(\w+(?:\s+\w+)*?)\s+(.+)/,
            // Pattern for "2 eggs" (no unit)
            /^(\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?)\s+(.+)/,
            // Fallback for ingredients without quantities
            /^(.+)/
        ];

        for (let pattern of patterns) {
            const match = ingredientString.trim().match(pattern);
            if (match) {
                if (match.length >= 4) {
                    // Has quantity, unit, and ingredient
                    const quantity = this.parseQuantity(match[1]);
                    return {
                        quantity: quantity,
                        unit: match[2].toLowerCase(),
                        ingredient: match[3].toLowerCase().trim(),
                        original: ingredientString,
                        hasQuantity: true
                    };
                } else if (match.length === 3 && this.hasNumericQuantity(match[1])) {
                    // Has quantity and ingredient, no unit
                    const quantity = this.parseQuantity(match[1]);
                    return {
                        quantity: quantity,
                        unit: '',
                        ingredient: match[2].toLowerCase().trim(),
                        original: ingredientString,
                        hasQuantity: true
                    };
                }
            }
        }

        // No quantity found
        return {
            quantity: 0,
            unit: '',
            ingredient: ingredientString.toLowerCase().trim(),
            original: ingredientString,
            hasQuantity: false
        };
    }

    // Parse quantity string (handles fractions and decimals)
    parseQuantity(quantityStr) {
        quantityStr = quantityStr.trim();
        
        // Handle mixed numbers like "2 1/2"
        const mixedMatch = quantityStr.match(/^(\d+)\s+(\d+)\/(\d+)$/);
        if (mixedMatch) {
            const whole = parseInt(mixedMatch[1]);
            const numerator = parseInt(mixedMatch[2]);
            const denominator = parseInt(mixedMatch[3]);
            return whole + (numerator / denominator);
        }

        // Handle simple fractions like "1/2"
        const fractionMatch = quantityStr.match(/^(\d+)\/(\d+)$/);
        if (fractionMatch) {
            return parseInt(fractionMatch[1]) / parseInt(fractionMatch[2]);
        }

        // Handle decimals and whole numbers
        const number = parseFloat(quantityStr);
        return isNaN(number) ? 0 : number;
    }

    // Check if string contains numeric quantity
    hasNumericQuantity(str) {
        return /\d/.test(str);
    }

    // Create a unique key for ingredient consolidation
    createIngredientKey(parsedIngredient) {
        // Normalize ingredient name for better matching
        let ingredient = parsedIngredient.ingredient
            .replace(/\s*,.*$/, '') // Remove everything after comma
            .replace(/\s*\(.*?\)/g, '') // Remove parenthetical notes
            .trim();

        // Normalize unit
        let unit = this.normalizeUnit(parsedIngredient.unit);

        return `${ingredient}|${unit}`;
    }

    // Normalize units for better consolidation
    normalizeUnit(unit) {
        const unitMap = {
            // Volume
            'cup': 'cup', 'cups': 'cup', 'c': 'cup',
            'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbsp': 'tbsp', 'tbs': 'tbsp',
            'teaspoon': 'tsp', 'teaspoons': 'tsp', 'tsp': 'tsp',
            'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', 'fl oz': 'fl oz',
            'pint': 'pint', 'pints': 'pint', 'pt': 'pint',
            'quart': 'quart', 'quarts': 'quart', 'qt': 'quart',
            'gallon': 'gallon', 'gallons': 'gallon', 'gal': 'gallon',
            'liter': 'liter', 'liters': 'liter', 'l': 'liter',
            'milliliter': 'ml', 'milliliters': 'ml', 'ml': 'ml',

            // Weight
            'pound': 'lb', 'pounds': 'lb', 'lb': 'lb', 'lbs': 'lb',
            'ounce': 'oz', 'ounces': 'oz', 'oz': 'oz',
            'gram': 'g', 'grams': 'g', 'g': 'g',
            'kilogram': 'kg', 'kilograms': 'kg', 'kg': 'kg',

            // Count
            'piece': 'piece', 'pieces': 'piece',
            'slice': 'slice', 'slices': 'slice',
            'clove': 'clove', 'cloves': 'clove',
            'head': 'head', 'heads': 'head',
            'bunch': 'bunch', 'bunches': 'bunch',
            'package': 'package', 'packages': 'package', 'pkg': 'package',
            'can': 'can', 'cans': 'can',
            'jar': 'jar', 'jars': 'jar',
            'bottle': 'bottle', 'bottles': 'bottle'
        };

        return unitMap[unit.toLowerCase()] || unit.toLowerCase();
    }

    // Update consolidated ingredients based on selected recipes
    updateConsolidatedIngredients() {
        this.consolidatedIngredients.clear();

        for (const [recipeId, recipeData] of this.selectedRecipes) {
            const { recipe, multiplier } = recipeData;
            
            for (const ingredientString of recipe.ingredients) {
                const parsed = this.parseIngredient(ingredientString);
                const key = this.createIngredientKey(parsed);
                
                if (this.consolidatedIngredients.has(key)) {
                    // Add to existing ingredient
                    const existing = this.consolidatedIngredients.get(key);
                    if (parsed.hasQuantity && existing.hasQuantity) {
                        existing.totalQuantity += parsed.quantity * multiplier;
                        existing.sources.push({
                            recipeTitle: recipe.title,
                            originalQuantity: parsed.quantity,
                            multiplier: multiplier,
                            adjustedQuantity: parsed.quantity * multiplier
                        });
                    } else {
                        // Handle non-quantified ingredients
                        existing.sources.push({
                            recipeTitle: recipe.title,
                            originalQuantity: parsed.quantity,
                            multiplier: multiplier,
                            adjustedQuantity: parsed.quantity * multiplier
                        });
                    }
                } else {
                    // Create new consolidated ingredient
                    this.consolidatedIngredients.set(key, {
                        ingredient: parsed.ingredient,
                        unit: parsed.unit,
                        totalQuantity: parsed.hasQuantity ? parsed.quantity * multiplier : 0,
                        hasQuantity: parsed.hasQuantity,
                        sources: [{
                            recipeTitle: recipe.title,
                            originalQuantity: parsed.quantity,
                            multiplier: multiplier,
                            adjustedQuantity: parsed.quantity * multiplier
                        }]
                    });
                }
            }
        }
    }

    // Get consolidated ingredients list
    getConsolidatedIngredients() {
        const ingredients = Array.from(this.consolidatedIngredients.values());
        
        // Sort ingredients: quantified first, then alphabetically
        return ingredients.sort((a, b) => {
            if (a.hasQuantity && !b.hasQuantity) return -1;
            if (!a.hasQuantity && b.hasQuantity) return 1;
            return a.ingredient.localeCompare(b.ingredient);
        });
    }

    // Format quantity for display
    formatQuantity(quantity) {
        if (quantity === 0) return '';
        
        // Convert to fraction if it's a common fraction
        const fractions = {
            0.125: '1/8',
            0.25: '1/4',
            0.333: '1/3',
            0.5: '1/2',
            0.667: '2/3',
            0.75: '3/4'
        };

        // Check for exact fraction matches
        for (const [decimal, fraction] of Object.entries(fractions)) {
            if (Math.abs(quantity - decimal) < 0.01) {
                return fraction;
            }
        }

        // Check for mixed numbers
        const whole = Math.floor(quantity);
        const remainder = quantity - whole;
        
        if (whole > 0 && remainder > 0) {
            for (const [decimal, fraction] of Object.entries(fractions)) {
                if (Math.abs(remainder - decimal) < 0.01) {
                    return `${whole} ${fraction}`;
                }
            }
        }

        // Return decimal with appropriate precision
        if (quantity % 1 === 0) {
            return quantity.toString();
        } else {
            return quantity.toFixed(2).replace(/\.?0+$/, '');
        }
    }

    // Generate shopping list text
    generateShoppingList() {
        const ingredients = this.getConsolidatedIngredients();
        const selectedRecipes = this.getSelectedRecipes();
        
        let shoppingList = '🛒 SHOPPING LIST\n';
        shoppingList += '═'.repeat(50) + '\n\n';
        
        // Add recipe summary
        shoppingList += '📋 RECIPES INCLUDED:\n';
        for (const recipe of selectedRecipes) {
            shoppingList += `• ${recipe.title}`;
            if (recipe.multiplier !== 1) {
                shoppingList += ` (×${recipe.multiplier})`;
            }
            shoppingList += ` - ${recipe.adjustedServings} servings\n`;
        }
        shoppingList += '\n';

        // Group ingredients by category (rough categorization)
        const categories = {
            'Produce': [],
            'Meat & Seafood': [],
            'Dairy & Eggs': [],
            'Pantry & Dry Goods': [],
            'Spices & Seasonings': [],
            'Other': []
        };

        for (const ingredient of ingredients) {
            const category = this.categorizeIngredient(ingredient.ingredient);
            const quantityStr = ingredient.hasQuantity ? 
                `${this.formatQuantity(ingredient.totalQuantity)} ${ingredient.unit}`.trim() : '';
            
            const listItem = quantityStr ? 
                `${quantityStr} ${ingredient.ingredient}` : 
                ingredient.ingredient;
                
            categories[category].push(listItem);
        }

        // Add categorized ingredients to shopping list
        for (const [category, items] of Object.entries(categories)) {
            if (items.length > 0) {
                shoppingList += `\n${category.toUpperCase()}:\n`;
                shoppingList += '─'.repeat(category.length + 1) + '\n';
                for (const item of items) {
                    shoppingList += `☐ ${item}\n`;
                }
            }
        }

        shoppingList += '\n' + '═'.repeat(50) + '\n';
        shoppingList += `Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}\n`;
        shoppingList += `Total recipes: ${selectedRecipes.length} | Total ingredients: ${ingredients.length}`;

        return shoppingList;
    }

    // Simple ingredient categorization
    categorizeIngredient(ingredient) {
        const produce = ['tomato', 'onion', 'garlic', 'basil', 'parsley', 'dill', 'chives', 'lemon', 'lime', 'carrot', 'celery', 'potato', 'lettuce', 'spinach', 'bell pepper', 'mushroom', 'avocado', 'cucumber', 'berries', 'apple', 'banana'];
        const meat = ['chicken', 'beef', 'pork', 'salmon', 'fish', 'turkey', 'lamb', 'shrimp', 'crab', 'lobster'];
        const dairy = ['milk', 'cream', 'butter', 'cheese', 'mozzarella', 'parmesan', 'cheddar', 'yogurt', 'sour cream', 'egg'];
        const spices = ['salt', 'pepper', 'oregano', 'thyme', 'rosemary', 'paprika', 'cumin', 'cinnamon', 'vanilla', 'mustard'];

        const lowerIngredient = ingredient.toLowerCase();
        
        if (produce.some(item => lowerIngredient.includes(item))) return 'Produce';
        if (meat.some(item => lowerIngredient.includes(item))) return 'Meat & Seafood';
        if (dairy.some(item => lowerIngredient.includes(item))) return 'Dairy & Eggs';
        if (spices.some(item => lowerIngredient.includes(item))) return 'Spices & Seasonings';
        if (lowerIngredient.includes('flour') || lowerIngredient.includes('sugar') || lowerIngredient.includes('oil') || lowerIngredient.includes('vinegar')) return 'Pantry & Dry Goods';
        
        return 'Other';
    }

    // Generate detailed ingredient breakdown
    generateDetailedBreakdown() {
        const ingredients = this.getConsolidatedIngredients();
        
        let breakdown = '📊 DETAILED INGREDIENT BREAKDOWN\n';
        breakdown += '═'.repeat(60) + '\n\n';
        
        for (const ingredient of ingredients) {
            breakdown += `🔸 ${ingredient.ingredient.toUpperCase()}\n`;
            
            if (ingredient.hasQuantity) {
                breakdown += `   Total needed: ${this.formatQuantity(ingredient.totalQuantity)} ${ingredient.unit}\n`;
            }
            
            breakdown += '   Used in:\n';
            for (const source of ingredient.sources) {
                if (ingredient.hasQuantity) {
                    breakdown += `   • ${source.recipeTitle}: ${this.formatQuantity(source.originalQuantity)} ${ingredient.unit}`;
                    if (source.multiplier !== 1) {
                        breakdown += ` × ${source.multiplier} = ${this.formatQuantity(source.adjustedQuantity)} ${ingredient.unit}`;
                    }
                    breakdown += '\n';
                } else {
                    breakdown += `   • ${source.recipeTitle}\n`;
                }
            }
            breakdown += '\n';
        }
        
        return breakdown;
    }

    // Clear all selected recipes
    clear() {
        this.selectedRecipes.clear();
        this.consolidatedIngredients.clear();
    }

    // Get summary statistics
    getSummary() {
        const selectedRecipes = this.getSelectedRecipes();
        const ingredients = this.getConsolidatedIngredients();
        
        const totalServings = selectedRecipes.reduce((sum, recipe) => sum + recipe.adjustedServings, 0);
        const quantifiedIngredients = ingredients.filter(ing => ing.hasQuantity).length;
        const nonQuantifiedIngredients = ingredients.filter(ing => !ing.hasQuantity).length;
        
        return {
            totalRecipes: selectedRecipes.length,
            totalServings: totalServings,
            totalIngredients: ingredients.length,
            quantifiedIngredients: quantifiedIngredients,
            nonQuantifiedIngredients: nonQuantifiedIngredients,
            recipes: selectedRecipes
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = RecipeCombiner;
}