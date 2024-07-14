import PIL
import torch
from flask import Flask, request
import json
import os

#if not os.path.exists("./cache.json"):
#    with open("./cache.json", "w") as f:
#        f.write("{}")
#
#with open("./cache.json", "r") as f:
#    cache = json.loads(f.read())

app = Flask(__name__)

print("Initializing model...")

try:
    model1 = torch.hub.load('ultralytics/yolov5', 'custom', './safe.pt', device="mps", _verbose=False)
except Exception:
    try:
        model1 = torch.hub.load('ultralytics/yolov5', 'custom', './safe.pt', device=0, _verbose=False)
    except Exception:
        model1 = torch.hub.load('ultralytics/yolov5', 'custom', './safe.pt', device="cpu", _verbose=False)

try:
    model2 = torch.hub.load('ultralytics/yolov5', 'custom', './explicit.pt', device="mps", _verbose=False)
except Exception:
    try:
        model2 = torch.hub.load('ultralytics/yolov5', 'custom', './explicit.pt', device=0, _verbose=False)
    except Exception:
        model2 = torch.hub.load('ultralytics/yolov5', 'custom', './explicit.pt', device="cpu", _verbose=False)


@app.get("/safe")
def get_safe_prediction():
    if request.args.get("url") is not None:
        if False:
        #if request.args.get("url") in cache:
            return {"error": None, "data": cache[request.args.get("url")]}
        else:
            try:
                result = model1(request.args.get("url"))
                data = result.pandas().xyxy[0].to_json(orient="records")
                #cache[request.args.get("url")] = json.loads(data)
                #
                #with open("./cache.json", "w") as sv:
                #    sv.write(json.dumps(cache))
            except PIL.UnidentifiedImageError:
                return {"error": "Unable to open image", "data": None}
            except Exception as e:
                print(e)
                return {"error": "Internal server error", "data": None}

            return {"error": None, "data": json.loads(data)}
    else:
        return {"error": "Missing url", "data": None}


@app.get("/explicit")
def get_explicit_prediction():
    if request.args.get("url") is not None:
        if False:
        #if request.args.get("url") in cache:
            return {"error": None, "data": cache[request.args.get("url")]}
        else:
            try:
                result = model2(request.args.get("url"))
                data = result.pandas().xyxy[0].to_json(orient="records")
                #cache[request.args.get("url")] = json.loads(data)
                #
                #with open("./cache.json", "w") as sv:
                #    sv.write(json.dumps(cache))
            except PIL.UnidentifiedImageError:
                return {"error": "Unable to open image", "data": None}
            except Exception as e:
                print(e)
                return {"error": "Internal server error", "data": None}

            return {"error": None, "data": json.loads(data)}
    else:
        return {"error": "Missing url", "data": None}


@app.get("/status")
def get_status():
    return {"error": None, "data": None}


if __name__ == '__main__':
    print("Starting web server on port 25091...")
    app.run(debug=False, port=25091, host="127.0.0.1")