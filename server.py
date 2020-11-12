import sys
from flask import Flask
sys.path.append('./fdeb')


app = Flask(__name__, static_folder='.', static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/experiment')
def experiment():
    return app.send_static_file('./html/experiment.html')

@app.route('/xml', methods=["POST"])
def send_xml():
    return app.send_static_file('./material/airlines.xml')

@app.route('/json', methods=["GET"])
def send_json():
    return app.send_static_file('./json/experimentalColor.json')

@app.route('/favicon.ico')
def favicon():
    return app.send_static_file('./material/favicon.ico')

if __name__ == "__main__":
    app.run(host='127.0.0.1', port=8000, debug=True)
    # app.run(host='0.0.0.0', port=80, debug=True)
