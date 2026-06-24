import gc
import ast
import os
import tempfile
import subprocess
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from llama_cpp import Llama
import uvicorn

app = FastAPI()

#MANAJEMEN MEMORI
global_llm = None
current_model_path = ""

def get_llm(model_path):
    global global_llm, current_model_path
    if current_model_path != model_path:
        print(f"\n🔄 [SYSTEM] Menukar model di memori...")
        if global_llm is not None:
            del global_llm  
            gc.collect()    
            
        print(f"⏳ [SYSTEM] Memuat model baru: {model_path}...")
        global_llm = Llama(model_path=model_path, n_ctx=2048, n_gpu_layers=-1, verbose=False)
        current_model_path = model_path
        print("✅ [SYSTEM] Model berhasil dimuat!")
    return global_llm

#DAFTAR MODEL
MODEL_JUDGE = "models/Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf"

MODELS_BENCHMARK = [
    {"name": "IBM Granite 2B", "path": "models/granite-3.0-2b-instruct-Q4_K_M.gguf"},
    {"name": "Qwen2.5 Coder 3B", "path": "models/qwen2.5-coder-3b-instruct-q4_k_m.gguf"},
    {"name": "Llama 3.2 3B", "path": "models/llama-3.2-3b-instruct-q4_k_m.gguf"}
]

UNIVERSAL_STOP_TOKENS = [
    "<|im_end|>", "<|endoftext|>", "<|eot_id|>", "</s>", 
    "[/INST]", "[INST]", "<|EOT|>", "<>", "[INPUT]", "```\n\n",
    "<></SYS>>", "### Instruction:", "### Response:", "<|im_start|>"
]

app.mount("/static", StaticFiles(directory="frontend"), name="static")

@app.get("/")
def read_root():
    return FileResponse("frontend/index.html")

