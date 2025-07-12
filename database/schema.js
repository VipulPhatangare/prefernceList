const mongoose = require('mongoose');

const pdfSchema = new mongoose.Schema({
    email: String,
    examType: String,
    pdf: { type: Buffer, required: true }, 
    createdAt: { type: Date, default: Date.now }
});

const paymentSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  razorpay_payment_id: String,
  razorpay_order_id: String,
  plan: String,
  createdAt: { type: Date, default: Date.now },
});

const Pdf = mongoose.model('Pdf', pdfSchema);
const Payment = mongoose.model("Payment", paymentSchema);
module.exports = {Pdf, Payment}