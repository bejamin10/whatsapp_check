const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const xlsx = require('xlsx');
const fs = require('fs');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el QR con tu WhatsApp');
});

client.on('ready', async () => {
    console.log('Cliente listo');

    const heartbeat = setInterval(() => {
        console.log(`Heartbeat-El proceso sigue corriendo...`);
    }, 30000); // 30 seg

    try {
        const workbook = xlsx.readFile('Numeros.xlsx');
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(hoja);

        const resultados = [];

        let index = 1;
        for (const fila of data) {
            const numero = fila.Numero.toString().replace(/\D/g, ''); 
            const chatId = `${numero}@c.us`;

            let tieneWhatsApp = false;
            try {
                tieneWhatsApp = await client.isRegisteredUser(chatId);
            } catch (error) {
                console.log(`Error con el número ${numero}: ${error.message}`);
            }

            console.log(`${index}. ${numero}: ${tieneWhatsApp ? 'Sí' : 'No'}`);
            resultados.push({
                Numero: numero,
                TieneWhatsApp: tieneWhatsApp ? 'Sí' : 'No'
            });

            index++;
        }

        const nuevaHoja = xlsx.utils.json_to_sheet(resultados);
        const nuevoLibro = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(nuevoLibro, nuevaHoja, 'Resultados');
        xlsx.writeFile(nuevoLibro, 'verificados.xlsx');

        console.log('Verificación terminada. Resultados guardados en "verificados.xlsx"');

    } catch (err) {
        console.error('Error general durante el proceso:', err.message);
    } finally {
        clearInterval(heartbeat);
        client.destroy();
    }
});

client.initialize();

app.get('/descargar', (req, res) => {
    const path = './verificados.xlsx';
    if (fs.existsSync(path)) {
        res.download(path);
    } else {
        res.status(404).send('El archivo aún no está disponible.');
    }
});

app.listen(port, () => {
    console.log(`Servidor web corriendo en http://localhost:${port}`);
});
