#!/usr/bin/env python3
"""
Advanced ML-based Product Recommendation System
Uses Content-Based Filtering, Collaborative Filtering, and Hybrid Approach
Similar to real e-commerce platforms like Amazon, Flipkart, etc.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from pymongo import MongoClient
from bson import ObjectId
import os
from datetime import datetime, timedelta
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/foodily-auth')
try:
    client = MongoClient(MONGO_URI)
    db = client.get_database()
    products_collection = db['products']
    orders_collection = db['orders']
    users_collection = db['users']
    logger.info("✅ Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"❌ MongoDB connection error: {e}")
    db = None

class RecommendationEngine:
    def __init__(self):
        self.products_df = None
        self.tfidf_matrix = None
        self.tfidf_vectorizer = None
        self.cosine_sim = None
        self.last_updated = None
        self.update_interval = timedelta(hours=1)  # Refresh every hour
        
    def load_products_from_db(self):
        """Load products from MongoDB and create DataFrame"""
        try:
            products = list(products_collection.find({'isActive': {'$ne': False}}))
            
            if not products:
                logger.warning("No products found in database")
                return pd.DataFrame()
            
            # Convert to DataFrame
            df_data = []
            for p in products:
                # Get category name
                category = p.get('category', {})
                if isinstance(category, dict):
                    category_name = category.get('name', category.get('title', 'unknown'))
                else:
                    category_name = str(category) if category else 'unknown'
                
                # Get price (handle variants)
                price = p.get('price', 0)
                if isinstance(p.get('variants'), list) and p['variants']:
                    prices = [float(v.get('price', 0)) for v in p['variants'] if v.get('price')]
                    if prices:
                        price = min(prices)  # Use minimum variant price
                
                # Get main ingredient from title or description
                title = p.get('title', p.get('name', ''))
                description = p.get('description', '')
                main_ingredient = self._extract_main_ingredient(title, description)
                
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
                    'stock': p.get('stock', 0),
                    # Create rich text for content-based filtering
                    'content': f"{title} {category_name} {description} {main_ingredient}".lower()
                })
            
            self.products_df = pd.DataFrame(df_data)
            logger.info(f"✅ Loaded {len(self.products_df)} products from database")
            return self.products_df
            
        except Exception as e:
            logger.error(f"❌ Error loading products: {e}")
            return pd.DataFrame()
    
    def _extract_main_ingredient(self, title, description):
        """Extract main ingredient from product title/description"""
        text = f"{title} {description}".lower()
        
        # Common food ingredients
        ingredients = [
            'rice', 'wheat', 'flour', 'dal', 'lentil', 'chickpea', 'moong', 'toor', 'chana',
            'spice', 'turmeric', 'cumin', 'coriander', 'chili', 'pepper', 'garam masala',
            'oil', 'ghee', 'butter', 'coconut', 'olive',
            'jaggery', 'sugar', 'honey', 'molasses',
            'pickle', 'chutney', 'sauce', 'paste',
            'snack', 'chip', 'namkeen', 'mixture',
            'sweet', 'cake', 'cookie', 'biscuit',
            'tea', 'coffee', 'beverage',
            'nut', 'almond', 'cashew', 'walnut', 'pistachio',
            'dried fruit', 'raisin', 'date', 'fig',
            'masala', 'seasoning', 'spice blend'
        ]
        
        for ingredient in ingredients:
            if ingredient in text:
                return ingredient
        
        # If no match, return first word of title
        return title.split()[0].lower() if title else 'mixed'
    
    def build_content_features(self):
        """Build TF-IDF matrix for content-based filtering"""
        if self.products_df is None or len(self.products_df) == 0:
            logger.error("❌ No products available to build features")
            return False
        
        try:
            # Create TF-IDF vectorizer
            self.tfidf_vectorizer = TfidfVectorizer(
                max_features=100,
                stop_words='english',
                ngram_range=(1, 2),
                min_df=1
            )
            
            # Fit and transform the content
            self.tfidf_matrix = self.tfidf_vectorizer.fit_transform(
                self.products_df['content'].fillna('')
            )
            
            # Compute cosine similarity matrix
            self.cosine_sim = cosine_similarity(self.tfidf_matrix, self.tfidf_matrix)
            
            self.last_updated = datetime.now()
            logger.info("✅ Content features built successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Error building content features: {e}")
            return False
    
    def get_user_purchase_history(self, user_id=None):
        """Get user's purchase history for collaborative filtering"""
        try:
            query = {'orderStatus': 'delivered'}
            if user_id:
                query['userId'] = user_id
            
            orders = list(orders_collection.find(query).limit(1000))
            
            purchase_data = []
            for order in orders:
                for item in order.get('items', []):
                    product_id = item.get('productId')
                    if isinstance(product_id, dict):
                        product_id = product_id.get('_id')
                    
                    purchase_data.append({
                        'userId': order.get('userId', 'unknown'),
                        'productId': str(product_id) if product_id else None,
                        'quantity': item.get('quantity', 1),
                        'rating': order.get('rating', 5),  # Assume 5 if delivered
                        'timestamp': order.get('createdAt', datetime.now())
                    })
            
            return pd.DataFrame(purchase_data)
            
        except Exception as e:
            logger.error(f"❌ Error getting purchase history: {e}")
            return pd.DataFrame()
    
    def content_based_recommendations(self, product_id, n=5):
        """Get recommendations based on product content similarity"""
        try:
            if self.products_df is None or len(self.products_df) == 0:
                return []
            
            # Find product index
            idx = self.products_df[self.products_df['id'] == product_id].index
            
            if len(idx) == 0:
                logger.warning(f"Product {product_id} not found")
                return []
            
            idx = idx[0]
            
            # Get similarity scores
            sim_scores = list(enumerate(self.cosine_sim[idx]))
            
            # Sort by similarity (excluding itself)
            sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)[1:n+6]
            
            # Get product indices
            product_indices = [i[0] for i in sim_scores]
            
            # Get products
            recommendations = self.products_df.iloc[product_indices].copy()
            recommendations['similarity_score'] = [score[1] for score in sim_scores[:len(recommendations)]]
            
            return recommendations.head(n).to_dict('records')
            
        except Exception as e:
            logger.error(f"❌ Content-based filtering error: {e}")
            return []
    
    def collaborative_recommendations(self, product_id, n=5):
        """Get recommendations based on what other users bought together"""
        try:
            purchase_df = self.get_user_purchase_history()
            
            if purchase_df.empty:
                return []
            
            # Find users who bought this product
            users_bought_this = purchase_df[
                purchase_df['productId'] == product_id
            ]['userId'].unique()
            
            if len(users_bought_this) == 0:
                return []
            
            # Find other products these users bought
            other_products = purchase_df[
                (purchase_df['userId'].isin(users_bought_this)) &
                (purchase_df['productId'] != product_id)
            ]
            
            # Count frequency and calculate scores
            product_counts = other_products.groupby('productId').agg({
                'quantity': 'sum',
                'rating': 'mean'
            }).reset_index()
            
            product_counts['score'] = (
                product_counts['quantity'] * 0.7 + 
                product_counts['rating'] * 0.3
            )
            
            product_counts = product_counts.sort_values('score', ascending=False).head(n)
            
            # Get product details
            recommendations = []
            for _, row in product_counts.iterrows():
                prod = self.products_df[self.products_df['id'] == row['productId']]
                if not prod.empty:
                    prod_dict = prod.iloc[0].to_dict()
                    prod_dict['collaborative_score'] = row['score']
                    recommendations.append(prod_dict)
            
            return recommendations
            
        except Exception as e:
            logger.error(f"❌ Collaborative filtering error: {e}")
            return []
    
    def hybrid_recommendations(self, product_id, n=5):
        """Combine content-based and collaborative filtering"""
        try:
            # Get both types of recommendations
            content_recs = self.content_based_recommendations(product_id, n=n*2)
            collab_recs = self.collaborative_recommendations(product_id, n=n*2)
            
            # If one method fails, use the other
            if not content_recs and not collab_recs:
                return self.fallback_recommendations(product_id, n)
            elif not collab_recs:
                return content_recs[:n]
            elif not content_recs:
                return collab_recs[:n]
            
            # Combine scores
            all_products = {}
            
            # Add content-based scores
            for i, rec in enumerate(content_recs):
                prod_id = rec['id']
                all_products[prod_id] = {
                    **rec,
                    'content_score': rec.get('similarity_score', 0) * (1 - i/(len(content_recs)*2)),
                    'collab_score': 0
                }
            
            # Add collaborative scores
            for i, rec in enumerate(collab_recs):
                prod_id = rec['id']
                collab_score = rec.get('collaborative_score', 0) * (1 - i/(len(collab_recs)*2))
                
                if prod_id in all_products:
                    all_products[prod_id]['collab_score'] = collab_score
                else:
                    all_products[prod_id] = {
                        **rec,
                        'content_score': 0,
                        'collab_score': collab_score
                    }
            
            # Calculate hybrid score (60% content, 40% collaborative)
            for prod_id in all_products:
                all_products[prod_id]['hybrid_score'] = (
                    all_products[prod_id]['content_score'] * 0.6 +
                    all_products[prod_id]['collab_score'] * 0.4
                )
            
            # Sort by hybrid score
            sorted_products = sorted(
                all_products.values(),
                key=lambda x: x['hybrid_score'],
                reverse=True
            )
            
            return sorted_products[:n]
            
        except Exception as e:
            logger.error(f"❌ Hybrid recommendation error: {e}")
            return self.fallback_recommendations(product_id, n)
    
    def fallback_recommendations(self, product_id, n=5):
        """Fallback: recommend products from same category and similar price"""
        try:
            if self.products_df is None or len(self.products_df) == 0:
                return []
            
            # Get target product
            target = self.products_df[self.products_df['id'] == product_id]
            if target.empty:
                # Return top-rated products
                return self.products_df.nlargest(n, 'rating').to_dict('records')
            
            target = target.iloc[0]
            
            # Filter by same category
            same_category = self.products_df[
                (self.products_df['category'] == target['category']) &
                (self.products_df['id'] != product_id)
            ].copy()
            
            if same_category.empty:
                # Return top-rated products
                return self.products_df[
                    self.products_df['id'] != product_id
                ].nlargest(n, 'rating').to_dict('records')
            
            # Calculate price similarity
            same_category['price_diff'] = abs(same_category['price'] - target['price'])
            same_category['price_sim'] = 1 / (1 + same_category['price_diff'])
            
            # Calculate rating similarity
            same_category['rating_sim'] = 1 - abs(same_category['rating'] - target['rating']) / 5
            
            # Combined score
            same_category['score'] = (
                same_category['price_sim'] * 0.3 +
                same_category['rating_sim'] * 0.3 +
                same_category['rating'] * 0.4
            )
            
            return same_category.nlargest(n, 'score').to_dict('records')
            
        except Exception as e:
            logger.error(f"❌ Fallback recommendation error: {e}")
            return []
    
    def should_update(self):
        """Check if data should be refreshed"""
        if self.last_updated is None:
            return True
        return datetime.now() - self.last_updated > self.update_interval
    
    def update_if_needed(self):
        """Update recommendation engine if needed"""
        if self.should_update():
            logger.info("🔄 Refreshing recommendation engine...")
            self.load_products_from_db()
            self.build_content_features()

