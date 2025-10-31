// Recipe Database Management using IndexedDB
class RecipeDatabase {
    constructor() {
        this.dbName = 'RecipeManagerDB';
        this.dbVersion = 1;
        this.db = null;
        this.storeName = 'recipes';
    }

    // Initialize the database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => {
                console.error('Database failed to open');
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                console.log('Database opened successfully');
                resolve(this.db);
            };

            request.onupgradeneeded = (e) => {
                this.db = e.target.result;
                console.log('Database upgrade needed');

                // Create object store if it doesn't exist
                if (!this.db.objectStoreNames.contains(this.storeName)) {
                    const objectStore = this.db.createObjectStore(this.storeName, {
                        keyPath: 'id',
                        autoIncrement: false
                    });

                    // Create indexes for searching
                    objectStore.createIndex('title', 'title', { unique: false });
                    objectStore.createIndex('category', 'category', { unique: false });
                    objectStore.createIndex('difficulty', 'difficulty', { unique: false });
                    objectStore.createIndex('dateCreated', 'dateCreated', { unique: false });
                    objectStore.createIndex('dateModified', 'dateModified', { unique: false });

                    console.log('Object store created');
                }
            };
        });
    }

    // Add a new recipe to the database
    async addRecipe(recipe) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            // Add metadata
            const recipeWithMetadata = {
                ...recipe,
                id: recipe.id || this.generateRecipeId(recipe.title),
                dateCreated: new Date().toISOString(),
                dateModified: new Date().toISOString(),
                version: 1
            };

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.add(recipeWithMetadata);

            request.onsuccess = () => {
                console.log('Recipe added to database:', recipeWithMetadata.title);
                resolve(recipeWithMetadata);
            };

            request.onerror = () => {
                console.error('Failed to add recipe:', request.error);
                reject(request.error);
            };

            transaction.onerror = () => {
                console.error('Transaction failed:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    // Update an existing recipe
    async updateRecipe(recipe) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            // Update metadata
            const updatedRecipe = {
                ...recipe,
                dateModified: new Date().toISOString(),
                version: (recipe.version || 1) + 1
            };

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.put(updatedRecipe);

            request.onsuccess = () => {
                console.log('Recipe updated in database:', updatedRecipe.title);
                resolve(updatedRecipe);
            };

            request.onerror = () => {
                console.error('Failed to update recipe:', request.error);
                reject(request.error);
            };

            transaction.onerror = () => {
                console.error('Transaction failed:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    // Get a recipe by ID
    async getRecipe(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.get(id);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to get recipe:', request.error);
                reject(request.error);
            };
        });
    }

    // Get all recipes
    async getAllRecipes() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to get all recipes:', request.error);
                reject(request.error);
            };
        });
    }

    // Delete a recipe by ID
    async deleteRecipe(id) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.delete(id);

            request.onsuccess = () => {
                console.log('Recipe deleted from database:', id);
                resolve(true);
            };

            request.onerror = () => {
                console.error('Failed to delete recipe:', request.error);
                reject(request.error);
            };

            transaction.onerror = () => {
                console.error('Transaction failed:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    // Generate unique recipe ID from title and timestamp
    generateRecipeId(title) {
        const sanitizedTitle = title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 30);
        const timestamp = Date.now();
        return `${sanitizedTitle}-${timestamp}`;
    }

    // Search recipes by title
    async searchRecipesByTitle(searchTerm) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('title');
            const request = index.getAll();

            request.onsuccess = () => {
                const results = request.result.filter(recipe => 
                    recipe.title.toLowerCase().includes(searchTerm.toLowerCase())
                );
                resolve(results);
            };

            request.onerror = () => {
                console.error('Failed to search recipes:', request.error);
                reject(request.error);
            };
        });
    }

    // Get recipes by category
    async getRecipesByCategory(category) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('category');
            const request = index.getAll(category);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to get recipes by category:', request.error);
                reject(request.error);
            };
        });
    }

    // Get recipes by difficulty
    async getRecipesByDifficulty(difficulty) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const index = objectStore.index('difficulty');
            const request = index.getAll(difficulty);

            request.onsuccess = () => {
                resolve(request.result);
            };

            request.onerror = () => {
                console.error('Failed to get recipes by difficulty:', request.error);
                reject(request.error);
            };
        });
    }

    // Get database statistics
    async getStats() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readonly');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.getAll();

            request.onsuccess = () => {
                const recipes = request.result;
                const stats = {
                    totalRecipes: recipes.length,
                    categories: {},
                    recentlyAdded: recipes
                        .sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated))
                        .slice(0, 5),
                    recentlyModified: recipes
                        .sort((a, b) => new Date(b.dateModified) - new Date(a.dateModified))
                        .slice(0, 5)
                };

                // Count by category
                recipes.forEach(recipe => {
                    stats.categories[recipe.category] = (stats.categories[recipe.category] || 0) + 1;
                });

                resolve(stats);
            };

            request.onerror = () => {
                console.error('Failed to get stats:', request.error);
                reject(request.error);
            };
        });
    }

    // Import default recipes (for initial setup)
    async importDefaultRecipes(defaultRecipes) {
        const promises = [];
        
        for (const [id, recipe] of Object.entries(defaultRecipes)) {
            const recipeWithId = { ...recipe, id };
            promises.push(this.addRecipe(recipeWithId).catch(error => {
                // Recipe might already exist, try to update instead
                if (error.name === 'ConstraintError') {
                    return this.updateRecipe(recipeWithId);
                }
                throw error;
            }));
        }

        try {
            const results = await Promise.allSettled(promises);
            const successful = results.filter(result => result.status === 'fulfilled').length;
            const failed = results.filter(result => result.status === 'rejected').length;
            
            console.log(`Import completed: ${successful} successful, ${failed} failed`);
            return { successful, failed, total: promises.length };
        } catch (error) {
            console.error('Import failed:', error);
            throw error;
        }
    }

    // Export all recipes (for backup)
    async exportAllRecipes() {
        try {
            const recipes = await this.getAllRecipes();
            const exportData = {
                exportDate: new Date().toISOString(),
                version: this.dbVersion,
                totalRecipes: recipes.length,
                recipes: recipes
            };
            
            return exportData;
        } catch (error) {
            console.error('Export failed:', error);
            throw error;
        }
    }

    // Clear all recipes (for reset)
    async clearAllRecipes() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }

            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const objectStore = transaction.objectStore(this.storeName);
            const request = objectStore.clear();

            request.onsuccess = () => {
                console.log('All recipes cleared from database');
                resolve(true);
            };

            request.onerror = () => {
                console.error('Failed to clear recipes:', request.error);
                reject(request.error);
            };

            transaction.onerror = () => {
                console.error('Transaction failed:', transaction.error);
                reject(transaction.error);
            };
        });
    }

    // Generate a unique recipe ID from title
    generateRecipeId(title) {
        return title
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '-')
            .substring(0, 50) + '-' + Date.now();
    }

    // Check if database is supported
    static isSupported() {
        return 'indexedDB' in window;
    }

    // Get database size (approximate)
    async getDatabaseSize() {
        if ('storage' in navigator && 'estimate' in navigator.storage) {
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage,
                    available: estimate.quota,
                    usedMB: Math.round(estimate.usage / 1024 / 1024 * 100) / 100,
                    availableMB: Math.round(estimate.quota / 1024 / 1024 * 100) / 100
                };
            } catch (error) {
                console.warn('Could not estimate storage:', error);
                return null;
            }
        }
        return null;
    }
}

// Create global database instance
const recipeDB = new RecipeDatabase();

// Initialize database when script loads
document.addEventListener('DOMContentLoaded', async () => {
    if (RecipeDatabase.isSupported()) {
        try {
            await recipeDB.init();
            console.log('Recipe database initialized successfully');
        } catch (error) {
            console.error('Failed to initialize database:', error);
            // Fallback to in-memory storage
            console.log('Falling back to in-memory storage');
        }
    } else {
        console.warn('IndexedDB not supported, using in-memory storage');
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RecipeDatabase, recipeDB };
}