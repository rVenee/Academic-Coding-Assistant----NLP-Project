async function analyzeCode() {
    const codeInput = document.getElementById('codeInput');
    const code = codeInput.value;
    const responseArea = document.getElementById('aiResponse');
    
    const modeElement = document.getElementById('modeSelect');
    const langElement = document.getElementById('langSelect');
    const modelSelect = document.getElementById('modelSelect'); // Ambil Data Dropdown AI
    
    const mode = modeElement ? modeElement.value : "Bug Fixer";
    const bahasa = langElement ? langElement.value : "C++";
    const modelPilihan = modelSelect ? modelSelect.value : "qwen2.5-coder-3b-instruct-q4_k_m.gguf";
    
    const userPromptArea = document.getElementById('userPromptText');
    
    if (!code.trim()) {
        alert("Silakan masukkan kode atau instruksi terlebih dahulu!");
        return;
    }

    if (userPromptArea) {
        if (mode === "Bug Fixer") {
            userPromptArea.innerText = `Tolong analisis dan perbaiki error pada kode ${bahasa} ini.`;
        } else if (mode === "Explainer") {
            userPromptArea.innerText = `Tolong jelaskan alur logika dari kode ${bahasa} ini.`;
        } else if (mode === "Generate Code") {
            userPromptArea.innerText = `Buatkan kode ${bahasa} berdasarkan deskripsi berikut.`;
        } else if (mode === "Benchmarking") {
            userPromptArea.innerText = `Jalankan Benchmarking (3 Model + 1 Judge) untuk instruksi ${bahasa} ini. (Sabar ya, butuh waktu...)`;
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
                nama_file_model: modelPilihan // Kirim AI Pilihan ke Python
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
    const judgeText = data.penilaian_hakim;
    const winnerMatch = judgeText.match(/\[WINNER:\s*(.*?)\]/i);
    
    if (winnerMatch && winnerMatch[1]) {
        let winnerName = winnerMatch[1].replace(/Jawaban\s/ig, '').trim();
        let winnerId = 'model-' + winnerName.replace(/\s+/g, '-');
        let winnerDiv = document.getElementById(winnerId);
        
        if (winnerDiv) {
            winnerDiv.classList.add('winner-highlight');
            winnerDiv.innerHTML = '<div class="winner-badge"><i class="fas fa-trophy"></i> TERBAIK</div>' + winnerDiv.innerHTML;
        }
        // Hapus Tag rahasianya dari teks Hakim
        judgeDiv.innerHTML = judgeDiv.innerHTML.replace(/\[WINNER:\s*.*?\]/gi, '');
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
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('themeToggleBtn');
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if(themeBtn) themeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
    
    const modeSelect = document.getElementById('modeSelect');
    const codeInput = document.getElementById('codeInput');
    
    if (modeSelect && codeInput) {
        modeSelect.addEventListener('change', (e) => {
            if (e.target.value === "Generate Code") {
                codeInput.placeholder = "Contoh: Buatkan fungsi kalkulator sederhana dengan validasi input...";
            } else if (e.target.value === "Benchmarking") {
                codeInput.placeholder = "Masukkan instruksi tantangan algoritma untuk diuji oleh 3 model...";
            } else {
                codeInput.placeholder = "Paste (Tempel) kode Anda di sini...";
            }
        });
    }
});