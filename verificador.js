const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const xlsx = require('xlsx');
const fs = require('fs');
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// === Configuración del cliente de WhatsApp ===
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
});

// Mostrar QR para vincular sesión
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el QR con tu WhatsApp');
});

// Cuando el cliente está listo
client.on('ready', async () => {
    console.log('✅ Cliente de WhatsApp listo');

    // 🔄 Heartbeat: evitar que Render mate el proceso por inactividad
    const heartbeat = setInterval(() => {
        console.log(`[Heartbeat] ⏳ El proceso sigue corriendo...`);
    }, 30000); // cada 30 segundos

    try {
        // Leer Excel de entrada
        const workbook = xlsx.readFile('Numeros.xlsx');
        const hoja = workbook.Sheets[workbook.SheetNames[0]];
        const data = xlsx.utils.sheet_to_json(hoja);

        const resultados = [];

        let index = 1;
        for (const fila of data) {
            const numero = fila.Numero.toString().replace(/\D/g, ''); // limpieza de caracteres
            const chatId = `${numero}@c.us`;

            let tieneWhatsApp = false;
            try {
                tieneWhatsApp = await client.isRegisteredUser(chatId);
            } catch (error) {
                console.log(`❌ Error con el número ${numero}: ${error.message}`);
            }

            console.log(`${index}. ${numero}: ${tieneWhatsApp ? '✅ Sí tiene WhatsApp' : '❌ No tiene'}`);
            resultados.push({
                Numero: numero,
                TieneWhatsApp: tieneWhatsApp ? 'Sí' : 'No'
            });

            index++;
        }

        // Guardar archivo Excel con los resultados
        const nuevaHoja = xlsx.utils.json_to_sheet(resultados);
        const nuevoLibro = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(nuevoLibro, nuevaHoja, 'Resultados');
        xlsx.writeFile(nuevoLibro, 'verificados.xlsx');

        console.log('📄 Verificación terminada. Resultados guardados en "verificados.xlsx"');

    } catch (err) {
        console.error('🔥 Error general durante el proceso:', err.message);
    } finally {
        clearInterval(heartbeat); // Detener heartbeat
        client.destroy(); // Cerrar cliente de WhatsApp
    }
});

// Inicializar el cliente de WhatsApp
client.initialize();

// === Servidor Express para descargar el archivo generado ===
app.get('/descargar', (req, res) => {
    const path = './verificados.xlsx';
    if (fs.existsSync(path)) {
        res.download(path);
    } else {
        res.status(404).send('📄 El archivo aún no está disponible.');
    }
});

app.listen(port, () => {
    console.log(`🚀 Servidor web corriendo en http://localhost:${port}`);
});
