from flask import Flask, request, jsonify
from flask_cors import CORS
from matcher import load_labels, match_event

app = Flask(__name__)
CORS(app, resources={r"/match": {"origins": "http://127.0.0.1:5500"}})

print("RUNNING UPDATED SERVER FILE")

labels = load_labels()

@app.route("/match", methods=["POST", "OPTIONS"])
def match():
    data = request.json

    feature = data["feature"]
    file_name = data["file_name"]

    result = match_event(feature, file_name, labels)
    return jsonify(result)

app.run(debug=True)