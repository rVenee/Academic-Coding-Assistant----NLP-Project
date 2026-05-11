async function analyzeCode() {
    // 1. Mengambil input kode dari user
    const code = document.getElementById('codeInput').value;
    const responseArea = document.getElementById('aiResponse');
    
    // 2. Mengambil Mode dan Bahasa (Pastikan ID dropdown di HTML teman Anda sesuai)
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
            
            if (result.usage && result.usage.total_tokens) {
                const totalTokens = result.usage.total_tokens;
                const maxTokens = 4096;
                const percent = (totalTokens / maxTokens) * 10;
                
                // Membuat bar progres simpel dari karakter '|' dan '-'
                let bar = '[';
                for (let i = 0; i < 10; i++) {
                    bar += i < percent ? '|' : '-';
                }
                bar += ']';
                
                const contextElement = document.getElementById('contextIndicator');
                if (contextElement) {
                    contextElement.innerText = `Context: ${bar} ${totalTokens} / 4096 tokens`;
                    
                    // Ubah warna jadi merah jika memori hampir penuh
                    if (totalTokens > 3500) {
                        contextElement.style.color = '#ef4444';
                    } else {
                        contextElement.style.color = '';
                    }
                }
            }

        } else {
            responseArea.innerHTML = `<p style="color:red">Error dari LLM: ${result.message}</p>`;
        }

    } catch (error) {
        responseArea.innerHTML = `<p style="color:red">Error: Pastikan server app.py (localhost:5000) sudah berjalan!</p>`;
        console.error(error);
    }
}

function toggleTheme() {
    const body = document.body;
    const themeBtn = document.getElementById('themeToggleBtn');
    
    body.classList.toggle('light-mode');
    
    if (body.classList.contains('light-mode')) {
        themeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        localStorage.setItem('theme', 'light');
    } else {
        themeBtn.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
        localStorage.setItem('theme', 'dark');
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const themeBtn = document.getElementById('themeToggleBtn');
    
    if (savedTheme === 'light') {
        document.body.classList.add('light-mode');
        if (themeBtn) {
            themeBtn.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
        }
    }
});