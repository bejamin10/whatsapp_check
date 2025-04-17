const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const xlsx = require('xlsx');
const fs = require('fs');

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

    // Excel
    const workbook = xlsx.readFile('Numeros.xlsx');
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(hoja);

    const resultados = [];

    for (const fila of data) {
        const numero = fila.Numero.toString().replace(/\D/g, ''); // numeros de prueba
        const chatId = `${numero}@c.us`;

        let tieneWhatsApp = false;
        try {
            tieneWhatsApp = await client.isRegisteredUser(chatId);
        } catch (error) {
            console.log(`Error con el número ${numero}:`, error.message);
        }

        console.log(`${numero}: ${tieneWhatsApp ? 'Si' : 'No'}`);

        resultados.push({
            Numero: numero,
            TieneWhatsApp: tieneWhatsApp ? 'Si' : 'No'
        });
    }

    // Guardar Excel
    const nuevaHoja = xlsx.utils.json_to_sheet(resultados);
    const nuevoLibro = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(nuevoLibro, nuevaHoja, 'Resultados');
    xlsx.writeFile(nuevoLibro, 'verificados.xlsx');

    console.log('Verificación terminada. Resultados guardados en verificados.xlsx');
    client.destroy();
});

client.initialize();

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Ruta para descargar el archivo generado
app.get('/descargar', (req, res) => {
    const path = './verificados.xlsx';
    if (fs.existsSync(path)) {
        res.download(path);
    } else {
        res.status(404).send('Archivo no disponible aún.');
    }
});

app.listen(port, () => {
    console.log(`Servidor web corriendo en http://localhost:${port}`);
});
