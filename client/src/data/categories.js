// Category structure: Main categories with subcategories
export const MAIN_CATEGORIES = {
  Food: {
    name: "Food",
    subcategories: ["Snacks", "Pickles", "Spices", "Powders", "Cakes"]
  },
  Crafts: {
    name: "Crafts",
    subcategories: ["Decor", "Cards", "Hangings"]
  }
};

// All subcategories flattened for easy access
export const ALL_SUBCATEGORIES = [
  ...MAIN_CATEGORIES.Food.subcategories,
  ...MAIN_CATEGORIES.Crafts.subcategories
];

// Legacy categories (for backward compatibility)
export const LEGACY_CATEGORIES = [
  "All",
  "Snacks",
  "Cakes",
  "Pickles",
  "Powders",
  "Spices",
];

// Get subcategories for a main category
export const getSubcategories = (mainCategory) => {
  return MAIN_CATEGORIES[mainCategory]?.subcategories || [];
};

// Check if a category is valid
export const isValidMainCategory = (category) => {
  return Object.keys(MAIN_CATEGORIES).includes(category);
};

export const isValidSubCategory = (mainCategory, subCategory) => {
  return getSubcategories(mainCategory).includes(subCategory);
};













