// Open modal with selected plan
function openModal(planName) {
    const modal = document.getElementById('planModal');
    const modalPlanName = document.getElementById('modalPlanName');
    const modalPlanPrice = document.getElementById('modalPlanPrice');
    
    modalPlanName.textContent = planName + ' Plan';
    
    // Set price based on plan
    if (planName === 'Basic') {
        modalPlanPrice.textContent = '₹299 (one-time payment)';
    } else if (planName === 'Plus') {
        modalPlanPrice.textContent = '₹499 (one-time payment)';
    } else {
        modalPlanPrice.textContent = '₹999 (one-time payment)';
    }
    
    modal.style.display = 'block';
}

// Close modal
function closeModal() {
    document.getElementById('planModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('planModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Form submission
document.getElementById('planForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const planName = document.getElementById('modalPlanName').textContent.replace(' Plan', '');
    const name = document.getElementById('name').value;
    const email = document.getElementById('email').value;
    const phone = document.getElementById('phone').value;
    
    // Here you would typically send this data to your server
    // For demo, we'll just show an alert
    alert(`Thank you, ${name}! You've selected the ${planName} plan. We'll contact you at ${email} or ${phone} to proceed with payment and collect your preferences.`);
    
    closeModal();
    
    // Reset form
    this.reset();
});