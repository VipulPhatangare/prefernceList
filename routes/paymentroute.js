const express = require('express');
const router = express.Router();
require('dotenv').config();
const {Pdf, Payment} = require('../database/schema');
const Razorpay = require("razorpay");
const crypto = require("crypto");


const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

router.get("/api/payment/create-order", async (req, res) => {
    
    // console.log(req.session.userPaymentInfo);
    const amount = req.session.userPaymentInfo.amount;
    const finalAmount = amount;
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

router.get("/api/generalCollegeList/payment/create-order/", async (req, res) => {
    
    const finalAmount = 499;
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

router.post("/api/payment/verify", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =req.body;
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

router.post("/api/payment/store", async (req, res) => {
    const { name, email, phone, razorpay_payment_id, razorpay_order_id, plan, formData } = req.body;
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
            formData
        });
        await payment.save();
        // Store count and email in session
            req.session.count = count;
            req.session.email = email;
            req.session.paymentID = payment._id.toString();
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

module.exports = router;