import requests

def test1():
    print("----- test1 -----")
    req = requests.get("http://127.0.0.1:7878/file?game=classic&category=any&level=1")
    json_data = req.json()

    if req.status_code != 200:
        print("haha error:", json_data["error"])
        return
    
    print("got this tas file:", json_data["content"])
    print("file is supposed to be", json_data["stats"]["frames"], "frames")

def test2():
    print("----- test2 -----")
    req = requests.get("http://127.0.0.1:7878/all")
    json_data = req.json()
    for game in json_data:
        for category in json_data[game]:
            for level in json_data[game][category]:
                print(game, category, level)

def test3():
    print("----- test3 -----")
    req = requests.post("http://127.0.0.1:7878/file?game=classic&category=any&level=1", "new file content (not a valid tas :)")
    print(req.json())

test1()
test2()

test3()
test1()
