const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const {connectDB, supabase} = require('../database/db');
const {Pdf, Payment} = require('../database/schema');
const axios = require('axios');


async function sendCollegePreferenceList(mobileNumber, name, listLink) {
    const templateName = "preference_list"; // Your template name approved in WATI
    
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
        channel_number: process.env.CHANNEL_NUMBER
    };

    const endpoint = `${process.env.WATI_ENDPOINT}/api/v1/sendTemplateMessages`;
    
    // console.log('Sending WhatsApp template:', { endpoint, payload: data });

    try {
        const response = await axios.post(endpoint, data, {
            headers: {
                'Authorization': `Bearer ${process.env.WATI_ACCESS_TOKEN}`,
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
        // Check if file exists
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No PDF file uploaded'
            });
        }

        const exam = req.body.exam; // No need to parse, it's already an object
        const pdfBuffer = req.file.buffer; 
        const email = req.session.userPaymentInfo.email;
        
        const newPreferenceList = new Pdf({
            email: email,
            examType: exam,
            pdf: pdfBuffer
        });

        await newPreferenceList.save();
        
        const pdfID = newPreferenceList._id.toString();
       
        const userPaymentInfo = req.session.userPaymentInfo;
        // const listLink = `http://localhost:3000/download/pdf/${pdfID}`;
        const listLink = `https://list.campusdekho.ai/download/pdf/${pdfID}`;
        await sendCollegePreferenceList(userPaymentInfo.phone, userPaymentInfo.name, listLink);
        delete req.session.userPaymentInfo;
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
