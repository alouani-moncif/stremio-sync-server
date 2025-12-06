import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

VIDEO_HTML_URL = "https://stremio-sync-server-production.up.railway.app/video-sync.html"
MASTER_URL = VIDEO_HTML_URL + "?role=master"
SLAVE_URL  = VIDEO_HTML_URL + "?role=slave"

chrome_options = Options()
chrome_options.add_argument("--disable-gpu")
chrome_options.add_argument("--window-size=1200,900")
# chrome_options.add_argument("--headless=new")

# start SLAVE first
slave_driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
slave_driver.get(SLAVE_URL)
time.sleep(3)

# start MASTER
master_driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=chrome_options)
master_driver.get(MASTER_URL)
WebDriverWait(master_driver,20).until(EC.visibility_of_element_located((By.ID,"controls")))
time.sleep(2)

def click_master_button(label):
    btn = WebDriverWait(master_driver,10).until(EC.element_to_be_clickable((By.XPATH,f"//button[text()='{label}']")))
    btn.click()
    print(f"[MASTER] Clicked: {label}")

command_buttons = ["Play","Pause","Seek +30s","Next Subtitles","Next Audio"]
for label in command_buttons:
    click_master_button(label)
    time.sleep(2)

log_text = slave_driver.find_element(By.ID,"log").text
print("\n--- SLAVE LOG ---\n")
print(log_text)

print("\n--- RESULTS ---")
for label in command_buttons:
    key = label.lower().split()[0]
    if key in log_text.lower():
        print(f"[OK] {label} received")
    else:
        print(f"[FAIL] {label} NOT received")

master_driver.quit()
slave_driver.quit()
