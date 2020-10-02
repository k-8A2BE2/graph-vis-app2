import sys
from flask import Flask
sys.path.append('./fdeb')


app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/xml', methods=["POST"])
def send_data():
    return app.send_static_file('airlines.xml')


    


if __name__ == "__main__":
    # app.run(host='127.0.0.1', port=8000, debug=True)
    app.run(host='0.0.0.0', port=8842, debug=True)
