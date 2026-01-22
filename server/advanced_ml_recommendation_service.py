#!/usr/bin/env python3
"""
Advanced Production-Grade ML Recommendation System
Similar to Amazon, Flipkart, Netflix recommendation engines

Features:
- Content-Based Filtering (TF-IDF + Advanced Features)
- Collaborative Filtering (User-based + Item-based)
- Matrix Factorization (SVD)
- Hybrid Recommendations
- User Behavior Tracking
- Personalization
- Cold Start Handling
- Performance Optimization (Caching)
- Category-Based Filtering
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity, euclidean_distances
from sklearn.preprocessing import MinMaxScaler
from scipy.sparse import csr_matrix
from scipy.sparse.linalg import svds
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime, timedelta
import logging
import hashlib
from collections import defaultdict
import pickle
import json

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/foodily-auth')
try:
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    products_collection = db['products']
    orders_collection = db['orders']
    users_collection = db['users']
    # New collections for advanced tracking
    user_interactions_collection = db['user_interactions']
    recommendation_cache_collection = db['recommendation_cache']
    logger.info("✅ Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"❌ MongoDB connection error: {e}")
    db = None

class AdvancedRecommendationEngine:
    def __init__(self):
        self.products_df = None
        self.user_product_matrix = None
        self.user_similarity_matrix = None
        self.item_similarity_matrix = None
        self.tfidf_matrix = None
        self.tfidf_vectorizer = None
        self.content_similarity_matrix = None
        self.svd_predictions = None
        
        # Caching
        self.recommendation_cache = {}
        self.cache_expiry = {}
        self.cache_ttl = timedelta(hours=2)
        
        # Last update tracking
        self.last_updated = None
        self.update_interval = timedelta(hours=1)
        
        # Performance metrics
        self.recommendation_stats = defaultdict(int)
        
    # ============================================
    # 1. DATA LOADING & PREPROCESSING
    # ============================================
    
    def load_products_from_db(self):
        """Load products from MongoDB with enhanced features"""
        try:
            products = list(products_collection.find({'isActive': {'$ne': False}}))
            
            if not products:
                logger.warning("No products found in database")
                return pd.DataFrame()
            
            df_data = []
            for p in products:
                # Get category
                category = p.get('category', {})
                if isinstance(category, dict):
                    category_name = category.get('name', category.get('title', 'unknown'))
                else:
                    category_name = str(category) if category else 'unknown'
                
                # Get price
                price = p.get('price', 0)
                if isinstance(p.get('variants'), list) and p['variants']:
                    prices = [float(v.get('price', 0)) for v in p['variants'] if v.get('price')]
                    if prices:
                        price = min(prices)
                
                # Extract features
                title = p.get('title', p.get('name', ''))
                description = p.get('description', '')
                main_ingredient = self._extract_main_ingredient(title, description)
                
                # Calculate popularity score
                popularity_score = self._calculate_popularity(str(p['_id']))
                
                # Get stock status
                stock = p.get('stock', 0)
                in_stock = stock > 0
                
                df_data.append({
                    'id': str(p['_id']),
                    'name': title,
                    'title': title,
                    'category': category_name.lower(),
                    'price': float(price) if price else 0,
                    'rating': float(p.get('rating', 4.0)),
                    'description': description,
                    'mainIngredient': main_ingredient,
                    'image': p.get('image', ''),
                    'stock': int(stock),
                    'in_stock': in_stock,
                    'popularity_score': popularity_score,
                    'created_at': p.get('createdAt', datetime.now()),
                    # Rich content for advanced NLP
                    'content': f"{title} {category_name} {description} {main_ingredient}".lower(),
                    # Feature vector for advanced similarity
                    'features': self._extract_advanced_features(p, category_name, main_ingredient)
                })
            
            self.products_df = pd.DataFrame(df_data)
            
            # Add normalized features
            self._normalize_features()
            
            logger.info(f"✅ Loaded {len(self.products_df)} products with advanced features")
            return self.products_df
            
        except Exception as e:
            logger.error(f"❌ Error loading products: {e}")
            return pd.DataFrame()
    
    def _extract_main_ingredient(self, title, description):
        """Extract main ingredient with NLP"""
        text = f"{title} {description}".lower()
        
        ingredients = [
            'rice', 'wheat', 'flour', 'dal', 'lentil', 'chickpea', 'moong', 'toor', 'chana',
            'spice', 'turmeric', 'cumin', 'coriander', 'chili', 'pepper', 'garam masala', 'clove', 'cinnamon',
            'oil', 'ghee', 'butter', 'coconut', 'olive',
            'jaggery', 'sugar', 'honey', 'molasses',
            'pickle', 'chutney', 'sauce', 'paste',
            'snack', 'chip', 'namkeen', 'mixture',
            'sweet', 'cake', 'cookie', 'biscuit', 'candy',
            'tea', 'coffee', 'beverage',
            'nut', 'almond', 'cashew', 'walnut', 'pistachio',
            'dried fruit', 'raisin', 'date', 'fig',
            'masala', 'seasoning', 'spice blend', 'powder'
        ]
        
        for ingredient in ingredients:
            if ingredient in text:
                return ingredient
        
        return title.split()[0].lower() if title else 'mixed'
    
    def _extract_advanced_features(self, product, category, ingredient):
        """Extract numerical features for advanced similarity"""
        return {
            'price_bracket': self._get_price_bracket(product.get('price', 0)),
            'rating_level': int(product.get('rating', 4.0)),
            'has_variants': 1 if product.get('variants') else 0,
            'stock_level': min(product.get('stock', 0), 100),  # Cap at 100
            'description_length': len(product.get('description', '')),
        }
    
    def _get_price_bracket(self, price):
        """Categorize price into brackets"""
        price = float(price) if price else 0
        if price < 100: return 1
        elif price < 200: return 2
        elif price < 300: return 3
        elif price < 500: return 4
        else: return 5
    
    def _calculate_popularity(self, product_id):
        """Calculate product popularity from orders and interactions"""
        try:
            # Count orders
            order_count = orders_collection.count_documents({
                'items.productId': product_id,
                'orderStatus': {'$in': ['delivered', 'processing', 'confirmed']}
            })
            
            # Count views (if tracked)
            view_count = user_interactions_collection.count_documents({
                'productId': product_id,
                'action': 'view'
            })
            
            # Count cart additions
            cart_count = user_interactions_collection.count_documents({
                'productId': product_id,
                'action': 'add_to_cart'
            })
            
            # Weighted popularity score
            popularity = (order_count * 5) + (cart_count * 2) + (view_count * 0.5)
            return popularity
            
        except Exception as e:
            return 0
    
    def _normalize_features(self):
        """Normalize numerical features for better comparison"""
        if self.products_df is None or len(self.products_df) == 0:
            return
        
        scaler = MinMaxScaler()
        self.products_df['normalized_price'] = scaler.fit_transform(
            self.products_df[['price']]
        )
        self.products_df['normalized_rating'] = scaler.fit_transform(
            self.products_df[['rating']]
        )
        self.products_df['normalized_popularity'] = scaler.fit_transform(
            self.products_df[['popularity_score']]
        )
    
    # ============================================
    # 2. CONTENT-BASED FILTERING (ADVANCED)
    # ============================================
    
    def build_content_features(self):
        """Build advanced content-based filtering features"""
        if self.products_df is None or len(self.products_df) == 0:
            return False
        
        try:
            # TF-IDF on content
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=200,
                stop_words='english',
                ngram_range=(1, 3),  # Trigrams for better context
                min_df=1,
                max_df=0.8
            )
            
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(
                self.products_df['content'].fillna('')
            )
            
            # Compute content similarity
            self.content_similarity_matrix = cosine_similarity(self.tfidf_matrix)
            
            self.last_updated = datetime.now()
            logger.info("✅ Advanced content features built successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error building content features: {e}")
            return False
    
    def content_based_recommendations(self, product_id, n=5, category_filter=True):
        """Advanced content-based recommendations with feature weighting"""
        try:
            if self.products_df is None or len(self.products_df) == 0:
                return []
            
            idx = self.products_df[self.products_df['id'] == product_id].index
            if len(idx) == 0:
                logger.warning(f"Product {product_id} not found")
                return []
            
            idx = idx[0]
            target_product = self.products_df.iloc[idx]
            target_category = target_product['category']
            
            # Filter by category if enabled
            if category_filter:
                candidate_mask = (
                    (self.products_df['category'] == target_category) & 
                    (self.products_df['id'] != product_id) &
                    (self.products_df['in_stock'] == True)  # Only in-stock items
                )
            else:
                candidate_mask = (
                    (self.products_df['id'] != product_id) &
                    (self.products_df['in_stock'] == True)
                )
            
            candidates = self.products_df[candidate_mask]
            
            if candidates.empty:
                return []
            
            # Calculate multi-faceted similarity
            candidate_indices = candidates.index.tolist()
            
            # 1. Content similarity (40%)
            content_scores = [self.content_similarity_matrix[idx][i] for i in candidate_indices]
            
            # 2. Price similarity (20%)
            price_scores = [
                1 - abs(target_product['normalized_price'] - candidates.iloc[i]['normalized_price'])
                for i in range(len(candidates))
            ]
            
            # 3. Rating similarity (15%)
            rating_scores = [
                1 - abs(target_product['normalized_rating'] - candidates.iloc[i]['normalized_rating'])
                for i in range(len(candidates))
            ]
            
            # 4. Popularity boost (15%)
            popularity_scores = [candidates.iloc[i]['normalized_popularity'] for i in range(len(candidates))]
            
            # 5. Ingredient match bonus (10%)
            ingredient_scores = [
                1.0 if candidates.iloc[i]['mainIngredient'] == target_product['mainIngredient'] else 0.5
                for i in range(len(candidates))
            ]
            
            # Weighted combination
            final_scores = [
                (content_scores[i] * 0.40) +
                (price_scores[i] * 0.20) +
                (rating_scores[i] * 0.15) +
                (popularity_scores[i] * 0.15) +
                (ingredient_scores[i] * 0.10)
                for i in range(len(candidates))
            ]
            
            # Get top recommendations
            top_indices = np.argsort(final_scores)[::-1][:n]
            
            recommendations = []
            for i in top_indices:
                rec = candidates.iloc[i].to_dict()
                rec['similarity_score'] = final_scores[i]
                rec['recommendation_reason'] = self._generate_reason(target_product, rec)
                recommendations.append(rec)
            
            logger.info(f"✅ Content-based: {len(recommendations)} recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Content-based error: {e}")
            return []
    
    def _generate_reason(self, target, recommended):
        """Generate human-readable recommendation reason"""
        reasons = []
        
        if recommended['mainIngredient'] == target['mainIngredient']:
            reasons.append(f"Same ingredient ({recommended['mainIngredient']})")
        
        price_diff_pct = abs(target['price'] - recommended['price']) / target['price'] * 100
        if price_diff_pct < 20:
            reasons.append("Similar price")
        
        if abs(target['rating'] - recommended['rating']) < 0.5:
            reasons.append("Similar rating")
        
        if recommended['popularity_score'] > 10:
            reasons.append("Popular choice")
        
        return ", ".join(reasons) if reasons else "Recommended for you"
    
    # ============================================
    # 3. COLLABORATIVE FILTERING (USER-BASED)
    # ============================================
    
    def build_user_item_matrix(self):
        """Build user-item interaction matrix"""
        try:
            # Get user interactions (orders + views + cart)
            interactions = []
            
            # From orders
            orders = list(orders_collection.find({
                'orderStatus': {'$in': ['delivered', 'processing', 'confirmed']}
            }))
            
            for order in orders:
                user_id = order.get('userId', 'anonymous')
                for item in order.get('items', []):
                    product_id = item.get('productId')
                    if isinstance(product_id, dict):
                        product_id = product_id.get('_id')
                    
                    interactions.append({
                        'userId': user_id,
                        'productId': str(product_id),
                        'rating': 5.0,  # Purchase = strong signal
                        'timestamp': order.get('createdAt', datetime.now())
                    })
            
            # From explicit interactions
            explicit_interactions = list(user_interactions_collection.find({}))
            for interaction in explicit_interactions:
                action_weights = {
                    'purchase': 5.0,
                    'add_to_cart': 3.0,
                    'add_to_wishlist': 2.0,
                    'view': 1.0
                }
                
                interactions.append({
                    'userId': interaction.get('userId', 'anonymous'),
                    'productId': interaction.get('productId'),
                    'rating': action_weights.get(interaction.get('action', 'view'), 1.0),
                    'timestamp': interaction.get('timestamp', datetime.now())
                })
            
            if not interactions:
                logger.warning("No user interactions found")
                return None
            
            # Create DataFrame
            interactions_df = pd.DataFrame(interactions)
            
            # Aggregate multiple interactions
            user_item_ratings = interactions_df.groupby(['userId', 'productId'])['rating'].sum().reset_index()
            
            # Create pivot table
            self.user_product_matrix = user_item_ratings.pivot(
                index='userId',
                columns='productId',
                values='rating'
            ).fillna(0)
            
            logger.info(f"✅ User-item matrix: {self.user_product_matrix.shape}")
            return self.user_product_matrix
            
        except Exception as e:
            logger.error(f"❌ Error building user-item matrix: {e}")
            return None
    
    def collaborative_recommendations(self, product_id, n=5, category_filter=True):
        """Item-based collaborative filtering"""
        try:
            if self.user_product_matrix is None:
                self.build_user_item_matrix()
            
            if self.user_product_matrix is None or self.user_product_matrix.empty:
                return []
            
            # Get target product category
            target_product = self.products_df[self.products_df['id'] == product_id]
            if target_product.empty:
                return []
            
            target_category = target_product.iloc[0]['category']
            
            # Check if product has interactions
            if product_id not in self.user_product_matrix.columns:
                logger.info(f"No interactions for product {product_id}")
                return []
            
            # Get users who interacted with this product
            product_interactions = self.user_product_matrix[product_id]
            users_who_liked = product_interactions[product_interactions > 0].index.tolist()
            
            if not users_who_liked:
                return []
            
            # Find other products these users liked
            similar_products = {}
            for user in users_who_liked:
                user_products = self.user_product_matrix.loc[user]
                user_products = user_products[user_products > 0]
                
                for pid, rating in user_products.items():
                    if pid != product_id:
                        if pid not in similar_products:
                            similar_products[pid] = 0
                        similar_products[pid] += rating
            
            # Filter by category if enabled
            if category_filter:
                similar_products = {
                    pid: score for pid, score in similar_products.items()
                    if not self.products_df[self.products_df['id'] == pid].empty and
                    self.products_df[self.products_df['id'] == pid].iloc[0]['category'] == target_category
                }
            
            # Sort and get top N
            top_products = sorted(similar_products.items(), key=lambda x: x[1], reverse=True)[:n]
            
            # Build recommendations
            recommendations = []
            for pid, score in top_products:
                product = self.products_df[self.products_df['id'] == pid]
                if not product.empty and product.iloc[0]['in_stock']:
                    rec = product.iloc[0].to_dict()
                    rec['collaborative_score'] = score
                    rec['recommendation_reason'] = "Customers who liked this also liked"
                    recommendations.append(rec)
            
            logger.info(f"✅ Collaborative: {len(recommendations)} recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Collaborative filtering error: {e}")
            return []
    
    # ============================================
    # 4. MATRIX FACTORIZATION (SVD)
    # ============================================
    
    def matrix_factorization_recommendations(self, product_id, n=5, category_filter=True):
        """Advanced recommendations using SVD matrix factorization"""
        try:
            if self.user_product_matrix is None:
                self.build_user_item_matrix()
            
            if self.user_product_matrix is None or self.user_product_matrix.empty:
                return []
            
            # Perform SVD
            matrix = self.user_product_matrix.values
            user_ratings_mean = np.mean(matrix, axis=1)
            matrix_demeaned = matrix - user_ratings_mean.reshape(-1, 1)
            
            # Use sparse SVD for efficiency
            n_factors = min(50, min(matrix.shape) - 1)
            U, sigma, Vt = svds(csr_matrix(matrix_demeaned), k=n_factors)
            
            sigma = np.diag(sigma)
            predicted_ratings = np.dot(np.dot(U, sigma), Vt) + user_ratings_mean.reshape(-1, 1)
            
            # Get predictions for this product
            product_idx = list(self.user_product_matrix.columns).index(product_id) if product_id in self.user_product_matrix.columns else None
            
            if product_idx is None:
                return []
            
            # Find similar products based on latent factors
            product_factors = Vt[:, product_idx]
            similarities = cosine_similarity([product_factors], Vt.T)[0]
            
            # Get target category
            target_product = self.products_df[self.products_df['id'] == product_id]
            if target_product.empty:
                return []
            target_category = target_product.iloc[0]['category']
            
            # Sort and filter
            similar_indices = np.argsort(similarities)[::-1]
            
            recommendations = []
            for idx in similar_indices:
                if len(recommendations) >= n:
                    break
                
                pid = self.user_product_matrix.columns[idx]
                if pid == product_id:
                    continue
                
                product = self.products_df[self.products_df['id'] == pid]
                if product.empty or not product.iloc[0]['in_stock']:
                    continue
                
                if category_filter and product.iloc[0]['category'] != target_category:
                    continue
                
                rec = product.iloc[0].to_dict()
                rec['similarity_score'] = similarities[idx]
                rec['recommendation_reason'] = "AI-powered recommendation"
                recommendations.append(rec)
            
            logger.info(f"✅ Matrix Factorization: {len(recommendations)} recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Matrix factorization error: {e}")
            return []
    
    # ============================================
    # 5. HYBRID RECOMMENDATIONS (ENSEMBLE)
    # ============================================
    
    def hybrid_recommendations(self, product_id, n=5, user_id=None, category_filter=True):
        """Advanced hybrid ensemble combining multiple algorithms"""
        try:
            # Get recommendations from different algorithms
            content_recs = self.content_based_recommendations(product_id, n=n*2, category_filter=category_filter)
            collab_recs = self.collaborative_recommendations(product_id, n=n*2, category_filter=category_filter)
            
            # Try matrix factorization if enough data
            mf_recs = []
            try:
                mf_recs = self.matrix_factorization_recommendations(product_id, n=n, category_filter=category_filter)
            except Exception as e:
                logger.info(f"Matrix factorization skipped: {e}")
            
            # Fallback if no recommendations
            if not content_recs and not collab_recs and not mf_recs:
                return self.fallback_recommendations(product_id, n, category_filter)
            
            # Combine with weighted scoring
            all_products = {}
            
            # Content-based (40% weight)
            for i, rec in enumerate(content_recs):
                pid = rec['id']
                score = rec.get('similarity_score', 0) * 0.4 * (1 - i/(len(content_recs)*2))
                all_products[pid] = {
                    **rec,
                    'content_score': score,
                    'collab_score': 0,
                    'mf_score': 0
                }
            
            # Collaborative (35% weight)
            for i, rec in enumerate(collab_recs):
                pid = rec['id']
                score = (rec.get('collaborative_score', 0) / 10) * 0.35 * (1 - i/(len(collab_recs)*2))
                
                if pid in all_products:
                    all_products[pid]['collab_score'] = score
                else:
                    all_products[pid] = {
                        **rec,
                        'content_score': 0,
                        'collab_score': score,
                        'mf_score': 0
                    }
            
            # Matrix factorization (25% weight)
            for i, rec in enumerate(mf_recs):
                pid = rec['id']
                score = rec.get('similarity_score', 0) * 0.25 * (1 - i/len(mf_recs))
                
                if pid in all_products:
                    all_products[pid]['mf_score'] = score
                else:
                    all_products[pid] = {
                        **rec,
                        'content_score': 0,
                        'collab_score': 0,
                        'mf_score': score
                    }
            
            # Calculate final hybrid score
            for pid in all_products:
                all_products[pid]['hybrid_score'] = (
                    all_products[pid]['content_score'] +
                    all_products[pid]['collab_score'] +
                    all_products[pid]['mf_score']
                )
                
                # Boost popular items slightly
                popularity_boost = all_products[pid].get('normalized_popularity', 0) * 0.1
                all_products[pid]['hybrid_score'] += popularity_boost
            
            # Sort by hybrid score
            sorted_products = sorted(
                all_products.values(),
                key=lambda x: x['hybrid_score'],
                reverse=True
            )
            
            # Diversify recommendations (avoid too similar products)
            final_recs = self._diversify_recommendations(sorted_products[:n*2], n)
            
            logger.info(f"✅ Hybrid: {len(final_recs)} recommendations (category_filter={category_filter})")
            return final_recs[:n]
            
        except Exception as e:
            logger.error(f"❌ Hybrid error: {e}")
            return self.fallback_recommendations(product_id, n, category_filter)
    
    def _diversify_recommendations(self, recommendations, n):
        """Ensure diversity in recommendations (avoid all similar products)"""
        if len(recommendations) <= n:
            return recommendations
        
        diverse_recs = []
        seen_ingredients = set()
        seen_price_brackets = set()
        
        # First pass: diversify by ingredient and price
        for rec in recommendations:
            if len(diverse_recs) >= n:
                break
            
            ingredient = rec.get('mainIngredient', '')
            price_bracket = self._get_price_bracket(rec.get('price', 0))
            
            # Allow some repetition but prefer diversity
            if (ingredient not in seen_ingredients or len(seen_ingredients) < 3) and \
               (price_bracket not in seen_price_brackets or len(seen_price_brackets) < 3):
                diverse_recs.append(rec)
                seen_ingredients.add(ingredient)
                seen_price_brackets.add(price_bracket)
        
        # Fill remaining slots if needed
        for rec in recommendations:
            if len(diverse_recs) >= n:
                break
            if rec not in diverse_recs:
                diverse_recs.append(rec)
        
        return diverse_recs
    
    # ============================================
    # 6. FALLBACK & COLD START HANDLING
    # ============================================
    
    def fallback_recommendations(self, product_id, n=5, category_filter=True):
        """Smart fallback for cold start (new products/users)"""
        try:
            if self.products_df is None or len(self.products_df) == 0:
                return []
            
            target = self.products_df[self.products_df['id'] == product_id]
            if target.empty:
                # New product - return trending in any category
                trending = self.products_df[
                    self.products_df['in_stock'] == True
                ].nlargest(n, 'popularity_score')
                return trending.to_dict('records')
            
            target = target.iloc[0]
            target_category = target['category']
            
            # Same category only
            if category_filter:
                same_category = self.products_df[
                    (self.products_df['category'] == target_category) &
                    (self.products_df['id'] != product_id) &
                    (self.products_df['in_stock'] == True)
                ].copy()
                
                if same_category.empty:
                    logger.warning(f"No products in category '{target_category}'")
                    return []
                
                # Calculate smart fallback score
                same_category['price_sim'] = 1 / (1 + abs(same_category['price'] - target['price']))
                same_category['rating_sim'] = 1 - abs(same_category['rating'] - target['rating']) / 5
                
                same_category['fallback_score'] = (
                    same_category['price_sim'] * 0.2 +
                    same_category['rating_sim'] * 0.2 +
                    same_category['normalized_rating'] * 0.3 +
                    same_category['normalized_popularity'] * 0.3
                )
                
                recommendations = same_category.nlargest(n, 'fallback_score').to_dict('records')
            else:
                # Cross-category trending
                recommendations = self.products_df[
                    (self.products_df['id'] != product_id) &
                    (self.products_df['in_stock'] == True)
                ].nlargest(n, 'popularity_score').to_dict('records')
            
            logger.info(f"✅ Fallback: {len(recommendations)} recommendations")
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Fallback error: {e}")
            return []
    
    # ============================================
    # 7. PERSONALIZED RECOMMENDATIONS
    # ============================================
    
    def personalized_recommendations(self, user_id, n=10, category=None):
        """Personalized recommendations based on user history"""
        try:
            # Get user's purchase history
            user_orders = list(orders_collection.find({'userId': user_id}))
            user_interactions = list(user_interactions_collection.find({'userId': user_id}))
            
            # Extract preferred categories and products
            preferred_categories = defaultdict(int)
            viewed_products = set()
            purchased_products = set()
            
            for order in user_orders:
                for item in order.get('items', []):
                    pid = str(item.get('productId', {}).get('_id') if isinstance(item.get('productId'), dict) else item.get('productId'))
                    purchased_products.add(pid)
                    
                    product = self.products_df[self.products_df['id'] == pid]
                    if not product.empty:
                        preferred_categories[product.iloc[0]['category']] += 2
            
            for interaction in user_interactions:
                pid = interaction.get('productId')
                viewed_products.add(pid)
                
                product = self.products_df[self.products_df['id'] == pid]
                if not product.empty:
                    preferred_categories[product.iloc[0]['category']] += 1
            
            # Get recommendations from preferred categories
            recommendations = []
            
            # Filter by category if specified
            if category:
                target_categories = [category]
            else:
                # Sort categories by preference
                target_categories = sorted(preferred_categories.items(), key=lambda x: x[1], reverse=True)
                target_categories = [cat for cat, _ in target_categories[:3]]  # Top 3 categories
            
            for cat in target_categories:
                cat_products = self.products_df[
                    (self.products_df['category'] == cat) &
                    (~self.products_df['id'].isin(purchased_products)) &
                    (self.products_df['in_stock'] == True)
                ].copy()
                
                # Score products
                cat_products['personalized_score'] = (
                    cat_products['normalized_rating'] * 0.4 +
                    cat_products['normalized_popularity'] * 0.4 +
                    (1 - cat_products['normalized_price']) * 0.2  # Prefer lower prices
                )
                
                top_products = cat_products.nlargest(n, 'personalized_score')
                recommendations.extend(top_products.to_dict('records'))
            
            # Remove duplicates and limit
            seen = set()
            unique_recs = []
            for rec in recommendations:
                if rec['id'] not in seen:
                    seen.add(rec['id'])
                    rec['recommendation_reason'] = "Based on your interests"
                    unique_recs.append(rec)
            
            logger.info(f"✅ Personalized: {len(unique_recs[:n])} recommendations for user {user_id}")
            return unique_recs[:n]
            
        except Exception as e:
            logger.error(f"❌ Personalized recommendations error: {e}")
            return []
    
    # ============================================
    # 8. CACHING & PERFORMANCE
    # ============================================
    
    def get_cached_recommendations(self, cache_key):
        """Get recommendations from cache"""
        if cache_key in self.recommendation_cache:
            if cache_key in self.cache_expiry:
                if datetime.now() < self.cache_expiry[cache_key]:
                    logger.info(f"✅ Cache HIT for {cache_key}")
                    self.recommendation_stats['cache_hits'] += 1
                    return self.recommendation_cache[cache_key]
                else:
                    # Expired
                    del self.recommendation_cache[cache_key]
                    del self.cache_expiry[cache_key]
        
        self.recommendation_stats['cache_misses'] += 1
        return None
    
    def set_cached_recommendations(self, cache_key, recommendations):
        """Cache recommendations"""
        self.recommendation_cache[cache_key] = recommendations
        self.cache_expiry[cache_key] = datetime.now() + self.cache_ttl
        logger.info(f"✅ Cached recommendations for {cache_key}")
    
    def should_update(self):
        """Check if data should be refreshed"""
        if self.last_updated is None:
            return True
        return datetime.now() - self.last_updated > self.update_interval
    
    def update_if_needed(self):
        """Update engine if needed"""
        if self.should_update():
            logger.info("🔄 Refreshing recommendation engine...")
            self.load_products_from_db()
            self.build_content_features()
            self.build_user_item_matrix()
            # Clear cache on update
            self.recommendation_cache.clear()
            self.cache_expiry.clear()

# Initialize engine
engine = AdvancedRecommendationEngine()

# Load data on startup
logger.info("🚀 Initializing Advanced ML Recommendation Engine...")
engine.load_products_from_db()
engine.build_content_features()
engine.build_user_item_matrix()

# ============================================
# API ENDPOINTS
# ============================================

@app.route('/health', methods=['GET'])
def health_check():
    """Health check with stats"""
    return jsonify({
        'status': 'healthy',
        'service': 'Advanced ML Recommendation Engine',
        'version': '2.0',
        'products_loaded': len(engine.products_df) if engine.products_df is not None else 0,
        'last_updated': engine.last_updated.isoformat() if engine.last_updated else None,
        'cache_stats': {
            'hits': engine.recommendation_stats['cache_hits'],
            'misses': engine.recommendation_stats['cache_misses'],
            'hit_rate': engine.recommendation_stats['cache_hits'] / max(1, engine.recommendation_stats['cache_hits'] + engine.recommendation_stats['cache_misses'])
        }
    })

@app.route('/recommend/<product_id>', methods=['GET'])
def get_recommendations(product_id):
    """Get advanced ML recommendations"""
    try:
        engine.update_if_needed()
        
        n = int(request.args.get('n', 5))
        method = request.args.get('method', 'hybrid').lower()
        user_id = request.args.get('user_id', None)
        category_filter = request.args.get('category_filter', 'true').lower() == 'true'
        use_cache = request.args.get('cache', 'true').lower() == 'true'
        
        # Check cache
        cache_key = f"{product_id}_{method}_{n}_{category_filter}"
        if use_cache:
            cached = engine.get_cached_recommendations(cache_key)
            if cached:
                return jsonify(cached)
        
        # Get recommendations
        if method == 'content':
            recommendations = engine.content_based_recommendations(product_id, n, category_filter)
        elif method == 'collaborative':
            recommendations = engine.collaborative_recommendations(product_id, n, category_filter)
        elif method == 'matrix_factorization' or method == 'mf':
            recommendations = engine.matrix_factorization_recommendations(product_id, n, category_filter)
        else:  # hybrid (default)
            recommendations = engine.hybrid_recommendations(product_id, n, user_id, category_filter)
        
        # Format response
        formatted_recs = []
        for rec in recommendations:
            formatted_recs.append({
                'id': rec['id'],
                'name': rec['name'],
                'category': rec['category'],
                'price': rec['price'],
                'rating': rec['rating'],
                'mainIngredient': rec['mainIngredient'],
                'image': rec['image'],
                'description': rec.get('description', ''),
                'similarity': round(rec.get('hybrid_score', rec.get('similarity_score', 0.8)), 2),
                'reason': rec.get('recommendation_reason', 'Recommended for you'),
                'stock': rec.get('stock', 0),
                'popularity': round(rec.get('popularity_score', 0), 1)
            })
        
        response = {
            'success': True,
            'recommendations': formatted_recs,
            'total': len(formatted_recs),
            'method': method,
            'category_filter': category_filter
        }
        
        # Cache result
        if use_cache:
            engine.set_cached_recommendations(cache_key, response)
        
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"❌ Recommendation API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'recommendations': []
        }), 500

@app.route('/recommend/personalized/<user_id>', methods=['GET'])
def get_personalized_recommendations(user_id):
    """Get personalized recommendations for a user"""
    try:
        engine.update_if_needed()
        
        n = int(request.args.get('n', 10))
        category = request.args.get('category', None)
        
        recommendations = engine.personalized_recommendations(user_id, n, category)
        
        formatted_recs = []
        for rec in recommendations:
            formatted_recs.append({
                'id': rec['id'],
                'name': rec['name'],
                'category': rec['category'],
                'price': rec['price'],
                'rating': rec['rating'],
                'image': rec['image'],
                'reason': rec.get('recommendation_reason', 'Based on your interests')
            })
        
        return jsonify({
            'success': True,
            'recommendations': formatted_recs,
            'total': len(formatted_recs),
            'user_id': user_id
        })
        
    except Exception as e:
        logger.error(f"❌ Personalized recommendations error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'recommendations': []
        }), 500

@app.route('/track', methods=['POST'])
def track_interaction():
    """Track user interaction for better recommendations"""
    try:
        data = request.json
        
        interaction = {
            'userId': data.get('userId', 'anonymous'),
            'productId': data.get('productId'),
            'action': data.get('action', 'view'),  # view, add_to_cart, add_to_wishlist, purchase
            'timestamp': datetime.now(),
            'metadata': data.get('metadata', {})
        }
        
        user_interactions_collection.insert_one(interaction)
        
        logger.info(f"✅ Tracked {interaction['action']} for product {interaction['productId']}")
        
        return jsonify({
            'success': True,
            'message': 'Interaction tracked'
        })
        
    except Exception as e:
        logger.error(f"❌ Tracking error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/refresh', methods=['POST'])
def refresh_engine():
    """Manually refresh the recommendation engine"""
    try:
        engine.load_products_from_db()
        engine.build_content_features()
        engine.build_user_item_matrix()
        engine.recommendation_cache.clear()
        engine.cache_expiry.clear()
        
        return jsonify({
            'success': True,
            'message': 'Recommendation engine refreshed',
            'products_loaded': len(engine.products_df) if engine.products_df is not None else 0
        })
        
    except Exception as e:
        logger.error(f"❌ Refresh error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/stats', methods=['GET'])
def get_stats():
    """Get recommendation engine statistics"""
    try:
        total_requests = engine.recommendation_stats['cache_hits'] + engine.recommendation_stats['cache_misses']
        
        return jsonify({
            'success': True,
            'stats': {
                'products_loaded': len(engine.products_df) if engine.products_df is not None else 0,
                'last_updated': engine.last_updated.isoformat() if engine.last_updated else None,
                'cache': {
                    'hits': engine.recommendation_stats['cache_hits'],
                    'misses': engine.recommendation_stats['cache_misses'],
                    'total_requests': total_requests,
                    'hit_rate_percent': round(engine.recommendation_stats['cache_hits'] / max(1, total_requests) * 100, 2)
                },
                'user_interactions': user_interactions_collection.count_documents({}),
                'matrix_shape': list(engine.user_product_matrix.shape) if engine.user_product_matrix is not None else None
            }
        })
        
    except Exception as e:
        logger.error(f"❌ Stats error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    port = int(os.getenv('ML_SERVICE_PORT', 5001))
    logger.info(f"🚀 Starting Advanced ML Recommendation Service on port {port}")
    logger.info("🎯 Features: Content-Based, Collaborative, Matrix Factorization, Hybrid, Personalization")
    app.run(host='0.0.0.0', port=port, debug=False)





