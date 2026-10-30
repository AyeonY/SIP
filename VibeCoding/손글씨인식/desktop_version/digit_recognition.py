import os
import tkinter as tk
import numpy as np
from PIL import Image, ImageDraw
from sklearn.datasets import fetch_openml
from sklearn.neural_network import MLPClassifier
import joblib

MODEL_PATH = "mnist_model.pkl"

def load_or_train_model():
    if os.path.exists(MODEL_PATH):
        print("기존 학습 모델을 불러옵니다...")
        return joblib.load(MODEL_PATH)
    
    print("MNIST 데이터세트를 불러오고 모델을 학습시킵니다... (최초 1회 실행)")
    # MNIST 데이터셋 불러오기 (7만 장)
    X, y = fetch_openml('mnist_784', version=1, return_X_y=True, as_frame=False)
    X = X / 255.0  # 정규화
    
    # MLP 인공신경망 분류 모델 생성
    model = MLPClassifier(hidden_layer_sizes=(128, 64), max_iter=20, random_state=42)
    model.fit(X[:20000], y[:20000])  # 빠른 생성을 위해 2만 개 샘플 학습
    
    joblib.dump(model, MODEL_PATH)
    print("모델 학습 및 저장 완료!")
    return model

class HandwritingApp:
    def __init__(self, root, model):
        self.root = root
        self.model = model
        self.root.title("Handwritten Digit Recognition")
        self.root.geometry("400x520")

        self.canvas_size = 280
        self.canvas = tk.Canvas(root, width=self.canvas_size, height=self.canvas_size, bg="black")
        self.canvas.pack(pady=20)

        # 캔버스 동기화용 PIL 이미지 객체 생성
        self.image = Image.new("L", (self.canvas_size, self.canvas_size), "black")
        self.draw = ImageDraw.Draw(self.image)

        self.canvas.bind("<B1-Motion>", self.paint)

        # 컨트롤 버튼 생성
        btn_frame = tk.Frame(root)
        btn_frame.pack(pady=10)

        self.btn_clear = tk.Button(btn_frame, text="Clear", command=self.clear_canvas, width=12)
        self.btn_clear.pack(side=tk.LEFT, padx=10)

        self.btn_recognize = tk.Button(btn_frame, text="Recognize", command=self.recognize, width=12)
        self.btn_recognize.pack(side=tk.LEFT, padx=10)

        self.lbl_result = tk.Label(root, text="Draw a digit (0-9) and click Recognize", font=("Helvetica", 13))
        self.lbl_result.pack(pady=10)

    def paint(self, event):
        x, y = event.x, event.y
        r = 10
        self.canvas.create_oval(x-r, y-r, x+r, y+r, fill="white", outline="white")
        self.draw.ellipse([x-r, y-r, x+r, y+r], fill="white")

    def clear_canvas(self):
        self.canvas.delete("all")
        self.draw.rectangle([0, 0, self.canvas_size, self.canvas_size], fill="black")
        self.lbl_result.config(text="Draw a digit (0-9) and click Recognize")

    def recognize(self):
        # 280x280 이미지를 28x28 픽셀 규격으로 축소
        img_resized = self.image.resize((28, 28))
        img_array = np.array(img_resized) / 255.0
        img_flat = img_array.reshape(1, -1)

        prediction = self.model.predict(img_flat)[0]
        probabilities = self.model.predict_proba(img_flat)[0]
        confidence = float(np.max(probabilities)) * 100

        self.lbl_result.config(text=f"Prediction: {prediction} ({confidence:.1f}%)")

if __name__ == "__main__":
    clf = load_or_train_model()
    root = tk.Tk()
    app = HandwritingApp(root, clf)
    root.mainloop()