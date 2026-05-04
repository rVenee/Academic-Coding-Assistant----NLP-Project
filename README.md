# 🚀 Academic Coding Assistant - NLP Project

Karena file model AI (otak) dan environment Python terlalu besar, file tersebut **tidak ikut diunggah** ke GitHub. Kamu harus mengunduh dan menyiapkannya sendiri di komputermu. 

Ikuti langkah-langkah di bawah ini secara berurutan:

## 🛠️ Tahap 1: Mengunduh Kode & Setup Environment

1. Buka **Terminal** / **Command Prompt** / **Git Bash** di foldermu.
2. *Clone* repositori ini dengan perintah berikut:
   ```bash
   git clone https://github.com/rVenee/Academic-Coding-Assistant----NLP-Project.git
3. Masuk ke dalam folder proyek:
   ```bash
   cd Academic-Coding-Assistant----NLP-Project
4. Buat virtual environment baru:
   ```bash
   python -m venv env
5. Aktifkan virtual environment:
   ```bash
   env\Scripts\activate
  (Pastikan ada tulisan (env) di awal baris terminalmu).

## 📦 Tahap 2: Instalasi Pustaka (Dependencies)
Pastikan (env) masih aktif, lalu jalankan perintah ini untuk menginstal semua pustaka yang dibutuhkan:
```bash
pip install "llama-cpp-python[server]" fastapi uvicorn requests
```
Kalau Error Pakai Ini:
```bash
pip install "llama-cpp-python[server]" --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu
```

## 🧠 Tahap 3: Mengunduh "Otak" AI (Penting!)
1. Di dalam folder proyek utama, buat folder baru bernama models.
2. Buka browser dan pergi ke HuggingFace untuk mendownload model Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf (ukurannya sekitar 4.6 GB).
3. Pindahkan file .gguf yang sudah di-download tersebut ke dalam folder models.

## 🚀 Tahap 4: Menjalankan Aplikasi
(Lakukan tahap ini setiap kali kamu ingin membuka aplikasi)

Kamu membutuhkan DUA terminal yang berjalan bersamaan. Pastikan kedua terminal ini sudah mengaktifkan (env).

Terminal 1: Menyalakan Server AI
Jalankan perintah ini dan biarkan menyala:
```bash
python -m llama_cpp.server --model models/Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf --n_ctx 4096 --port 8000
```
(Tunggu sampai muncul tulisan Uvicorn running on [http://0.0.0.0:8000]
(http://0.0.0.0:8000))

Terminal 2: Menyalakan Web Frontend
Buka terminal baru, pastikan masuk ke folder proyek dan aktifkan env, lalu jalankan:
```bash
python app.py
```
(Tunggu sampai muncul tulisan Web Server Aplikasi berjalan di http://localhost:5000)

# 🌐 Buka di Browser
### Buka Google Chrome atau browser lainnya dan ketik alamat berikut:
http://localhost:5000

# 🎉 Selesai! Aplikasi siap digunakan.
