async function analyzeCode() {
    const codeInput = document.getElementById('codeInput');
    const code = codeInput.value;
    const responseArea = document.getElementById('aiResponse');
    
    const modeElement = document.getElementById('modeSelect');
    const langElement = document.getElementById('langSelect');
    const modelSelect = document.getElementById('modelSelect'); // Ambil Data Dropdown AI
    const benchmarkTaskSelect = document.getElementById('benchmarkTaskSelect');
    
    const mode = modeElement ? modeElement.value : "Bug Fixer";
    const bahasa = langElement ? langElement.value : "C++";
    const modelPilihan = modelSelect ? modelSelect.value : "qwen2.5-coder-3b-instruct-q4_k_m.gguf";
    const benchmarkTask = benchmarkTaskSelect ? benchmarkTaskSelect.value : "Bug Fixer";
    
    const userPromptArea = document.getElementById('userPromptText');
    
    if (!code.trim()) {
        alert("Silakan masukkan kode atau instruksi terlebih dahulu!");
        return;
    }

    let MAX_CHARS = 3000; // Batas wajar untuk fitur dasar (1 AI)
    
    // Jika masuk mode kompetisi (4 AI sekaligus), ketatkan sabuk pengaman!
    if (mode === "Benchmarking") {
        MAX_CHARS = 1200;
    }

    if (code.length > MAX_CHARS) {
        let pesan = `⚠️ Teks terlalu panjang! Maksimal ${MAX_CHARS} karakter untuk mode ${mode}.\nTeks Anda saat ini: ${code.length} karakter.`;
        
        if (mode === "Benchmarking") {
            pesan += `\n\n💡 Tips Benchmarking: Masukkan potongan fungsi yang spesifik saja untuk menghemat memori Juri AI.`;
        }
        
        alert(pesan);
        return;
    }

    if (userPromptArea) {
        // 1. Munculkan elemen ke layar
        userPromptArea.style.display = 'block'; 
        
        // 2. Tambahkan sedikit styling agar terlihat seperti kotak instruksi yang rapi
        userPromptArea.style.padding = '12px 15px';
        userPromptArea.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'; // Background biru transparan
        userPromptArea.style.borderLeft = '4px solid var(--accent-blue)';
        userPromptArea.style.marginBottom = '20px';
        userPromptArea.style.borderRadius = '6px';
        userPromptArea.style.fontSize = '13.5px';

        // 3. Set teks instruksinya
        if (mode === "Bug Fixer") {
            userPromptArea.innerHTML = `💡 <strong>Misi:</strong> Tolong analisis dan perbaiki error pada kode <strong>${bahasa}</strong> ini.`;
        } else if (mode === "Explainer") {
            userPromptArea.innerHTML = `💡 <strong>Misi:</strong> Tolong jelaskan alur logika dari kode <strong>${bahasa}</strong> ini.`;
        } else if (mode === "Generate Code") {
            userPromptArea.innerHTML = `💡 <strong>Misi:</strong> Buatkan kode <strong>${bahasa}</strong> berdasarkan deskripsi berikut.`;
        } else if (mode === "Benchmarking") {
            userPromptArea.innerHTML = `💡 <strong>Misi:</strong> Jalankan Benchmarking otomatis untuk instruksi <strong>${bahasa}</strong> ini.`;
        }
    }

    responseArea.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; color: var(--accent-blue);">
            <i class="fas fa-spinner fa-spin"></i>
            <p>AI sedang memproses instruksi Anda. Harap tunggu...</p>
        </div>
    `;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                mode: mode,
                bahasa: bahasa,
                kode: code,
                nama_file_model: modelPilihan,
                benchmark_task: benchmarkTask // KIRIM KE PYTHON
            })
        });

        const result = await response.json();

        if (result.status === "success") {
            if (result.mode === "Benchmarking") {
                // Jalankan fungsi Isolasi UI Khusus Benchmarking
                renderBenchmarking(result, responseArea);
            } else {
                // Tampilan Mode Reguler
                responseArea.innerHTML = marked.parse(result.data);
            }
        } else {
            responseArea.innerHTML = `<p style="color:#ef4444"><i class="fas fa-exclamation-triangle"></i> Error dari Sistem: ${result.message}</p>`;
        }

    } catch (error) {
        responseArea.innerHTML = `<p style="color:#ef4444"><i class="fas fa-plug"></i> Error: Gagal membaca data dari server. Periksa Console browser.</p>`;
        console.error(error);
    }
}

// FUNGSI ISOLASI UI BENCHMARKING & HIGHLIGHT PEMENANG
function renderBenchmarking(data, container) {
    container.innerHTML = "";
    
    let headerHtml = `
        <h3 style="color: var(--accent-blue);">📊 Laporan Benchmarking Otomatis</h3>
        <p><strong>Bahasa:</strong> ${data.bahasa}</p>
        <p><strong>Instruksi:</strong></p>
        ${marked.parse("\`\`\`\\n" + data.kode_instruksi + "\\n\`\`\`")}
        <hr style="margin: 20px 0; border-color: var(--border-color);">
    `;
    container.innerHTML = headerHtml;

    // Bikin kotak satu per satu untuk mencegah output menyatu
    data.hasil_pekerja.forEach((pekerja) => {
        const modelDiv = document.createElement('div');
        modelDiv.className = 'model-container';
        modelDiv.id = 'model-' + pekerja.nama_model.replace(/\s+/g, '-');
        modelDiv.style.marginBottom = "20px";

        let markdownJawaban = `#### 🤖 ${pekerja.nama_model}\n\n${pekerja.jawaban}`;
        modelDiv.innerHTML = marked.parse(markdownJawaban);
        container.appendChild(modelDiv);
        
        const hr = document.createElement('hr');
        hr.style.borderColor = "var(--border-color)";
        hr.style.marginBottom = "20px";
        container.appendChild(hr);
    });

    const judgeDiv = document.createElement('div');
    judgeDiv.className = 'judge-container';
    let markdownHakim = `#### ⚖️ Penilaian Hakim (Qwen2.5 Coder 7B)\n\n${data.penilaian_hakim}`;
    judgeDiv.innerHTML = marked.parse(markdownHakim);
    container.appendChild(judgeDiv);

    // Deteksi Tag Pemenang dan Beri Warna Hijau
    const pemenang = data.pemenang_benchmark; 

    if (pemenang && pemenang !== "Tidak ada" && pemenang !== "Error") {
        // Cocokkan format ID dengan saat pembuatan div model di atas
        let winnerId = 'model-' + pemenang.replace(/\s+/g, '-');
        let winnerDiv = document.getElementById(winnerId);
        
        if (winnerDiv) {
            winnerDiv.classList.add('winner-highlight');
            winnerDiv.innerHTML = '<div class="winner-badge"><i class="fas fa-trophy"></i> TERBAIK</div>' + winnerDiv.innerHTML;
        }
        
        // (Opsional) Bersihkan teks deklarasi "PEMENANG: ..." dari tampilan Hakim agar UI lebih rapi
        judgeDiv.innerHTML = judgeDiv.innerHTML.replace(/PEMENANG:.*?<\/p>/i, '</p>');
        judgeDiv.innerHTML = judgeDiv.innerHTML.replace(/PEMENANG:.*?(<br>|\n)/i, '');
    }
}

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('themeToggleBtn');
    body.classList.toggle('light-mode');
    if (body.classList.contains('light-mode')) {
        if(themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        localStorage.setItem('theme', 'light');
    } else {
        if(themeBtn) themeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        localStorage.setItem('theme', 'dark');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Logika Tema
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('themeToggleBtn');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if(themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
    
    // Logika Dinamis Dropdown & Placeholder
    const modeSelect = document.getElementById('modeSelect');
    const modelSelect = document.getElementById('modelSelect'); // Ambil elemen dropdown AI
    const codeInput = document.getElementById('codeInput');
    
    if (modeSelect && codeInput) {
        modeSelect.addEventListener('change', (e) => {
            const selectedMode = e.target.value;
            const benchmarkGroup = document.getElementById('benchmarkTaskGroup');
            
            // Ubah Placeholder
            if (selectedMode === "Generate Code") {
                codeInput.placeholder = "Contoh: Buatkan fungsi kalkulator sederhana...";
            } else if (selectedMode === "Benchmarking") {
                codeInput.placeholder = "Masukkan instruksi/kode untuk diuji oleh ke-3 model...";
            } else {
                codeInput.placeholder = "Paste (Tempel) kode Anda di sini...";
            }
            
            // UX Logika Benchmarking
            if (selectedMode === "Benchmarking") {
                if(modelSelect) {
                    modelSelect.disabled = true;
                    modelSelect.style.opacity = '0.4';
                }
                // Tampilkan opsi tugas Benchmarking
                if(benchmarkGroup) benchmarkGroup.style.display = 'flex'; 
            } else {
                if(modelSelect) {
                    modelSelect.disabled = false;
                    modelSelect.style.opacity = '1';
                }
                // Sembunyikan opsi tugas
                if(benchmarkGroup) benchmarkGroup.style.display = 'none';
            }
        });
    }
});