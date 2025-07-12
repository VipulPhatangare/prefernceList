const express = require("express");
const app = express();
require('dotenv').config();
const path = require("path");

require('dotenv').config();
const Razorpay = require("razorpay");
const crypto = require("crypto");
const ExcelJS = require('exceljs');


const {connectDB, supabase} = require('./database/db');
const {Pdf, Payment} = require('./database/schema');

connectDB();


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

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

const engineeringCollegeListRoutes = require('./routes/engineeringCollegeListroute'); 
app.use('/engineeringCollegeList',engineeringCollegeListRoutes);

// savePdf

const savePdfRoutes = require('./routes/savePdfroute'); 
app.use('/savePdf',savePdfRoutes);


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
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];
    
    // 3. Fetch all payments from MongoDB
    const payments = await Payment.find({}).lean();
    
    // 4. Add data to worksheet
    payments.forEach(payment => {
      worksheet.addRow({
        name: payment.name,
        email: payment.email,
        phone: payment.phone,
        razorpay_payment_id: payment.razorpay_payment_id,
        razorpay_order_id: payment.razorpay_order_id,
        plan: payment.plan,
        createdAt: payment.createdAt.toISOString() // Format date as string
      });
    });
    
    // 5. Style the header row
    worksheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' } // Light gray background
      };
    });
    
    // 6. Set response headers for file download
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=payments-export.xlsx'
    );
    
    // 7. Send the Excel file as response
    await workbook.xlsx.write(res);
    
    // End the response
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


app.get("/api/payment/create-order", async (req, res) => {
    
    console.log(req.session.userPaymentInfo);
    const amount = req.session.userPaymentInfo.amount;
    const finalAmount = (amount * 1.21).toFixed(2);
    const options = {
        amount: finalAmount * 100, // amount in paise
        currency: "INR",
        receipt: "order_rcptid_" + Math.random().toString(36).substring(2, 15),
    };
    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).send("Error creating order");
    }
});

app.post("/api/payment/verify", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  // Generate expected signature
  const hmac = crypto.createHmac("sha256", key_secret);
  hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
  const generated_signature = hmac.digest("hex");

  if (generated_signature === razorpay_signature) {
    // Payment is verified
    res.json({ success: true });
  } else {
    // Verification failed
    res.json({ success: false });
  }
});

app.post("/api/payment/store", async (req, res) => {
  const { name, email, phone, razorpay_payment_id, razorpay_order_id, plan } = req.body;
  let count = 0;
  if (plan === "Standard Package") count = 150;
  else if (plan === "Premium Package") count = 300;
//   else if (plan === "Premium") count = 150;

  try {
    const payment = new Payment({
      name,
      email,
      phone,
      razorpay_payment_id,
      razorpay_order_id,
      plan,
    });
    await payment.save();
    // Store count and email in session
    req.session.count = count;
    req.session.email = email;
    res.json({
      success: true,
      count,
      name,
      email,
      phone,
      razorpay_payment_id,
      razorpay_order_id,
      plan,
    });
  } catch (err) {
    res
      .status(500)
      .json({ success: false, message: "Failed to store payment info" });
  }
});

app.listen(port || 3000, () => {
  console.log(`VP Server is running on port ${port || 3000}`);
});
