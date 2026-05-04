import requests
import json

URL = "http://localhost:8000/v1/chat/completions"

payload = {
    "messages": [
        {"role": "system", "content": "Kamu adalah asisten dosen yang galak tapi pintar. Jawab dengan singkat dan jelas."},
        {"role": "user", "content": "Kenapa array di C++ dimulai dari index 0?"}
    ],
    "temperature": 0.7,
    "max_tokens": 500
}

print("Sedang mengirim pertanyaan ke AI... (Tunggu sebentar)\n")

try:
    response = requests.post(URL, json=payload)
    if response.status_code == 200:
        hasil = response.json()
        jawaban_ai = hasil['choices'][0]['message']['content']
        print("🤖 Jawaban AI:")
        print("-" * 30)
        print(jawaban_ai)
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
except requests.exceptions.ConnectionError:
    print("❌ Error: Tidak bisa terhubung ke server. Pastikan server llama.cpp masih menyala di terminal lain!")