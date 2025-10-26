import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import { FiShare2, FiCopy, FiMail, FiMessageCircle, FiInstagram, FiFacebook, FiTwitter } from "react-icons/fi";
import ProductRecommendations from "../components/ProductRecommendations";
import "react-toastify/dist/ReactToastify.css";
import "../styles/ProductDetails.css";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity] = useState(1); // Fixed at 1, no UI controls
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [itemAddedToCart, setItemAddedToCart] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  useEffect(() => {
    if (product && auth.currentUser) {
      checkWishlistStatus();
    }
  }, [product, auth.currentUser]);

  // Close share menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showShareMenu && !event.target.closest('[data-share-menu]')) {
        setShowShareMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showShareMenu]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/api/items/${id}`);
      if (!response.ok) {
        throw new Error("Product not found");
      }
      const data = await response.json();
      console.log("Product data:", data);
      setProduct(data);
      
      // Set first variant as default if variants exist, otherwise use price
      if (data.variants && data.variants.length > 0) {
        console.log("Setting variant from variants array:", data.variants[0]);
        setSelectedVariant(data.variants[0]);
      } else if (data.price) {
        // Create a default variant for products with only price
        const defaultVariant = {
          weight: "1 piece",
          price: data.price
        };
        console.log("Setting default variant:", defaultVariant);
        setSelectedVariant(defaultVariant);
      } else {
        console.log("No variants or price found for product");
      }
    } catch (error) {
      console.error("Error fetching product:", error);
      toast.error("Failed to load product details");
      navigate("/products");
    } finally {
      setLoading(false);
    }
  };

  const checkWishlistStatus = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:5000/api/wishlist/check/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsInWishlist(data.inWishlist);
      }
    } catch (error) {
      console.error("Error checking wishlist:", error);
    }
  };

  const handleAddToCart = async () => {
    if (!auth.currentUser) {
      toast.error("Please login to add items to cart");
      navigate("/login");
      return;
    }

    if (!selectedVariant) {
      toast.error("Please select a variant");
      return;
    }

    // Check stock before proceeding
    if (!product.stock || product.stock <= 0) {
      toast.error("This product is currently out of stock");
      return;
    }

    try {
      setAddingToCart(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      console.log("Sending cart request:", {
        productId: id,
        variant: selectedVariant,
        quantity: quantity,
      });

      const response = await fetch("http://localhost:5000/api/cart/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: id,
          variant: selectedVariant,
          quantity: quantity,
        }),
      });

      console.log("Cart response status:", response.status);
      console.log("Cart response ok:", response.ok);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Cart error response:", errorData);
        throw new Error(errorData.error || "Failed to add to cart");
      }

      const result = await response.json();
      console.log("Cart success response:", result);
      toast.success("Added to cart successfully!");
      
      // Set item as added to cart
      setItemAddedToCart(true);
      
      // Refresh product data to get updated stock
      await fetchProduct();
    } catch (error) {
      console.error("Error adding to cart:", error);
      toast.error(`Failed to add to cart: ${error.message}`);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleBuyNow = () => {
    if (!selectedVariant || product?.stock <= 0) return;
    const item = {
      productId: product?._id || id,
      title: product?.title || "",
      image: product?.image || "",
      variant: selectedVariant,
      quantity: quantity
    };
    navigate("/checkout", { state: { cartItems: [item] } });
  };

  const handleGoToCart = () => {
    if (auth.currentUser) {
      navigate("/cart/authenticated");
    } else {
      navigate("/cart");
    }
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
    // Reset cart state when variant changes
    setItemAddedToCart(false);
  };

  // Share functionality
  const getProductUrl = () => {
    return `${window.location.origin}/products/${id}`;
  };

  const getShareText = () => {
    if (!product) return "";
    return `Check out this amazing product: ${product.title} - ₹${selectedVariant?.price || product.price}`;
  };

  const handleWhatsAppShare = () => {
    const url = getProductUrl();
    const text = getShareText();
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text}\n\n${url}`)}`;
    window.open(whatsappUrl, '_blank');
    setShowShareMenu(false);
  };

  const handleEmailShare = () => {
    const url = getProductUrl();
    const text = getShareText();
    const subject = `Check out this product: ${product.title}`;
    const body = `${text}\n\nView product: ${url}`;
    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
    setShowShareMenu(false);
  };

  const handleInstagramShare = () => {
    // Instagram doesn't support direct URL sharing, so we'll copy the link
    const url = getProductUrl();
    navigator.clipboard.writeText(url);
    toast.success("Product link copied! You can paste it in your Instagram story or post.");
    setShowShareMenu(false);
  };

  const handleFacebookShare = () => {
    const url = getProductUrl();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(facebookUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleTwitterShare = () => {
    const url = getProductUrl();
    const text = getShareText();
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
    setShowShareMenu(false);
  };

  const handleCopyLink = () => {
    const url = getProductUrl();
    navigator.clipboard.writeText(url);
    toast.success("Product link copied to clipboard!");
    setShowShareMenu(false);
  };

  const handleWishlistToggle = async () => {
    console.log("=== WISHLIST DEBUG ===");
    console.log("Wishlist toggle clicked");
    console.log("Current user:", auth.currentUser);
    console.log("User UID:", auth.currentUser?.uid);
    console.log("Product ID:", id);
    console.log("Is in wishlist:", isInWishlist);
    
    if (!auth.currentUser) {
      console.log("❌ No user - redirecting to login");
      toast.error("Please login to manage wishlist");
      navigate("/login");
      return;
    }

    console.log("✅ All checks passed - proceeding with API call");

    try {
      setAddingToWishlist(true);
      const user = auth.currentUser;
      const token = await user.getIdToken();

      const url = isInWishlist 
        ? `http://localhost:5000/api/wishlist/remove/${id}`
        : "http://localhost:5000/api/wishlist/add";
      
      const method = isInWishlist ? "DELETE" : "POST";
      const body = isInWishlist ? undefined : JSON.stringify({ productId: id });

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body,
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isInWishlist ? 'remove from' : 'add to'} wishlist`);
      }

      setIsInWishlist(!isInWishlist);
      toast.success(isInWishlist ? "Removed from wishlist" : "Added to wishlist!");
    } catch (error) {
      console.error("Error updating wishlist:", error);
      toast.error(`Failed to ${isInWishlist ? 'remove from' : 'add to'} wishlist`);
    } finally {
      setAddingToWishlist(false);
    }
  };

  if (loading) {
    return (
      <div className="product-details-container">
        <div className="product-details-loading">
          <div className="product-details-spinner"></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="product-details-container">
        <div className="product-details-error">
          <h2>Product not found</h2>
          <button onClick={() => navigate("/products")} className="product-button-primary">
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  const getProductDescription = (product) => {
    const descriptions = {
      "Achappam": "Handcrafted by skilled women artisans using traditional Kerala recipes. These crispy, flower-shaped snacks are made with rice flour, coconut milk, and jaggery, then deep-fried to golden perfection. Each piece is carefully shaped by hand, preserving the authentic taste that has been passed down through generations.",
      
      "Chips": "Crispy, golden chips made from fresh vegetables, carefully sliced and fried to perfection by our women artisans. Each batch is prepared with love using traditional methods, ensuring the perfect crunch and natural flavor that makes these chips irresistible.",
      
      "Jaggery Cake": "A delightful homemade cake sweetened with pure jaggery instead of refined sugar. Made by our talented women bakers using traditional recipes, this cake combines the natural sweetness of jaggery with aromatic spices, creating a guilt-free indulgence.",
      
      "Lemon Pickle": "Tangy and spicy lemon pickle made with fresh lemons, carefully preserved using traditional methods by our women artisans. Each jar is filled with love and authentic flavors, perfect for adding zest to your meals.",
      
      "Chocolate Cake": "Rich, moist chocolate cake baked fresh by our skilled women bakers. Made with premium cocoa and natural ingredients, this homemade delight offers the perfect balance of sweetness and chocolate flavor.",
      
      "Jackfruit Chips": "Crispy jackfruit chips made from fresh, ripe jackfruit by our women artisans. These naturally sweet chips are carefully sliced and fried to perfection, offering a healthy and delicious snack option.",
      
      "Turmeric Powder": "Pure, hand-ground turmeric powder made from fresh turmeric roots. Our women artisans carefully dry and grind the turmeric using traditional methods, ensuring maximum potency and natural color.",
      
      "Redvelvet": "Classic red velvet cake with a homemade twist, baked by our talented women bakers. Made with natural ingredients and traditional techniques, this cake features the perfect balance of cocoa and vanilla flavors.",
      
      "Clove": "Premium quality cloves, carefully selected and processed by our women artisans. These aromatic spices are sourced fresh and processed using traditional methods to preserve their natural oils and flavor.",
      
      "Banana Dry": "Naturally dried banana chips made from fresh bananas by our women artisans. These healthy snacks are prepared using traditional sun-drying methods, preserving the natural sweetness and nutrients.",
      
      "Fish Pickle": "Traditional fish pickle made with fresh fish and aromatic spices by our skilled women artisans. Each jar is prepared using time-honored recipes, creating a perfect blend of flavors.",
      
      "Garam Masala": "Aromatic garam masala blend, hand-ground by our women artisans using traditional recipes. This spice mix combines carefully selected spices, ground fresh to preserve their natural oils and flavors.",
      
      "Tapioca Fry": "Crispy tapioca fries made from fresh tapioca by our women artisans. These golden, crunchy snacks are prepared using traditional frying methods, offering a delicious and satisfying treat.",
      
      "Banana Candy": "Sweet banana candies made from fresh bananas and natural ingredients by our women artisans. These homemade treats are prepared using traditional methods, creating a perfect balance of sweetness and natural banana flavor.",
      
      "Cookie": "Homemade cookies baked fresh by our talented women bakers. Made with natural ingredients and traditional recipes, these cookies offer the perfect combination of crispiness and flavor.",
      
      "kozhalappam": "Traditional kozhalappam made by our skilled women artisans using authentic Kerala recipes. These spiral-shaped snacks are prepared with rice flour and coconut, then deep-fried to golden perfection.",
      
      "Chil": "Fresh chili powder made from premium quality chilies by our women artisans. Carefully dried and ground using traditional methods, this spice adds the perfect heat to your dishes."
    };
    
    return descriptions[product.title] || `Handcrafted with love by our skilled women artisans using traditional methods and natural ingredients. This ${product.title.toLowerCase()} is made fresh with care, preserving authentic flavors and ensuring quality in every bite.`;
  };

  const imageUrl = product.image
    ? `http://localhost:5000/uploads/${product.image}`
    : product.img
    ? `http://localhost:5000/uploads/${product.img}`
    : "/images/placeholder.png";

  return (
    <div className="product-details-container">
      <div className="product-breadcrumb">
        <button onClick={() => navigate("/products")} className="product-breadcrumb-button">
          ← Back to Products
        </button>
      </div>

      <div className="product-container">
        {/* Product Image */}
        <div className="product-image-container">
          <img
            src={imageUrl}
            alt={product.title}
            className="product-image"
            onError={(e) => {
              e.target.src = "/images/placeholder.png";
            }}
          />
        </div>

        {/* Product Details */}
        <div className="product-details">
          <h1 className="product-title">{product.title}</h1>
          
          {/* Product Description */}
          <div className="product-description">
            <p className="product-description-text">
              {getProductDescription(product)}
            </p>
          </div>
          
          <div className="product-category">
            <span className="product-category-label">Category:</span>
            <span className="product-category-value">{product.category?.name || product.category || "Uncategorized"}</span>
          </div>

          {/* Stock Status - Only show when out of stock */}
          {(product.stock === 0 || product.stock === '0' || !product.stock || product.stock <= 0) && (
            <div className="product-stock-container">
              <span className="product-stock-label">Stock Status:</span>
              <span className="product-stock-value out-of-stock">
                Out of Stock
              </span>
            </div>
          )}

          {/* Variants */}
          <div className="product-variants-container">
            <h3 className="product-variants-title">Available Options:</h3>
            {product.variants && product.variants.length > 0 ? (
              <div className="product-variants-list">
                {product.variants.map((variant, index) => (
                  <div
                    key={index}
                    className={`product-variant-item ${selectedVariant?.weight === variant.weight && selectedVariant?.price === variant.price ? 'selected' : ''}`}
                    onClick={() => handleVariantChange(variant)}
                  >
                    <span className="product-variant-weight">{variant.weight}</span>
                    <span className="product-variant-price">₹{variant.price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="product-variants-list">
                <div className="product-variant-item selected">
                  <span className="product-variant-weight">1 piece</span>
                  <span className="product-variant-price">₹{product.price}</span>
                </div>
              </div>
            )}
          </div>

          {/* Price Display */}
          {selectedVariant && (
            <div className="product-price-container">
              <span className="product-price-label">Price:</span>
              <span className="product-price-value">₹{Number(selectedVariant.price).toFixed(2)}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="product-actions-container">
            <button
              onClick={itemAddedToCart ? handleGoToCart : handleAddToCart}
              disabled={!selectedVariant || addingToCart || product.stock <= 0}
              className={`product-button-primary ${itemAddedToCart ? 'go-to-cart' : ''} ${(addingToCart || product.stock <= 0) ? 'product-button-disabled' : ''}`}
            >
              {addingToCart 
                ? "Adding..." 
                : product.stock <= 0 
                  ? "Out of Stock" 
                  : itemAddedToCart 
                    ? "🛒 Go to Cart" 
                    : "🛒 Add to Cart"
              }
            </button>

            <button
              onClick={handleBuyNow}
              disabled={!selectedVariant || product.stock <= 0}
              className={`product-button-primary buy-now ${product.stock <= 0 ? 'product-button-disabled' : ''}`}
            >
              ⚡ Buy Now
            </button>

            <button
              onClick={handleWishlistToggle}
              disabled={addingToWishlist}
              className={`product-button-secondary ${addingToWishlist ? 'product-button-disabled' : ''}`}
            >
              {addingToWishlist 
                ? "Updating..." 
                : isInWishlist 
                  ? "❤️ Remove from Wishlist" 
                  : "🤍 Add to Wishlist"
              }
            </button>

            <button
              onClick={() => setShowShareMenu(!showShareMenu)}
              className="product-button-share"
            >
              <FiShare2 size={16} />
              Share
            </button>
          </div>

          {/* Share Menu */}
          {showShareMenu && (
            <div data-share-menu className="product-share-menu">
              <div className="product-share-grid">
                <button onClick={handleWhatsAppShare} className="product-share-button whatsapp">
                  <FiMessageCircle size={16} />
                  WhatsApp
                </button>

                <button onClick={handleEmailShare} className="product-share-button email">
                  <FiMail size={16} />
                  Email
                </button>

                <button onClick={handleInstagramShare} className="product-share-button instagram">
                  <FiInstagram size={16} />
                  Instagram
                </button>

                <button onClick={handleFacebookShare} className="product-share-button facebook">
                  <FiFacebook size={16} />
                  Facebook
                </button>

                <button onClick={handleTwitterShare} className="product-share-button twitter">
                  <FiTwitter size={16} />
                  Twitter
                </button>

                <button onClick={handleCopyLink} className="product-share-button copy">
                  <FiCopy size={16} />
                  Copy Link
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Product Recommendations */}
      {product && (
        <ProductRecommendations 
          productId={id}
          title="You might also like"
        />
      )}
    </div>
  );
}
