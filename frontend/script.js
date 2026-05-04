async function analyzeCode() {
    // 1. Mengambil input kode dari user
    const code = document.getElementById('codeInput').value;
    const responseArea = document.getElementById('aiResponse');
    
    // 2. Mengambil Mode dan Bahasa (Pastikan ID dropdown di HTML teman Anda sesuai)
    // Jika teman Anda belum membuat dropdown-nya, ini akan otomatis pakai default
    const modeElement = document.getElementById('modeSelect');
    const langElement = document.getElementById('langSelect');
    
    const mode = modeElement ? modeElement.value : "Bug Fixer";
    const bahasa = langElement ? langElement.value : "C++";
    
    const userPromptArea = document.getElementById('userPromptText');
    if (userPromptArea) {
        if (mode === "Bug Fixer") {
            userPromptArea.innerText = `Tolong analisis dan perbaiki error pada kode ${bahasa} ini.`;
        } else {
            userPromptArea.innerText = `Tolong jelaskan alur logika dari kode ${bahasa} ini.`;
        }
    }

    responseArea.innerHTML = "<p>Sedang menganalisis kode... (Mengirim ke Backend FastAPI)</p>";

    try {
        // 3. MENGUBAH URL TARGET KE BACKEND FASTAPI ANDA (Port 5000)
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 4. Struktur data disesuaikan dengan permintaan app.py
            body: JSON.stringify({
                mode: mode,
                bahasa: bahasa,
                kode: code
            })
        });

        const result = await response.json();
        
        // 5. Menyesuaikan cara membaca respon JSON dari app.py
        if (result.status === 'success') {
            const aiText = result.data;
            // Menampilkan hasil ke UI
            responseArea.innerHTML = marked.parse(aiText);
        } else {
            responseArea.innerHTML = `<p style="color:red">Error dari LLM: ${result.message}</p>`;
        }

    } catch (error) {
        responseArea.innerHTML = `<p style="color:red">Error: Pastikan server app.py (localhost:5000) sudah berjalan!</p>`;
        console.error(error);
    }
}