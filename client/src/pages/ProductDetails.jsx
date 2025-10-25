import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { toast } from "react-toastify";
import { FiShare2, FiCopy, FiMail, FiMessageCircle, FiInstagram, FiFacebook, FiTwitter } from "react-icons/fi";
import ProductRecommendations from "../components/ProductRecommendations";
import "react-toastify/dist/ReactToastify.css";

export default function ProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
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
      quantity: quantity || 1
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

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity >= 1 && newQuantity <= 10) {
      setQuantity(newQuantity);
      // Reset cart state when quantity changes
      setItemAddedToCart(false);
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
      <div style={containerStyle}>
        <div style={loadingStyle}>
          <div style={spinnerStyle}></div>
          <p>Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div style={containerStyle}>
        <div style={errorStyle}>
          <h2>Product not found</h2>
          <button onClick={() => navigate("/products")} style={buttonPrimary}>
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
    <div style={containerStyle}>
      <div style={breadcrumbStyle}>
        <button onClick={() => navigate("/products")} style={breadcrumbButtonStyle}>
          ← Back to Products
        </button>
      </div>

      <div style={productContainerStyle}>
        {/* Product Image */}
        <div style={imageContainerStyle}>
          <img
            src={imageUrl}
            alt={product.title}
            style={productImageStyle}
            onError={(e) => {
              e.target.src = "/images/placeholder.png";
            }}
          />
        </div>

        {/* Product Details */}
        <div style={detailsContainerStyle}>
          <h1 style={titleStyle}>{product.title}</h1>
          
          {/* Product Description */}
          <div style={descriptionStyle}>
            <p style={descriptionTextStyle}>
              {getProductDescription(product)}
            </p>
          </div>
          
          <div style={categoryStyle}>
            <span style={categoryLabelStyle}>Category:</span>
            <span style={categoryValueStyle}>{product.category?.name || product.category || "Uncategorized"}</span>
          </div>

          {/* Stock Status - Only show when out of stock */}
          {(product.stock === 0 || product.stock === '0' || !product.stock || product.stock <= 0) && (
            <div style={stockContainerStyle}>
              <span style={stockLabelStyle}>Stock Status:</span>
              <span style={{
                ...stockValueStyle,
                color: '#dc3545'
              }}>
                Out of Stock
              </span>
            </div>
          )}

          {/* Variants */}
          <div style={variantsContainerStyle}>
            <h3 style={variantsTitleStyle}>Available Options:</h3>
            {product.variants && product.variants.length > 0 ? (
              <div style={variantsListStyle}>
                {product.variants.map((variant, index) => (
                  <div
                    key={index}
                    style={{
                      ...variantItemStyle,
                      ...(selectedVariant?.weight === variant.weight && selectedVariant?.price === variant.price
                        ? selectedVariantStyle
                        : {}),
                    }}
                    onClick={() => handleVariantChange(variant)}
                  >
                    <span style={variantWeightStyle}>{variant.weight}</span>
                    <span style={variantPriceStyle}>₹{variant.price}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={variantsListStyle}>
                <div
                  style={{
                    ...variantItemStyle,
                    ...selectedVariantStyle,
                  }}
                >
                  <span style={variantWeightStyle}>1 piece</span>
                  <span style={variantPriceStyle}>₹{product.price}</span>
                </div>
              </div>
            )}
          </div>

          {/* Quantity Selector */}
          <div style={quantityContainerStyle}>
            <label style={quantityLabelStyle}>Quantity:</label>
            <div style={quantitySelectorStyle}>
              <button
                onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                style={quantityButtonStyle}
                disabled={quantity <= 1}
              >
                -
              </button>
              <span style={quantityValueStyle}>{quantity}</span>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                style={quantityButtonStyle}
              >
                +
              </button>
            </div>
          </div>

          {/* Price Display */}
          {selectedVariant && (
            <div style={priceContainerStyle}>
              <span style={priceLabelStyle}>Total Price:</span>
              <span style={priceValueStyle}>₹{(selectedVariant.price * quantity).toFixed(2)}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div style={actionsContainerStyle}>
            <button
              onClick={itemAddedToCart ? handleGoToCart : handleAddToCart}
              disabled={!selectedVariant || addingToCart || product.stock <= 0}
              style={{
                ...buttonPrimary,
                ...(addingToCart || product.stock <= 0 ? buttonDisabled : {}),
                ...(itemAddedToCart ? { backgroundColor: "#8B4513" } : {}),
              }}
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
              style={{
                ...buttonPrimary,
                backgroundColor: "#3e0e0e",
                ...(product.stock <= 0 ? buttonDisabled : {}),
              }}
            >
              ⚡ Buy Now
            </button>

            <button
              onClick={handleWishlistToggle}
              disabled={addingToWishlist}
              style={{
                ...buttonSecondary,
                ...(addingToWishlist ? buttonDisabled : {}),
              }}
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
              style={{
                ...buttonSecondary,
                backgroundColor: "#6c757d",
                color: "white",
                border: "none",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <FiShare2 size={16} />
              Share
            </button>
          </div>

          {/* Share Menu */}
          {showShareMenu && (
            <div 
              data-share-menu
              style={{
                position: "absolute",
                top: "100%",
                right: "0",
                backgroundColor: "white",
                border: "1px solid #ddd",
                borderRadius: "8px",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                padding: "12px",
                zIndex: 1000,
                minWidth: "200px",
                marginTop: "8px"
              }}
            >
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "8px"
              }}>
                <button
                  onClick={handleWhatsAppShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#25D366",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  <FiMessageCircle size={16} />
                  WhatsApp
                </button>

                <button
                  onClick={handleEmailShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#007bff",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  <FiMail size={16} />
                  Email
                </button>

                <button
                  onClick={handleInstagramShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#E4405F",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  <FiInstagram size={16} />
                  Instagram
                </button>

                <button
                  onClick={handleFacebookShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#1877F2",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  <FiFacebook size={16} />
                  Facebook
                </button>

                <button
                  onClick={handleTwitterShare}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#1DA1F2",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
                  <FiTwitter size={16} />
                  Twitter
                </button>

                <button
                  onClick={handleCopyLink}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 12px",
                    border: "none",
                    borderRadius: "6px",
                    backgroundColor: "#6c757d",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500"
                  }}
                >
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

// Styles
const containerStyle = {
  minHeight: "100vh",
  background: "#f8fafc",
  padding: "20px",
  fontFamily: "Inter, sans-serif",
};

const loadingStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "50vh",
  gap: "20px",
};

const spinnerStyle = {
  width: "40px",
  height: "40px",
  border: "4px solid #f3f3f3",
  borderTop: "4px solid #5c4033",
  borderRadius: "50%",
  animation: "spin 1s linear infinite",
};

const errorStyle = {
  textAlign: "center",
  padding: "40px",
  background: "#fff",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const breadcrumbStyle = {
  marginBottom: "20px",
};

const breadcrumbButtonStyle = {
  background: "none",
  border: "none",
  color: "#5c4033",
  fontSize: "14px",
  cursor: "pointer",
  textDecoration: "underline",
  padding: "8px 0",
};

const productContainerStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "40px",
  background: "#fff",
  borderRadius: "16px",
  padding: "40px",
  boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
};

const imageContainerStyle = {
  position: "relative",
  overflow: "hidden",
  borderRadius: "12px",
};

const productImageStyle = {
  width: "100%",
  height: "400px",
  objectFit: "cover",
  borderRadius: "12px",
};

const detailsContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const titleStyle = {
  fontSize: "32px",
  fontWeight: "700",
  color: "#5c4033",
  margin: "0",
  lineHeight: "1.2",
};

const descriptionStyle = {
  background: "#f9f7f5",
  padding: "20px",
  borderRadius: "12px",
  border: "1px solid #e0e0e0",
  marginBottom: "20px",
};

const descriptionTextStyle = {
  fontSize: "16px",
  lineHeight: "1.6",
  color: "#555",
  margin: "0",
  fontStyle: "italic",
};

const categoryStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const categoryLabelStyle = {
  fontSize: "14px",
  color: "#666",
  fontWeight: "500",
};

const categoryValueStyle = {
  fontSize: "16px",
  color: "#5c4033",
  fontWeight: "600",
  background: "#f0f0f0",
  padding: "4px 12px",
  borderRadius: "20px",
};

const stockContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const stockLabelStyle = {
  fontSize: "14px",
  color: "#666",
  fontWeight: "500",
};

const stockValueStyle = {
  fontSize: "16px",
  fontWeight: "600",
  padding: "4px 12px",
  borderRadius: "20px",
  background: "#f0f0f0",
};

const variantsContainerStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const variantsTitleStyle = {
  fontSize: "18px",
  fontWeight: "600",
  color: "#333",
  margin: "0",
};

const variantsListStyle = {
  display: "flex",
  flexWrap: "wrap",
  gap: "12px",
};

const variantItemStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: "16px",
  border: "2px solid #e0e0e0",
  borderRadius: "12px",
  cursor: "pointer",
  transition: "all 0.3s ease",
  minWidth: "120px",
};

const selectedVariantStyle = {
  borderColor: "#5c4033",
  background: "#f9f7f5",
  transform: "translateY(-2px)",
  boxShadow: "0 4px 12px rgba(92, 64, 51, 0.2)",
};

const variantWeightStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#333",
  marginBottom: "4px",
};

const variantPriceStyle = {
  fontSize: "18px",
  fontWeight: "700",
  color: "#5c4033",
};

const quantityContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "16px",
};

const quantityLabelStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#333",
};

const quantitySelectorStyle = {
  display: "flex",
  alignItems: "center",
  border: "2px solid #e0e0e0",
  borderRadius: "8px",
  overflow: "hidden",
};

const quantityButtonStyle = {
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "12px 16px",
  cursor: "pointer",
  fontSize: "18px",
  fontWeight: "600",
  transition: "background 0.3s ease",
};

const quantityValueStyle = {
  padding: "12px 20px",
  fontSize: "16px",
  fontWeight: "600",
  background: "#fff",
  minWidth: "60px",
  textAlign: "center",
};

const priceContainerStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "16px",
  background: "#f9f7f5",
  borderRadius: "12px",
  border: "2px solid #5c4033",
};

const priceLabelStyle = {
  fontSize: "16px",
  fontWeight: "600",
  color: "#333",
};

const priceValueStyle = {
  fontSize: "24px",
  fontWeight: "700",
  color: "#5c4033",
};

const actionsContainerStyle = {
  display: "flex",
  gap: "16px",
  marginTop: "8px",
  position: "relative",
};

const buttonPrimary = {
  background: "#5c4033",
  color: "#fff",
  border: "none",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  flex: "1",
};

const buttonSecondary = {
  background: "#fff",
  color: "#5c4033",
  border: "2px solid #5c4033",
  padding: "12px 24px",
  borderRadius: "8px",
  fontSize: "14px",
  fontWeight: "600",
  cursor: "pointer",
  transition: "all 0.3s ease",
  flex: "1",
};

const buttonDisabled = {
  opacity: "0.6",
  cursor: "not-allowed",
};

// Add CSS animation for spinner
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
