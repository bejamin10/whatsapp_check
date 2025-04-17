const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const xlsx = require('xlsx');
const fs = require('fs');
const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static('public'));

let client;
let whatsappReady = false;

function iniciarClienteWhatsApp() {
  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true }
  });

  client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
    console.log('Escanea el QR con tu WhatsApp');
  });

  client.on('ready', () => {
    console.log('Cliente de WhatsApp listo');
    whatsappReady = true;
  });

  client.initialize();
}

iniciarClienteWhatsApp();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.post('/subir', upload.single('archivo'), async (req, res) => {
  if (!whatsappReady) {
    return res.status(500).send('Cliente de WhatsApp no está listo');
  }

  const rutaExcel = req.file.path;
  const resultados = [];

  try {
    const workbook = xlsx.readFile(rutaExcel);
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const data = xlsx.utils.sheet_to_json(hoja);

    let index = 1;
    for (const fila of data) {
      const numero = fila.Numero.toString().replace(/\D/g, '');
      const chatId = `${numero}@c.us`;

      let tieneWhatsApp = false;
      try {
        tieneWhatsApp = await client.isRegisteredUser(chatId);
      } catch (error) {
        console.log(` Error con el número ${numero}: ${error.message}`);
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
    const nombreArchivo = `verificados-${Date.now()}.xlsx`;
    const rutaSalida = path.join(__dirname, nombreArchivo);
    xlsx.writeFile(nuevoLibro, rutaSalida);

    res.download(rutaSalida, () => {
      fs.unlinkSync(rutaSalida);
      fs.unlinkSync(rutaExcel);
    });
  } catch (err) {
    console.error('Error procesando el archivo:', err.message);
    res.status(500).send('Error procesando el archivo');
  }
});

app.listen(port, () => {
  console.log(`Servidor web corriendo en http://localhost:${port}`);
});
