from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/')
def home():
    return 'Hello from Flask!'

@app.route('/submit', methods=['POST'])
def submit():
    data = request.get_json()
    return jsonify({"message": "Data received", "data": data}), 201

@app.route('/update/<int:item_id>', methods=['PUT'])
def update(item_id):
    data = request.get_json()
    return jsonify({"message": f"Item {item_id} updated", "data": data}), 200

if __name__ == '__main__':
    app.run(debug=True)

