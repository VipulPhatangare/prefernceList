try {
                const res = await fetch('/api/payment/create-order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ amount, name, email, phone, plan })
                });
                
                if (!res.ok) throw new Error('Failed to create payment order');
                
                const order = await res.json();
                
                const options = {
                    key: "<%= razorpayKeyId %>", // Replace with your Razorpay key
                    amount: order.amount,
                    currency: order.currency,
                    name: "CampusDekho",
                    description: plan + " Plan",
                    order_id: order.id,
                    handler: async function(response) {
                        // Always use values from sessionStorage
                        const paymentData = {
                            name: sessionStorage.getItem('userPaymentName'),
                            email: sessionStorage.getItem('userPaymentEmail'),
                            phone: sessionStorage.getItem('userPaymentPhone'),
                            plan: sessionStorage.getItem('userPaymentPlan'),
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_order_id: response.razorpay_order_id
                        };
                        
                        const storeRes = await fetch('/api/payment/store', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(paymentData)
                        });
                        
                        const storeData = await storeRes.json();
                        if (storeData.success && storeData.count) {
                            sessionStorage.setItem('count', storeData.count);
                            sessionStorage.setItem('email', paymentData.email);
                            window.location.href = '/collegeList';
                        }
                    },
                    prefill: {
                        name: name,
                        email: email,
                        contact: phone
                    },
                    theme: {
                        color: "#0054A6"
                    }
                };
                
                const rzp = new Razorpay(options);
                rzp.open();
                
            } catch (error) {
                console.error('Payment error:', error);
                alert('Error processing payment. Please try again.');
            }