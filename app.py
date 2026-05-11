from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import requests
import uvicorn

app = FastAPI()

# 1. Melayani file statis (CSS dan JS dari tim Frontend)
app.mount("/static", StaticFiles(directory="frontend"), name="static")

# 2. Menampilkan file HTML saat user membuka web
@app.get("/")
def read_root():
    return FileResponse("frontend/index.html")

# 3. Menerima data dari Frontend dan mengirimnya ke LLM
@app.post("/api/chat")
async def chat_endpoint(request: Request):
    # Menerima data dari script.js
    data = await request.json()
    mode = data.get("mode", "Explain Code")
    bahasa = data.get("bahasa", "C++")
    kode = data.get("kode", "")

    # Logika System Prompt (Tugas Anda sebagai Backend)
    if mode == "Bug Fixer":
        system_prompt = f"Kamu adalah asisten dosen Informatika. Tugasmu menganalisis error pada kode {bahasa} berikut dan memberikan perbaikannya."
    else:
        system_prompt = f"Kamu adalah asisten dosen Informatika. Jelaskan alur logika dari kode {bahasa} berikut baris demi baris."

    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"```{bahasa}\n{kode}\n```"}
        ],
        "temperature": 0.2,
        "max_tokens": 1024
    }

    print(f"Menerima request Frontend: Mode {mode}, Bahasa {bahasa}...")

    # Mengirim ke server Llama.cpp yang sedang menyala di terminal lain
    try:
        response = requests.post("http://localhost:8000/v1/chat/completions", json=payload)
        hasil = response.json()
        
        jawaban_ai = hasil['choices'][0]['message']['content']
        # MENGAMBIL DATA PENGGUNAAN TOKEN DARI LLAMA.CPP
        usage_data = hasil.get('usage', {}) 
        
        return {
            "status": "success", 
            "data": jawaban_ai,
            "usage": usage_data
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    print("🚀 Web Server Aplikasi berjalan di http://localhost:5000")
    uvicorn.run(app, host="127.0.0.1", port=5000)