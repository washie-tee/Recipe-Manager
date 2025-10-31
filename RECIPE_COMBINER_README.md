# Recipe Combiner Module

A comprehensive module for combining multiple recipes and generating consolidated ingredient shopping lists.

## 🌟 Features

### Core Functionality
- **Multi-Recipe Selection**: Choose multiple recipes from your database
- **Recipe Scaling**: Adjust serving sizes with multipliers (0.1x to 10x+)
- **Smart Ingredient Consolidation**: Automatically combines similar ingredients
- **Unit Normalization**: Handles various units (cups, tbsp, tsp, oz, lb, etc.)
- **Categorized Shopping Lists**: Organizes ingredients by category
- **Print & Export**: Generate printable lists or export as text files

### Advanced Features
- **Intelligent Parsing**: Handles fractions (1/2, 2 1/4), decimals, and mixed numbers
- **Unit Conversion**: Normalizes similar units (tablespoon → tbsp, cups → cup)
- **Real-time Updates**: Shopping list updates as you modify selections
- **Search & Filter**: Find recipes quickly when adding to combinations
- **Toast Notifications**: User-friendly feedback for all actions

## 📁 Files

- `recipe-combiner.js` - Core module with RecipeCombiner class
- `index.html` - Updated with combiner UI components
- `styles.css` - Updated with combiner-specific styles
- `script.js` - Updated with combiner integration functions
- `recipe-combiner-demo.html` - Demo page showcasing features
- `RECIPE_COMBINER_README.md` - This documentation file

## 🚀 Usage

### Basic Usage
1. Click the "🛒 Combine Recipes" button in the main interface
2. Search and select recipes from the left panel
3. Adjust serving multipliers as needed
4. Click "📝 Generate List" to create your shopping list
5. Use "🖨️ Print" or "💾 Export" to save your list

### Advanced Usage
```javascript
// Initialize the combiner
const combiner = new RecipeCombiner(database);

// Add recipes with multipliers
await combiner.addRecipe('recipe-id-1', 2);    // 2x servings
await combiner.addRecipe('recipe-id-2', 0.5);  // Half servings

// Generate shopping list
const shoppingList = combiner.generateShoppingList();

// Get detailed breakdown
const breakdown = combiner.generateDetailedBreakdown();

// Get summary statistics
const summary = combiner.getSummary();
```

## 🔧 Technical Details

### Ingredient Parsing
The module uses sophisticated regex patterns to parse ingredient strings:

```javascript
// Examples of parsed ingredients:
"2 1/2 cups all-purpose flour" → {quantity: 2.5, unit: "cup", ingredient: "all-purpose flour"}
"1 tbsp olive oil" → {quantity: 1, unit: "tbsp", ingredient: "olive oil"}
"Salt and pepper to taste" → {quantity: 0, unit: "", ingredient: "salt and pepper to taste"}
```

### Unit Normalization
Common units are normalized for better consolidation:
- Volume: cup, tbsp, tsp, fl oz, pint, quart, gallon, liter, ml
- Weight: lb, oz, g, kg
- Count: piece, slice, clove, head, bunch, package, can, jar, bottle

### Ingredient Categorization
Ingredients are automatically categorized:
- **Produce**: Fresh fruits, vegetables, herbs
- **Meat & Seafood**: All proteins
- **Dairy & Eggs**: Milk products and eggs
- **Pantry & Dry Goods**: Flour, sugar, oils, vinegars
- **Spices & Seasonings**: Herbs, spices, seasonings
- **Other**: Everything else

## 📊 Shopping List Format

```
🛒 SHOPPING LIST
══════════════════════════════════════════════════

📋 RECIPES INCLUDED:
• Recipe Name 1 (×2) - 8 servings
• Recipe Name 2 - 4 servings

PRODUCE:
─────────
☐ 4 medium tomatoes
☐ 1/2 cup fresh basil leaves

DAIRY & EGGS:
─────────────
☐ 16 oz fresh mozzarella cheese

PANTRY & DRY GOODS:
──────────────────
☐ 4 cups all-purpose flour
☐ 6 tbsp olive oil

══════════════════════════════════════════════════
Generated on 1/20/2025 at 2:30:15 PM
Total recipes: 2 | Total ingredients: 15
```

