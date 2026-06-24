async function analyzeCode() {
    const codeInput = document.getElementById('codeInput');
    const code = codeInput.value;
    const responseArea = document.getElementById('aiResponse');
    
    const modeElement = document.getElementById('modeSelect');
    const langElement = document.getElementById('langSelect');
    const modelSelect = document.getElementById('modelSelect');
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

    let MAX_CHARS = 3000;
    
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
        userPromptArea.style.display = 'block'; 
        userPromptArea.style.padding = '12px 15px';
        userPromptArea.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
        userPromptArea.style.borderLeft = '4px solid var(--accent-blue)';
        userPromptArea.style.marginBottom = '20px';
        userPromptArea.style.borderRadius = '6px';
        userPromptArea.style.fontSize = '13.5px';

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
                benchmark_task: benchmarkTask
            })
        });

        const result = await response.json();

        if (result.status === "success") {
            if (result.mode === "Benchmarking") {
                renderBenchmarking(result, responseArea);
            } else {
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

function renderBenchmarking(data, container) {
    container.innerHTML = "";

    let headerHtml = `
        <h3 style="color: var(--accent-blue);">📊 Laporan Benchmarking Otomatis</h3>
        <p><strong>Bahasa:</strong> ${data.bahasa}</p>
        <p><strong>Instruksi:</strong></p>
        ${marked.parse("\`\`\`\n" + data.kode_instruksi + "\n\`\`\`")}
        <hr style="margin: 20px 0; border-color: var(--border-color);">
    `;
    container.innerHTML = headerHtml;

    data.hasil_pekerja.forEach((pekerja) => {
        const modelDiv = document.createElement('div');
        modelDiv.className = 'model-container';
        modelDiv.id = 'model-' + pekerja.nama_model.replace(/\s+/g, '-');
        modelDiv.style.marginBottom = "20px";
        modelDiv.style.position = "relative";

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

    const pemenang = data.pemenang_benchmark; 
    const judgeTextRaw = data.penilaian_hakim;

    let scoreMap = {};
    data.hasil_pekerja.forEach((pekerja) => {
        const regex = new RegExp(pekerja.nama_model.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\s*:\\s*([\\d\\.,]+)", "i");
        const match = judgeTextRaw.match(regex);
        
        if (match && match[1]) {
            scoreMap[pekerja.nama_model] = match[1].replace(',', '.');
        } else {
            scoreMap[pekerja.nama_model] = "-";
        }
    });

    data.hasil_pekerja.forEach((pekerja) => {
        let modelId = 'model-' + pekerja.nama_model.replace(/\s+/g, '-');
        let modelDiv = document.getElementById(modelId);
        let skor = scoreMap[pekerja.nama_model];

        if (modelDiv) {
            if (pekerja.nama_model === pemenang && pemenang !== "Tidak ada" && pemenang !== "Error") {
                modelDiv.classList.add('winner-highlight');
                modelDiv.innerHTML = `<div class="winner-badge"><i class="fas fa-trophy"></i> TERBAIK | Skor: ${skor}</div>` + modelDiv.innerHTML;
            } else {
                modelDiv.innerHTML = `<div class="winner-badge" style="background-color: #64748b; color: white;"><i class="fas fa-star-half-alt"></i> Skor: ${skor}</div>` + modelDiv.innerHTML;
            }
        }
    });

    judgeDiv.innerHTML = judgeDiv.innerHTML.replace(/PEMENANG:.*?<\/p>/gi, '</p>');
    judgeDiv.innerHTML = judgeDiv.innerHTML.replace(/PEMENANG:.*?(<br>|\n)/gi, '');
    judgeDiv.innerHTML = judgeDiv.innerHTML.replace(/SKOR:.*?<\/p>/gi, '</p>');
    judgeDiv.innerHTML = judgeDiv.innerHTML.replace(/SKOR:.*?(<br>|\n)/gi, '');
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
    const modelSelect = document.getElementById('modelSelect');
    const codeInput = document.getElementById('codeInput');
    const benchmarkTaskSelect = document.getElementById('benchmarkTaskSelect');

    if (modeSelect && codeInput) {
        
        const updatePlaceholder = () => {
            const selectedMode = modeSelect.value;
            const selectedTask = benchmarkTaskSelect ? benchmarkTaskSelect.value : "";
            
            const isGenerateCode = selectedMode === "Generate Code" || 
                                  (selectedMode === "Benchmarking" && selectedTask === "Generate Code");

            if (isGenerateCode) {
                codeInput.placeholder = "Tips Generate Code agar AI akurat:\n1. Jelaskan tujuan kode (misal: 'Buatkan fungsi Python untuk sorting data...').\n2. Tentukan algoritma yang diinginkan (misal: 'Gunakan QuickSort').\n3. Minta fitur tambahan (misal: 'Berikan komentar di setiap baris dan tambahkan error handling').\n\nKetik instruksi lengkap Anda di sini...";
            } else if (selectedMode === "Benchmarking") {
                codeInput.placeholder = "Masukkan instruksi, logika, atau kode untuk diuji secara komparatif oleh ke-3 model...\n(Semakin detail instruksinya, semakin adil penilaian Hakim)";
            } else {
                codeInput.placeholder = "Paste (Tempel) kode Anda di sini...";
            }
        };

        modeSelect.addEventListener('change', (e) => {
            updatePlaceholder();
            
            const benchmarkGroup = document.getElementById('benchmarkTaskGroup');
            
            if (e.target.value === "Benchmarking") {
                if(modelSelect) {
                    modelSelect.disabled = true;
                    modelSelect.style.opacity = '0.4';
                }
                if(benchmarkGroup) benchmarkGroup.style.display = 'flex'; 
            } else {
                if(modelSelect) {
                    modelSelect.disabled = false;
                    modelSelect.style.opacity = '1';
                }
                if(benchmarkGroup) benchmarkGroup.style.display = 'none';
            }
        });

        if (benchmarkTaskSelect) {
            benchmarkTaskSelect.addEventListener('change', updatePlaceholder);
        }
        
        updatePlaceholder();
    }
});