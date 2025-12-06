import webbrowser
import time

BASE_URL = "http://localhost:3000"
MASTER_URL = f"{BASE_URL}/?role=master&ts={int(time.time())}"
SLAVE_URL = f"{BASE_URL}/?role=slave&ts={int(time.time())}"

print("Opening MASTER...")
webbrowser.open_new(MASTER_URL)

time.sleep(0.5)

print("Opening SLAVE...")
webbrowser.open_new(SLAVE_URL)

print("Done.")