# Initialize recommendation engine
engine = RecommendationEngine()

# Load data on startup
logger.info("🚀 Initializing recommendation engine...")
engine.load_products_from_db()
engine.build_content_features()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'ML Recommendation Engine',
        'products_loaded': len(engine.products_df) if engine.products_df is not None else 0,
        'last_updated': engine.last_updated.isoformat() if engine.last_updated else None
    })

@app.route('/recommend/<product_id>', methods=['GET'])
def get_recommendations(product_id):
    """Get ML-based recommendations for a product"""
    try:
        # Update if needed
        engine.update_if_needed()
        
        # Get number of recommendations (default: 5)
        n = int(request.args.get('n', 5))
        
        # Get recommendation method (default: hybrid)
        method = request.args.get('method', 'hybrid').lower()
        
        # Get recommendations based on method
        if method == 'content':
            recommendations = engine.content_based_recommendations(product_id, n)
        elif method == 'collaborative':
            recommendations = engine.collaborative_recommendations(product_id, n)
        else:  # hybrid (default)
            recommendations = engine.hybrid_recommendations(product_id, n)
        
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
                'similarity': round(rec.get('hybrid_score', rec.get('similarity_score', 0.8)), 2)
            })
        
        return jsonify({
            'success': True,
            'recommendations': formatted_recs,
            'total': len(formatted_recs),
            'method': method
        })
        
    except Exception as e:
        logger.error(f"❌ Recommendation API error: {e}")
        return jsonify({
            'success': False,
            'error': str(e),
            'recommendations': []
        }), 500

@app.route('/refresh', methods=['POST'])
def refresh_engine():
    """Manually refresh the recommendation engine"""
    try:
        engine.load_products_from_db()
        engine.build_content_features()
        
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

if __name__ == '__main__':
    port = int(os.getenv('ML_SERVICE_PORT', 5001))
    logger.info(f"🚀 Starting ML Recommendation Service on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)


