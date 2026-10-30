import os
import re
import base64
from io import BytesIO
from flask import Flask, render_template, request, jsonify
import numpy as np
from PIL import Image
from sklearn.datasets import fetch_openml
from sklearn.neural_network import MLPClassifier
import joblib

app = Flask(__name__)
MODEL_PATH = "web_mnist_model.pkl"

def get_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    
    print("웹용 MNIST 모델 학습 시작...")
    X, y = fetch_openml('mnist_784', version=1, return_X_y=True, as_frame=False)
    X = X / 255.0
    model = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=20, random_state=42)
    model.fit(X[:20000], y[:20000])
    joblib.dump(model, MODEL_PATH)
    return model

model = get_model()

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()
    image_data = data.get("image")

    # Base64 이미지 디코딩
    image_bytes = re.sub("^data:image/.+;base64,", "", image_data)
    img = Image.open(BytesIO(base64.b64decode(image_bytes))).convert("L")
    
    # 28x28 이미지 리사이징
    img = img.resize((28, 28))
    img_array = np.array(img) / 255.0
    img_flat = img_array.reshape(1, -1)

    prediction = model.predict(img_flat)[0]
    probabilities = model.predict_proba(img_flat)[0]
    confidence = round(float(np.max(probabilities)) * 100, 1)

    return jsonify({"prediction": str(prediction), "confidence": confidence})

if __name__ == "__main__":
    print("웹 서버 구동 시작: http://localhost:8000")  #[cite: 1]
    app.run(host="0.0.0.0", port=8000)