## 🎨 UI Components

### Recipe Selection Panel
- Search functionality for finding recipes
- Recipe cards with title, category, servings, and difficulty
- One-click addition to combination

### Selected Recipes Panel
- List of chosen recipes with multiplier controls
- Remove buttons for each recipe
- Real-time serving calculations

### Shopping List Panel
- Summary statistics
- Generate, print, and export buttons
- Formatted shopping list display

## 🔄 API Reference

### RecipeCombiner Class

#### Constructor
```javascript
new RecipeCombiner(database)
```

#### Methods

**addRecipe(recipeId, multiplier)**
- Adds a recipe to the combination
- `recipeId`: String - Recipe identifier
- `multiplier`: Number - Serving multiplier (default: 1)

**removeRecipe(recipeId)**
- Removes a recipe from the combination
- `recipeId`: String - Recipe identifier

**updateRecipeMultiplier(recipeId, multiplier)**
- Updates the multiplier for a recipe
- `recipeId`: String - Recipe identifier
- `multiplier`: Number - New multiplier value

**getSelectedRecipes()**
- Returns array of selected recipes with metadata

**getConsolidatedIngredients()**
- Returns array of consolidated ingredients

**generateShoppingList()**
- Returns formatted shopping list string

**generateDetailedBreakdown()**
- Returns detailed ingredient breakdown

**getSummary()**
- Returns summary statistics

**clear()**
- Clears all selected recipes

## 🎯 Best Practices

### For Users
1. **Start Small**: Begin with 2-3 recipes to understand the system
2. **Check Units**: Verify that ingredient units make sense in the final list
3. **Use Multipliers**: Scale recipes up or down based on your needs
4. **Review Before Shopping**: Always review the generated list before shopping
5. **Export for Mobile**: Export lists as text files for easy mobile access

### For Developers
1. **Error Handling**: Always wrap combiner operations in try-catch blocks
2. **Input Validation**: Validate multipliers and recipe IDs before processing
3. **Performance**: Consider caching for large recipe collections
4. **Extensibility**: Use the modular design to add new features
5. **Testing**: Test with various ingredient formats and edge cases

## 🐛 Troubleshooting

### Common Issues

**Ingredients Not Combining**
- Check if units are similar (cup vs cups)
- Verify ingredient names are consistent
- Some ingredients may intentionally not combine (different preparations)

**Missing Recipes**
- Ensure recipes exist in the database
- Check recipe IDs are correct
- Verify database connection

**Parsing Issues**
- Complex ingredient descriptions may not parse perfectly
- Manual review of generated lists is recommended
- Report parsing issues for improvement

**Performance Issues**
- Large numbers of recipes may slow processing
- Consider pagination for recipe selection
- Clear unused combinations regularly

## 🔮 Future Enhancements

### Planned Features
- **Smart Substitutions**: Suggest ingredient substitutions
- **Nutritional Analysis**: Calculate combined nutritional information
- **Cost Estimation**: Estimate shopping costs
- **Meal Planning**: Integration with calendar/meal planning
- **Recipe Suggestions**: AI-powered recipe recommendations
- **Inventory Management**: Track what you already have

### Technical Improvements
- **Better Parsing**: Enhanced ingredient parsing with ML
- **Unit Conversion**: More comprehensive unit conversion system
- **Caching**: Improved performance with intelligent caching
- **Offline Support**: Work without internet connection
- **Mobile App**: Dedicated mobile application

## 📄 License

This module is part of the Recipe Manager system and follows the same licensing terms.

## 🤝 Contributing

To contribute to the Recipe Combiner module:

1. Test the current functionality thoroughly
2. Identify areas for improvement
3. Submit detailed bug reports or feature requests
4. Follow the existing code style and patterns
5. Add appropriate documentation for new features

## 📞 Support

For support with the Recipe Combiner module:
- Check this documentation first
- Review the demo page for examples
- Test with simple cases before complex ones
- Report issues with specific examples and steps to reproduce