import urllib.request
import json

token = "eyJhbGciOiJIUzI1NiJ9.eyJ0eXBlIjoiVVNFUiIsInRpZCI6InRlbmFudC0xIiwidWlkIjoiMGEwYjYzM2EtZjI3Ni00MzY2LTk0YmMtYTQyMTcxN2ZkNzk1IiwiaWF0IjoxNzc4NzQyMzUxLCJleHAiOjE3NzkzNDcxNTF9.x2mT8xIGp1Uv339FI_d6ODM1zTs5ZNgo7berXU05AWw"
req = urllib.request.Request(
    'http://localhost:8080/api/followups',
    headers={'Authorization': 'Bearer ' + token}
)
try:
    res = urllib.request.urlopen(req)
    body = res.read().decode()
    print('OK:', body[:500])
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print('HTTP', e.code, body[:500])
except Exception as e:
    print('ERROR:', type(e).__name__, str(e)[:500])
