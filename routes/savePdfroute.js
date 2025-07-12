const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
require('dotenv').config();
const {connectDB, supabase} = require('../database/db');
const {Pdf, Payment} = require('../database/schema');
const axios = require('axios');


async function sendCollegePreferenceList(mobileNumber, name, listLink) {
    const templateName = "preference_list"; // Your template name approved in WATI
    // console.log(mobileNumber, name, listLink);

    const CHANNEL_NUMBER = process.env.CHANNEL_NUMBER;
    const END_POINT = process.env.WATI_ENDPOINT;
    const ACCESS_TOKEN = process.env.WATI_ACCESS_TOKEN;
    // console.log(CHANNEL_NUMBER, END_POINT, ACCESS_TOKEN);

    const data = {
        template_name: templateName,
        broadcast_name: "College Preference Notification",
        receivers: [
            {
                whatsappNumber: mobileNumber,
                customParams: [
                    {
                        name: 'name', // matches {{name}} in template
                        value: name
                    },
                    {
                        name: 'listlink', // matches {{listlink}} in template
                        value: listLink
                    }
                ]
            }
        ],
        channel_number: CHANNEL_NUMBER
    };

    const endpoint = `${END_POINT}/api/v1/sendTemplateMessages`;
    
    // console.log('Sending WhatsApp template:', { endpoint, payload: data });

    try {
        const response = await axios.post(endpoint, data, {
            headers: {
                'Authorization': `Bearer ${ACCESS_TOKEN}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        return {
            success: true,
            status: response.status,
            data: response.data
        };
    } catch (error) {
        console.error('WhatsApp API Error:', error.response?.data || error.message);
        return {
            success: false,
            error: error.response?.data || error.message
        };
    }
}


router.post('/savePdf', upload.single('pdf'), async (req, res) => {
    try {
        // console.log('savePdf API called');

        if (!req.file) {
            // console.log('No pdf uploaded');
            return res.status(400).json({
                success: false,
                message: 'No PDF file uploaded'
            });
        }

        if (!req.session.userPaymentInfo) {
            // console.log('Session expired or missing user info. Please complete the payment again.')
            return res.status(400).json({
                success: false,
                message: 'Session expired or missing user info. Please complete the payment again.'
            });
        }

        const { email, phone, name } = req.session.userPaymentInfo;
        // console.log(email, phone, name);
        const exam = req.body.exam;
        const pdfBuffer = req.file.buffer;
        
        const newPreferenceList = new Pdf({
            email,
            examType: exam,
            pdf: pdfBuffer
        });

        await newPreferenceList.save();

        const pdfID = newPreferenceList._id.toString();
        const listLink = `https://list.campusdekho.ai/download/pdf/${pdfID}`;
        // console.log(listLink);
        await sendCollegePreferenceList(phone, name, listLink);

        // Clean up session
        delete req.session.userPaymentInfo;
        
        // console.log('Msg send');
        res.json({ 
            success: true,
            message: 'PDF stored successfully'
        });

    } catch (error) {
        console.error('Error storing PDF:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to store PDF: ' + error.message
        });
    }
});


module.exports = router;
