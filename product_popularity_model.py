"""
Decision Tree Classifier to predict product popularity ("Popular" or "Low").

This script:
- Loads data from product_data.csv
- Preprocesses categorical and numeric features using a scikit-learn Pipeline
- Trains a DecisionTreeClassifier
- Evaluates and prints accuracy on a held-out test set
- Visualizes the trained decision tree with matplotlib and saves it to decision_tree.png
- Saves the trained model pipeline to popularity_model.pkl via joblib

Columns expected in product_data.csv:
    - price (numeric)
    - rating (numeric)
    - num_reviews (numeric)
    - category (categorical/string)
    - popularity (string: "Popular" or "Low")

After training, you can load popularity_model.pkl and call .predict on
new rows with columns [price, rating, num_reviews, category].
"""

from __future__ import annotations

import os
from typing import List

import joblib
import matplotlib.pyplot as plt
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.tree import DecisionTreeClassifier, plot_tree
from sklearn.metrics import accuracy_score


def load_dataset(csv_path: str) -> pd.DataFrame:
    """Load the dataset from a CSV file.

    The CSV must contain columns: price, rating, num_reviews, category, popularity.
    """
    if not os.path.exists(csv_path):
        raise FileNotFoundError(
            f"Could not find dataset at '{csv_path}'. Ensure product_data.csv exists."
        )
    df = pd.read_csv(csv_path)

    required_columns = {"price", "rating", "num_reviews", "category", "popularity"}
    missing = required_columns - set(df.columns)
    if missing:
        raise ValueError(
            f"Dataset is missing required columns: {sorted(missing)}. Found: {sorted(df.columns)}"
        )
    return df


def build_pipeline(categorical_features: List[str], numeric_features: List[str]) -> Pipeline:
    """Create a preprocessing + model pipeline.

    - Categorical columns are one-hot encoded (handle unknowns at inference time)
    - Numeric columns are passed through
    - Model is a DecisionTreeClassifier
    """
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ],
        remainder="passthrough",  # keep numeric features as-is
    )

    model = DecisionTreeClassifier(random_state=42)

    pipeline = Pipeline(steps=[
        ("preprocessor", preprocessor),
        ("model", model),
    ])

    return pipeline


def get_transformed_feature_names(pipeline: Pipeline, categorical_features: List[str], numeric_features: List[str]) -> List[str]:
    """Return the names of features after the ColumnTransformer.

    This is useful for visualizing the decision tree with readable feature names.
    """
    preprocessor: ColumnTransformer = pipeline.named_steps["preprocessor"]
    # Extract names from OneHotEncoder
    ohe: OneHotEncoder = preprocessor.named_transformers_["cat"]
    ohe_feature_names = ohe.get_feature_names_out(categorical_features).tolist()
    return ohe_feature_names + numeric_features


def train_and_evaluate(csv_path: str = "product_data.csv") -> None:
    # 1) Load dataset
    df = load_dataset(csv_path)

    # Separate features and target. We keep target as strings ("Popular"/"Low").
    feature_cols = ["price", "rating", "num_reviews", "category"]
    target_col = "popularity"

    X = df[feature_cols].copy()
    y = df[target_col].copy()

    # 2) Identify categorical & numeric fields for preprocessing
    categorical_features = ["category"]
    numeric_features = ["price", "rating", "num_reviews"]

    # 3) Split dataset into train and test sets (80/20 split)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    # 4) Build pipeline and train model
    pipeline = build_pipeline(categorical_features, numeric_features)
    pipeline.fit(X_train, y_train)

    # 5) Evaluate model accuracy
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Accuracy on test set: {acc:.4f}")

    # 6) Visualize the trained decision tree
    # To plot, we need the underlying trained DecisionTreeClassifier and feature names
    model: DecisionTreeClassifier = pipeline.named_steps["model"]

    # We must extract the feature names AFTER one-hot encoding
    feature_names = get_transformed_feature_names(
        pipeline, categorical_features, numeric_features
    )

    # Create a simple, readable plot and save it
    plt.figure(figsize=(18, 10))
    plot_tree(
        model,
        feature_names=feature_names,
        class_names=["Low", "Popular"],
        filled=True,
        rounded=True,
        fontsize=8,
    )
    plt.tight_layout()
    plt.savefig("decision_tree.png", dpi=200)
    # Optionally display interactively if running locally
    try:
        plt.show()
    except Exception:
        # In headless environments, just ignore show errors
        pass
    finally:
        plt.close()

    # 7) Save the trained model pipeline
    joblib.dump(pipeline, "popularity_model.pkl")
    print("Saved trained model to popularity_model.pkl")
    print("Saved decision tree visualization to decision_tree.png")

    # 8) Example of using the saved model later to get human-friendly labels
    # Note: The model predicts either "Low" or "Popular". If you want to display
    #       "Low Performing" to users, you can map it as follows when predicting:
    # loaded = joblib.load("popularity_model.pkl")
    # example = pd.DataFrame([
    #     {"price": 19.99, "rating": 4.5, "num_reviews": 120, "category": "Snacks"}
    # ])
    # pred = loaded.predict(example)[0]  # "Low" or "Popular"
    # human_readable = "Low Performing" if pred == "Low" else "Popular"
    # print("Prediction:", human_readable)


if __name__ == "__main__":
    # Execute end-to-end training when run as a script
    train_and_evaluate()


