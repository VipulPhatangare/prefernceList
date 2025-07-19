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
  formData: mongoose.Schema.Types.Mixed,
  pdfLink:String,
  createdAt: { type: Date, default: Date.now },
});


const generalCollegeListSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  razorpay_payment_id: String,
  razorpay_order_id: String,
  plan: String,
  caste: String,
  gender: String,
  percentileRange: String,
  createdAt: { type: Date, default: Date.now },
})

const generalPdfSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  pdf: {
    type: Buffer,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
});

const generalPdf = mongoose.model('generalPdf',generalPdfSchema);


const Pdf = mongoose.model('Pdf', pdfSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const generalCollegeList = mongoose.model("generalCollegeList", generalCollegeListSchema);
module.exports = {Pdf, Payment, generalCollegeList, generalPdf}