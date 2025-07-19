const express = require("express");
const app = express();
require('dotenv').config();
const path = require("path");

const ExcelJS = require('exceljs');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

const {connectDB, supabase} = require('./database/db');
const {Pdf, Payment, generalPdf} = require('./database/schema');

connectDB();



const session = require('express-session');

app.use(session({
  secret: 'your-secret-key',  // change to strong random string in production
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // true only if using HTTPS
}));

app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, 'public')));
const port = process.env.PORT;


app.get("/", (req, res) => {
  res.render("payementPage");
});

app.get("/uploadPdf", (req, res) => {
  res.render("uploadPdf");
});

app.post('/upload/pdf', upload.single('pdf'), async (req, res) => {
  try {
    const { name, userId } = req.body;
    const pdfBuffer = req.file.buffer;

    const newPdf = new generalPdf({
      name,
      userId: userId,
      pdf: pdfBuffer
    });

    await newPdf.save();
    const pdfID = newPdf._id.toString();
    console.log(pdfID);
    res.json({ success: true });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false });
  }
});

app.get('/download/upload/pdf/:id', async (req, res) => {
  try {
    const pdfDoc = await generalPdf.findById(req.params.id);

    if (!pdfDoc || !pdfDoc.pdf) {
      return res.status(404).send('PDF not found');
    }

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${pdfDoc.name || 'download'}.pdf"`
    });

    res.send(pdfDoc.pdf);
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
});

const genaralCollegeListRoutes = require('./routes/genaralCollegeListroute'); 
app.use('/genaralCollegeList', genaralCollegeListRoutes);

const pharmacyCollegeListRoutes = require('./routes/pharmacyCollegeListroute'); 
app.use('/pharmacyCollegeList', pharmacyCollegeListRoutes);

const dseCollegeListRoutes = require('./routes/dseCollegeListroute'); 
app.use('/dseCollegeList',dseCollegeListRoutes);

const engineeringCollegeListRoutes = require('./routes/engineeringCollegeListroute'); 
app.use('/engineeringCollegeList',engineeringCollegeListRoutes);

const savePdfRoutes = require('./routes/savePdfroute'); 
app.use('/savePdfroute',savePdfRoutes);

const paymentRoutes = require('./routes/paymentroute'); 
app.use('/payment',paymentRoutes);

const dashboardRoutes = require('./routes/dashboardroute'); 
app.use('/dashboard',dashboardRoutes);


app.post('/saveStudentIfo', async (req, res) => {
    try {
        const userPaymentInfo = req.body;
        // console.log("saving student payment data: ", userPaymentInfo);
        req.session.userPaymentInfo = userPaymentInfo;

        return res.json({
            isOk: true
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            isOk: false,
            error: 'Internal server error'
        });
    }
});

app.get('/download/pdf/:id', async (req, res) => {
    try {
        const pdfDoc = await Pdf.findById(req.params.id);

        if (!pdfDoc || !pdfDoc.pdf) {
            return res.status(404).send('PDF not found');
        }

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${pdfDoc.examType || 'download'}.pdf"`
        });

        res.send(pdfDoc.pdf); // Send buffer
    } catch (err) {
        console.error(err);
        res.status(500).send('Internal Server Error');
    }
});

app.listen(port || 3000, () => {
  console.log(`VP Server is running on port ${port || 3000}`);
});
