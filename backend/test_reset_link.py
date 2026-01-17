import requests
url = 'http://127.0.0.1:8000/api/auth/firebase/reset-password/'
resp = requests.post(url, json={'email':'javerdomaraya7@gmail.com'})
print(resp.status_code)
print(resp.text)
