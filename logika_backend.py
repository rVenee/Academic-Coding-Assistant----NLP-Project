import requests

# Alamat server lokal Anda
URL = "http://localhost:8000/v1/chat/completions"

def analisis_kode_dari_frontend(mode, bahasa, kode_input):
    """
    Fungsi ini yang nantinya akan dipanggil saat frontend mengirim data.
    """
    # 1. Racik System Prompt berdasarkan Mode (Penting untuk mata kuliah NLP)
    if mode == "Bug Fixer":
        system_prompt = f"Kamu adalah asisten dosen Informatika ahli debugging. Tugasmu menganalisis kode {bahasa} dari mahasiswa. Jelaskan letak errornya dan berikan perbaikan kodenya dalam Bahasa Indonesia yang terstruktur."
    elif mode == "Explain Code":
        system_prompt = f"Kamu adalah asisten dosen Informatika yang edukatif. Jelaskan alur logika dari kode {bahasa} berikut secara baris demi baris menggunakan Bahasa Indonesia yang mudah dipahami pemula."
    else:
        system_prompt = "Kamu adalah asisten coding AI."

    # 2. Susun data yang akan dikirim ke API
    payload = {
        "messages": [
            {"role": "system", "content": system_prompt},
            # Membungkus kode dengan markdown agar AI tahu itu blok kode
            {"role": "user", "content": f"Tolong proses kode berikut:\n\n```{bahasa}\n{kode_input}\n```"}
        ],
        "temperature": 0.2, # Suhu rendah (0.2) sangat penting untuk coding agar AI logis dan tidak halusinasi
        "max_tokens": 1024  # Alokasi jawaban yang lebih panjang
    }

    print(f"🔄 Memproses mode '{mode}' untuk bahasa {bahasa}...\n")
    
    # 3. Kirim ke Server LLM Llama.cpp
    try:
        response = requests.post(URL, json=payload)
        if response.status_code == 200:
            hasil = response.json()
            return hasil['choices'][0]['message']['content']
        else:
            return f"❌ Error dari API: {response.status_code} - {response.text}"
    except Exception as e:
        return f"❌ Gagal menghubungi server AI: {e}"

# ==========================================
# SIMULASI KIRIMAN DARI TIM FRONTEND
# ==========================================

# Ceritanya user memasukkan kode C++ yang error di UI
kode_dari_user = """
int* ptr;
*ptr = 10;
"""

# Memanggil fungsi Bug Fixer
hasil_bug_fixer = analisis_kode_dari_frontend("Bug Fixer", "C++", kode_dari_user)

print("🤖 HASIL ANALISIS BUG FIXER:")
print("-" * 40)
print(hasil_bug_fixer)