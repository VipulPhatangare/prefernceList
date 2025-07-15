const express = require('express');
const router = express.Router();
require('dotenv').config();
const {Pdf, Payment} = require('../database/schema');

router.get('/',(req,res)=>{
    res.render('dashboard');
});

router.get('/data',async (req, res)=>{
    try {
        const payments = await Payment.find({}).lean();
        // console.log(payments);
        res.json(payments);

    } catch (error) {
        console.log(error);
    }
});

router.get('/download-payments-excel', async (req, res) => {
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


module.exports = router;


