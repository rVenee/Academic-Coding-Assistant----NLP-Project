import gc
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from llama_cpp import Llama
import uvicorn

app = FastAPI()

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

MODEL_JUDGE = "models/Qwen2.5-Coder-7B-Instruct-Q4_K_M.gguf"

MODELS_BENCHMARK = [
    {"name": "DeepSeek Coder 1.3B", "path": "models/deepseek-coder-1.3b-instruct.Q4_K_M.gguf"},
    {"name": "Qwen2.5 Coder 3B", "path": "models/qwen2.5-coder-3b-instruct-q4_k_m.gguf"},
    {"name": "Llama 3.2 3B", "path": "models/llama-3.2-3b-instruct-q4_k_m.gguf"}
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

    print(f"\n>>> Request Masuk: Mode [{mode}] | Bahasa [{bahasa}] | Model [{nama_file_model}]")

    if mode != "Benchmarking":
        if mode == "Bug Fixer":
            system_prompt = f"Kamu adalah 'Academic Coding Assistant'. Analisis error kode {bahasa} ini. Beri petunjuk, BUKAN kode matang."
        elif mode == "Explainer":
            system_prompt = (
                f"Kamu adalah 'Academic Coding Assistant'. "
                f"ATURAN MUTLAK: Periksa apakah kode {bahasa} ini error. Jika ERROR, JANGAN jelaskan! "
                f"Balas saja: '🚨 **Maaf, kode Anda sepertinya error.** Silakan ubah ke mode **Bug Fixer**.' "
                f"Jika BENAR, jelaskan baris demi baris untuk pemula."
            )
        elif mode == "Generate Code":
            system_prompt = f"Kamu adalah 'Academic Coding Assistant'. Buatkan kode {bahasa} berdasarkan instruksi. Gunakan best practices."

        path_dinamis = f"models/{nama_file_model}"
        llm = get_llm(path_dinamis)
        try:
            response = llm.create_chat_completion(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"```{bahasa}\n{kode}\n```"}
                ],
                temperature=0.2, max_tokens=1024
            )
            return {"status": "success", "mode": mode, "data": response['choices'][0]['message']['content']}
        except Exception as e:
            return {"status": "error", "message": str(e)}

    else:
        laporan_benchmark = {
            "status": "success", "mode": "Benchmarking", "bahasa": bahasa, "kode_instruksi": kode,
            "hasil_pekerja": [], "penilaian_hakim": ""
        }
        
        jawaban_untuk_hakim = []

        for model in MODELS_BENCHMARK:
            try:
                llm_worker = get_llm(model['path'])
                response = llm_worker.create_chat_completion(
                    messages=[
                        {"role": "system", "content": f"Selesaikan instruksi pemrograman {bahasa} berikut dengan langsung memberikan kodenya tanpa bertele-tele."},
                        {"role": "user", "content": kode}
                    ],
                    temperature=0.2, max_tokens=512,
                    stop=["<|im_end|>", "<|endoftext|>", "<|eot_id|>", "</s>", "[/INST]", "[INST]", "<|EOT|>", "<>", "[INPUT]"] 
                )
                
                jawaban_mentah = response['choices'][0]['message']['content']
                for token in ["[INST]", "[/INST]", "<>", "[INPUT]", "###", "User:", "<|eot_id|>"]:
                    if token in jawaban_mentah: jawaban_mentah = jawaban_mentah.split(token)[0] 
                
                jawaban_bersih = jawaban_mentah.strip()
                jawaban_untuk_hakim.append(f"Jawaban {model['name']}:\n{jawaban_bersih}\n")
                
                laporan_benchmark["hasil_pekerja"].append({"nama_model": model['name'], "jawaban": jawaban_bersih})

            except Exception as e:
                laporan_benchmark["hasil_pekerja"].append({"nama_model": model['name'], "jawaban": f"*Gagal memproses: {str(e)}*"})

        judge_prompt = (
            f"Kamu adalah Dosen Pemrograman (Hakim Independen). Evaluasi 3 jawaban asisten AI ini untuk instruksi kode {bahasa}. "
            f"Pilih satu yang paling akurat, efisien, dan rapi. Berikan alasan singkat.\n"
            f"ATURAN MUTLAK: Di akhir kalimat, WAJIB menuliskan format ini (pilih salah satu): "
            f"[WINNER: DeepSeek Coder 1.3B] atau [WINNER: Qwen2.5 Coder 3B] atau [WINNER: Llama 3.2 3B]\n\n"
            f"Kumpulan Jawaban:\n" + "\n".join(jawaban_untuk_hakim)
        )

        try:
            llm_judge = get_llm(MODEL_JUDGE)
            response_judge = llm_judge.create_chat_completion(
                messages=[{"role": "system", "content": "Kamu adalah Juri objektif untuk kompetisi pemecahan kode."}, {"role": "user", "content": judge_prompt}],
                temperature=0.1, max_tokens=512
            )
            laporan_benchmark["penilaian_hakim"] = response_judge['choices'][0]['message']['content']
        except Exception as e:
            laporan_benchmark["penilaian_hakim"] = f"*Hakim gagal menilai: {str(e)}*"

        return laporan_benchmark

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=5000)