@app.post("/api/chat")
async def chat_endpoint(request: Request):
    data = await request.json()
    mode = data.get("mode", "Explain Code")
    bahasa = data.get("bahasa", "C++")
    kode = data.get("kode", "")
    nama_file_model = data.get("nama_file_model", "qwen2.5-coder-3b-instruct-q4_k_m.gguf")
    benchmark_task = data.get("benchmark_task", "Bug Fixer")

    if mode == "Benchmarking":
        print(f"\n>>> Request Masuk: Mode [{mode}] | Bahasa [{bahasa}] | Task [{benchmark_task}] -> (Menguji 3 Model)")
    else:
        print(f"\n>>> Request Masuk: Mode [{mode}] | Bahasa [{bahasa}] | Model [{nama_file_model}]")

    # PRE-CHECKING KHUSUS EXPLAINER
    is_explainer = (mode == "Explainer") or (mode == "Benchmarking" and benchmark_task == "Explainer")
    
    if is_explainer:
        error_msg = None
        
        # 1. Cek Sintaks Python
        if bahasa == "Python":
            try:
                ast.parse(kode)
            except SyntaxError as e:
                error_msg = f"Baris {e.lineno}: {e.msg}"
                
        # 2. Cek Sintaks JavaScript
        elif bahasa == "JavaScript": 
            with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as temp_js:
                temp_js.write(kode.encode('utf-8'))
                temp_js_path = temp_js.name
                
            try:
                result = subprocess.run(['node', '-c', temp_js_path], capture_output=True, text=True)
                if result.returncode != 0:
                    error_msg = result.stderr.strip().split('\n')[0]
            finally:
                os.remove(temp_js_path)
                
        # 3. Cek Sintaks C++
        elif bahasa == "C++":
            with tempfile.NamedTemporaryFile(suffix=".cpp", delete=False) as temp_cpp:
                temp_cpp.write(kode.encode('utf-8'))
                temp_cpp_path = temp_cpp.name
                
            try:
                result = subprocess.run(['g++', '-fsyntax-only', temp_cpp_path], capture_output=True, text=True)
                if result.returncode != 0:
                    error_msg = result.stderr.strip().split('\n')[0]
            finally:
                os.remove(temp_cpp_path)

        # Jika ada error dari salah satu bahasa
        if error_msg:
            print(f"🛑 [SATPAM CERDAS] Mencegat eksekusi! Ditemukan Syntax Error pada {bahasa}.")
            pesan_cegatan = (
                f"⚠️ **Sistem mendeteksi Syntax Error pada kode {bahasa} Anda!**\n\n"
                f"**Detail:** `{error_msg}`\n\n"
                f"💡 *Sistem menolak menjelaskan tata bahasa kode yang rusak. Silakan gunakan mode **Bug Fixer** terlebih dahulu untuk memperbaikinya.*"
            )
            return {"status": "success", "mode": "Interupsi", "data": pesan_cegatan}

    # 1. MODE REGULER (Bug Fixer, Explainer, Generate Code)
    if mode != "Benchmarking":
        if mode == "Bug Fixer":
            system_prompt = (
                f"Kamu adalah asisten pemrograman akademik yang objektif. Analisis dan perbaiki error pada kode {bahasa} berikut.\n"
                f"WAJIB JAWAB DALAM BAHASA INDONESIA yang baku dan rapi.\n"
                f"Fokus pada perbaikan logika yang benar. Jangan mengulang-ulang kalimat penjelasan yang sama."
            )
        elif mode == "Explainer":
            system_prompt = (
                f"Kamu adalah asisten pengajar Ilmu Komputer. Jelaskan cara kerja dan alur logika dari kode {bahasa} berikut.\n"
                f"WAJIB JAWAB DALAM BAHASA INDONESIA secara singkat, padat, menggunakan poin-poin (bullet points).\n"
                f"Fokus pada penjelasan alur data, jangan mencari error."
            )
        elif mode == "Generate Code":
            system_prompt = (
                f"Kamu adalah developer software ahli. Buatkan kode {bahasa} berdasarkan instruksi berikut menggunakan best practices.\n"
                f"Tuliskan komentar penjelasan kode langsung di dalam baris kode (inline comment) menggunakan BAHASA INDONESIA."
            )

        path_dinamis = f"models/{nama_file_model}"
        llm = get_llm(path_dinamis)
        try:
            response = llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"```{bahasa}\n{kode}\n```"}
                ],
                temperature=0.1,
                repeat_penalty=1.05,
                frequency_penalty=0.0,
                presence_penalty=0.1,         
                max_tokens=1024,    
                stop=UNIVERSAL_STOP_TOKENS
            )
            
            jawaban = response['choices'][0]['message']['content'].strip()
            for token in ["[INST]", "[/INST]", "###", "User:"]:
                if token in jawaban:
                    jawaban = jawaban.split(token)[0].strip()
                    
            return {"status": "success", "mode": mode, "data": jawaban}
        
        except Exception as e:
            return {"status": "error", "message": str(e)}

    # 2. MODE BENCHMARKING (3 Pekerja + 1 Hakim)
    else:
        if benchmark_task == "Bug Fixer":
            sys_prompt = f"Perbaiki error pada kode {bahasa} berikut. Langsung berikan kode yang benar dan penjelasan singkat."
            label_instruksi = f"🎯 [Misi: Perbaiki Bug]\nTolong perbaiki dan jelaskan kode {bahasa} berikut:\n\n{kode}"
        elif benchmark_task == "Explainer":
            sys_prompt = f"Jelaskan cara kerja kode {bahasa} berikut secara poin per poin. Singkat, padat, dan jelas."
            label_instruksi = f"🧠 [Misi: Jelaskan Kode]\nTolong jelaskan alur logika kode {bahasa} berikut secara detail:\n\n{kode}"
        elif benchmark_task == "Generate Code":
            sys_prompt = f"Buatkan kode {bahasa} berdasarkan instruksi berikut dengan efisien."
            label_instruksi = f"✨ [Misi: Buat Kode Baru]\nBuatkan program {bahasa} berdasarkan instruksi berikut:\n\n{kode}"
        else:
            sys_prompt = f"Selesaikan instruksi {bahasa} berikut."
            label_instruksi = kode

        laporan_benchmark = {
            "status": "success", 
            "mode": "Benchmarking", 
            "bahasa": bahasa, 
            "kode_instruksi": label_instruksi,
            "hasil_pekerja": [], 
            "penilaian_hakim": ""
        }
        
        jawaban_untuk_hakim = []

        # A. Eksekusi 3 Model AI
        for model in MODELS_BENCHMARK:
            try:
                llm_worker = get_llm(model['path'])          

                response = llm_worker.create_chat_completion(
                    messages=[
                        {"role": "system", "content": sys_prompt},
                        {"role": "user", "content": kode}
                    ],
                    temperature=0.15,
                    max_tokens=600,
                    repeat_penalty=1.1,
                    stop=UNIVERSAL_STOP_TOKENS 
                )
                
                jawaban_mentah = response['choices'][0]['message']['content'].strip()
                for token in ["[INST]", "[/INST]", "<>", "[INPUT]", "###", "User:", "<|eot_id|>"]:
                    if token in jawaban_mentah: 
                        jawaban_mentah = jawaban_mentah.split(token)[0] 
                
                jawaban_bersih = jawaban_mentah.strip()
                
                # PELINDUNG MEMORI HAKIM (TRUNCATION)
                teks_untuk_hakim = jawaban_bersih
                if len(teks_untuk_hakim) > 1000:
                    teks_untuk_hakim = teks_untuk_hakim[:1000] + "\n...[Teks dipotong oleh sistem untuk menghemat memori]..."
                
                jawaban_untuk_hakim.append(f"Jawaban {model['name']}:\n{teks_untuk_hakim}\n")
                
                laporan_benchmark["hasil_pekerja"].append({"nama_model": model['name'], "jawaban": jawaban_bersih})

            except Exception as e:
                laporan_benchmark["hasil_pekerja"].append({"nama_model": model['name'], "jawaban": f"*Gagal memproses: {str(e)}*"})

        # B. Eksekusi Juri (Hakim 7B)
        kriteria_tambahan = "Pilih yang paling akurat, efisien, dan rapi."
        if benchmark_task == "Bug Fixer":
            kriteria_tambahan = "PENTING: Kode dari user PASTI MENGANDUNG BUG. Model yang mengatakan 'tidak ada error' adalah SALAH BESAR. Pemenang adalah model yang berhasil menemukan bug dan memperbaikinya."
        elif benchmark_task == "Explainer":
            kriteria_tambahan = "Pemenang adalah model yang penjelasannya paling mudah dipahami dan tidak berulang-ulang (looping)."
        elif benchmark_task == "Generate Code":
            kriteria_tambahan = "Pemenang adalah model yang kodenya paling bersih dan bebas dari halusinasi."

        judge_prompt = (
            f"Kamu adalah Dosen Pemrograman (Hakim Independen). Evaluasi 3 jawaban asisten AI ini untuk instruksi kode {bahasa} berikut:\n"
            f"[Instruksi Asli]: {kode[:500]}...\n\n"
            f"{kriteria_tambahan}\n\n"
            f"Berikut adalah evaluasi performa model:\n"
            f"{''.join(jawaban_untuk_hakim)}\n"
            f"Berdasarkan data di atas, tentukan pemenangnya. WAJIB patuhi format struktur berikut di awal jawabanmu:\n"
            f"PEMENANG: [Nama Model yang menang]\n"
            f"SKOR: [Nama Model 1]: X/10, [Nama Model 2]: Y/10, [Nama Model 3]: Z/10 (Gunakan angka desimal jika perlu, misal 9.5/10)\n\n"
            f"Setelah format di atas, berikan alasan analitis singkatmu mengapa skor tersebut diberikan."
        )

        try:
            llm_judge = get_llm(MODEL_JUDGE)
            response_judge = llm_judge.create_chat_completion(
                messages=[{"role": "system", "content": "Kamu adalah Juri objektif yang tegas."}, {"role": "user", "content": judge_prompt}],
                temperature=0.1,
                max_tokens=1024,
                stop=UNIVERSAL_STOP_TOKENS
            )
            
            teks_penilaian = response_judge['choices'][0]['message']['content'].strip()
            laporan_benchmark["penilaian_hakim"] = teks_penilaian

            pemenang_terdeteksi = "Tidak ada"
            baris_penilaian = teks_penilaian.split('\n')
            
            for baris in baris_penilaian:
                if "PEMENANG:" in baris.upper():
                    kandidat_pemenang = baris.split(":", 1)[1].strip()
                    for model in MODELS_BENCHMARK:
                        if model['name'].lower() in kandidat_pemenang.lower():
                            pemenang_terdeteksi = model['name']
                            break
                    break
            
            laporan_benchmark["pemenang_benchmark"] = pemenang_terdeteksi

        except Exception as e:
            laporan_benchmark["penilaian_hakim"] = f"*Hakim gagal menilai: {str(e)}*"
            laporan_benchmark["pemenang_benchmark"] = "Error"

        return laporan_benchmark

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)