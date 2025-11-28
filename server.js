// Kod w CommonJS (CJS) - stabilny na Vercel
require('dotenv').config(); 
const express = require('express');
const cors = require('cors');
const { GoogleGenAI } = require('@google/genai');

const app = express();
// Port nie jest używany przez Serverless, ale potrzebny do lokalnego testowania
const PORT = process.env.PORT || 3000; 

// 1. Inicjalizacja Gemini API
// Klucz jest odczytywany BEZPIECZNIE ze zmiennej środowiskowej
const apiKey = process.env.GEMINI_API_KEY; 
// W Serverless (Vercel) nie musimy wychodzić, ale zostawiamy sprawdzanie
if (!apiKey) {
    console.warn("Ostrzeżenie: Brak klucza GEMINI_API_KEY. Ustaw go w Vercel.");
}
const ai = new GoogleGenAI({ apiKey });

// 2. Optymalna Instrukcja Systemowa dla Gemini
const JQL_SYSTEM_INSTRUCTION = "Jesteś ekspertem JQL. Twoim jedynym zadaniem jest przetłumaczenie opisu tekstowego na pojedynczy, poprawny ciąg JQL. Nigdy nie dodawaj żadnych dodatkowych wyjaśnień, wstępu, formatowania Markdown (np. ```jql) ani innych tekstów. Podawaj tylko czysty kod JQL. Używaj operatorów 'AND', 'OR', 'NOT' oraz pól takich jak 'project', 'status', 'priority', 'assignee', 'reporter', 'issuetype', 'resolution', 'created', 'updated'.";

// 3. Middleware
const corsOptions = {
    // W środowisku produkcyjnym, zmień '*' na adres Twojej strony Bolt.host
    origin: '*', 
    optionsSuccessStatus: 200 
};
app.use(cors(corsOptions));
app.use(express.json()); 

// 4. Endpoint do generowania JQL
app.post('/generate-jql', async (req, res) => {
    const userText = req.body.text;

    if (!userText) {
        return res.status(400).json({ error: 'Brak tekstu do przetłumaczenia.' });
    }
    
    // Zabezpieczenie przed brakiem klucza (dla Vercel)
    if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Błąd serwera: Klucz API nie jest skonfigurowany.' });
    }

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash', 
            contents: userText,
            config: {
                systemInstruction: JQL_SYSTEM_INSTRUCTION,
                temperature: 0.1 
            }
        });

        const generatedJQL = response.text.trim();
        res.json({ jql: generatedJQL }); 

    } catch (error) {
        console.error("Błąd Gemini API:", error);
        res.status(500).json({ error: 'Wystąpił błąd serwera. Sprawdź klucz API.' });
    }
});

// W Serverless Node.js (jak Vercel) nie nasłuchujemy na porcie, 
// ale ten kod jest wymagany, aby Vercel rozpoznał to jako aplikację Express
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Serwer pośredniczący JQL działa lokalnie na porcie ${PORT}`);
    });
}

app.get('/', (req, res) => {
    res.status(200).send('JQL Proxy Server is running and waiting for POST requests on /generate-jql');
});

// Eksportowanie aplikacji jest kluczowe dla Serverless
module.exports = app;