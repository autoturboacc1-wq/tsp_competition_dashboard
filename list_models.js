import fs from 'fs';

// Manually load .env
try {
    if (fs.existsSync('.env')) {
        const envConfig = fs.readFileSync('.env', 'utf-8');
        envConfig.split('\n').forEach((line) => {
            const [key, ...value] = line.split('=');
            if (key) {
                process.env[key.trim()] = value.join('=').trim();
            }
        });
    }
} catch (e) {
    console.error('Error loading .env file:', e);
}

async function listModels() {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("No GEMINI_API_KEY found in process.env");
            return;
        }

        // Mask key for safety in logs
        // console.log("Using API Key:", apiKey.substring(0, 5) + "...");

        console.log("Fetching available models...");
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
        }

        const data = await response.json();

        if (data.models) {
            console.log("Available Models:");
            data.models.forEach(m => {
                console.log(`- ${m.name} (${m.displayName})`);
                console.log(`  Methods: ${m.supportedGenerationMethods}`);
            });
        } else {
            console.error("Failed to list models:", data);
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

listModels();
