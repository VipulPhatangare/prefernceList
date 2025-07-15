const express = require("express");
const app = express();
require('dotenv').config();
const path = require("path");

const ExcelJS = require('exceljs');


const {connectDB, supabase} = require('./database/db');
const {Pdf, Payment} = require('./database/schema');

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

const pharmacyCollegeListRoutes = require('./routes/pharmacyCollegeListroute'); 
app.use('/pharmacyCollegeList', pharmacyCollegeListRoutes);

// const dseCollegeListRoutes = require('./routes/dseCollegeListroute'); 
// app.use('/dseCollegeList',dseCollegeListRoutes);

const engineeringCollegeListRoutes = require('./routes/engineeringCollegeListroute'); 
app.use('/engineeringCollegeList',engineeringCollegeListRoutes);

const savePdfRoutes = require('./routes/savePdfroute'); 
app.use('/savePdfroute',savePdfRoutes);

const paymentRoutes = require('./routes/paymentroute'); 
app.use('/payment',paymentRoutes);

app.get('/download-payments-excel', async (req, res) => {
  try {
    // 1. Create a new Excel workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payments');

    // 2. Define columns with headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Payment ID', key: 'razorpay_payment_id', width: 30 },
      { header: 'Order ID', key: 'razorpay_order_id', width: 30 },
      { header: 'Plan', key: 'plan', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 25 },
      { header: 'Percentile', key: 'generalRank', width: 15 },
      { header: 'Caste', key: 'caste', width: 15 },
      { header: 'TFWS', key: 'tfws', width: 10 },
      { header: 'Home University', key: 'homeuniversity', width: 25 },
      { header: 'Branch Categories', key: 'branchCategories', width: 30 },
      { header: 'City', key: 'city', width: 30 },
      { header: 'Selected Branches', key: 'selected_branches', width: 40 },
      { header: 'Link', key: 'pdfLink', width: 40 },
    ];

    // 3. Fetch all payments from MongoDB
    const payments = await Payment.find({}).lean();

    // 4. Add data to worksheet
    payments.forEach(payment => {
      const formData = payment.formData || {};

      worksheet.addRow({
        name: payment.name || '',
        email: payment.email || '',
        phone: payment.phone || '',
        razorpay_payment_id: payment.razorpay_payment_id || '',
        razorpay_order_id: payment.razorpay_order_id || '',
        plan: payment.plan || '',
        createdAt: payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '',
        generalRank: formData.generalRank || '',
        caste: formData.caste || '',
        tfws: formData.tfws ? 'Yes' : 'No',
        homeuniversity: formData.homeuniversity || '',
        branchCategories: Array.isArray(formData.branchCategories) ? formData.branchCategories.join(', ') : '',
        city: Array.isArray(formData.city) ? formData.city.join(', ') : '',
        selected_branches: Array.isArray(formData.selected_branches) ? formData.selected_branches.join(', ') : '',
        pdfLink: payment.pdfLink || ''
      });
    });

    // 5. Style the header row
    worksheet.getRow(1).eachCell(cell => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' }, // Light gray
      };
    });

    // 6. Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=payments-export.xlsx');

    // 7. Send the Excel file
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error generating Excel file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel export',
      error: error.message
    });
  }
});

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
