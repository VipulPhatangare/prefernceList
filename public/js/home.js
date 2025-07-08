const central_object = {
    mainCaste: '',
    casteColumn: '',
    specialReservation: '',
    branchCategories: [],
    final_college_list : [],
    formData : {}
};

let selectedBranches = [];
let hasGeneratedList = false; // Track if list has been generated

// DOM elements
const casteSelect = document.getElementById('caste');
const tfwsContainer = document.getElementById('tfwsContainer');
const tfwsCheckbox = document.getElementById('tfws');
const collegeForm = document.getElementById('collegeForm');
const resultsContainer = document.getElementById('resultsContainer');
const collegeCardsContainer = document.getElementById('collegeCards');
const selectedCountElement = document.getElementById('selectedCount');
const regionCheckboxGroup = document.getElementById('regionCheckboxGroup');
const roundSelect = document.getElementById('round');
const homeuniversitySelect = document.getElementById('homeUniversity');
const customBranchBtn = document.getElementById('customBranchBtn');
const branchSelect = document.getElementById('branch');
const selectedBranchesContainer = document.getElementById('selectedBranchesContainer');
const branchSelectionGroup = document.getElementById('branchSelectionGroup');
const otherBranchCheckbox = document.getElementById('otherBranchCheckbox');
const loadingContainer = document.getElementById('loadingContainer');
const submitBtn = document.querySelector('.submit-btn'); // Get the submit button

// Initialize
updateSelectedCount(0);

// Event Listeners
casteSelect.addEventListener('change', handleCasteChange);
collegeForm.addEventListener('submit', handleFormSubmit);
regionCheckboxGroup.addEventListener('change', handleRegionCheckboxChange);
customBranchBtn.addEventListener('click', toggleBranchSelection);
branchSelect.addEventListener('change', handleBranchSelection);

// Initialize the application
document.addEventListener("DOMContentLoaded", initilise);

async function initilise() {
    await fetchBranches();
    await fetchCity();
    await fetchUniversity();
    initBranchSelection();
}

// Branch Category Checkbox Functions
function initBranchSelection() {
    const checkboxes = document.querySelectorAll('.branch-checkbox');
    
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            handleBranchCategoryChange(this);
        });
    });
    
    // Initialize with "All" selected
    const allCheckbox = document.querySelector('.branch-checkbox[data-all="true"]');
    allCheckbox.checked = true;
    central_object.branchCategories = ['All'];
}

function handleBranchCategoryChange(checkbox) {
    if (checkbox.dataset.all === 'true') {
        // "All" was checked
        if (checkbox.checked) {
            // Uncheck all other checkboxes
            document.querySelectorAll('.branch-checkbox:not([data-all="true"])').forEach(cb => {
                cb.checked = false;
            });
            branchSelectionGroup.classList.add('hidden');
            central_object.branchCategories = ['All'];
        }
    } else {
        // Other checkbox was changed
        if (checkbox.checked) {
            // Uncheck "All" if it was checked
            const allCheckbox = document.querySelector('.branch-checkbox[data-all="true"]');
            allCheckbox.checked = false;
            central_object.branchCategories = central_object.branchCategories.filter(cat => cat !== 'All');
            
            // Show branch selection if "Other" was checked
            if (checkbox === otherBranchCheckbox) {
                branchSelectionGroup.classList.remove('hidden');
            }
        } else {
            // If "Other" was unchecked, hide the branch selection
            if (checkbox === otherBranchCheckbox) {
                branchSelectionGroup.classList.add('hidden');
            }
        }
        
        // Update the central_object.branchCategories
        updateSelectedBranchCategories();
        
        // If no checkboxes are selected, check "All"
        if (central_object.branchCategories.length === 0) {
            const allCheckbox = document.querySelector('.branch-checkbox[data-all="true"]');
            allCheckbox.checked = true;
            central_object.branchCategories = ['All'];
            branchSelectionGroup.classList.add('hidden');
        }
    }
}

function updateSelectedBranchCategories() {
    central_object.branchCategories = [];
    document.querySelectorAll('.branch-checkbox:checked').forEach(checkbox => {
        central_object.branchCategories.push(checkbox.value);
    });
}

// Branch Selection Functions
function toggleBranchSelection() {
    customBranchBtn.style.display = 'none';
    branchSelect.classList.remove('hidden');
    branchSelect.focus();
}

function handleBranchSelection() {
    if (this.value && !selectedBranches.includes(this.value)) {
        selectedBranches.push(this.value);
        updateSelectedBranchesDisplay();
        
        // Remove selected option from dropdown
        this.querySelector(`option[value="${this.value}"]`).remove();
        
        // Reset dropdown but keep it visible
        this.value = '';
    }
}

function updateSelectedBranchesDisplay() {
    selectedBranchesContainer.innerHTML = '';
    
    selectedBranches.forEach(branchValue => {
        const branchText = branchSelect.querySelector(`option[value="${branchValue}"]`)?.text || branchValue;
        
        const tag = document.createElement('div');
        tag.className = 'branch-tag';
        tag.innerHTML = `
            ${branchText}
            <button type="button" data-value="${branchValue}">&times;</button>
        `;
        
        tag.querySelector('button').addEventListener('click', (e) => {
            e.stopPropagation();
            removeBranch(branchValue);
        });
        
        selectedBranchesContainer.appendChild(tag);
    });
}

function removeBranch(branchValue) {
    selectedBranches = selectedBranches.filter(b => b !== branchValue);
    
    // Add the option back to the dropdown
    const optionText = [...branchSelect.options].find(opt => opt.value === branchValue)?.text || branchValue;
    if (optionText) {
        const option = new Option(optionText, branchValue);
        branchSelect.appendChild(option);
    }
    
    updateSelectedBranchesDisplay();
}

// Form Handling Functions
function handleCasteChange() {
    if (this.value === 'OPEN' || this.value === 'OBC' || this.value === 'SEBC') {
        tfwsContainer.style.display = 'block';
    } else {
        tfwsContainer.style.display = 'none';
        tfwsCheckbox.checked = false;
    }
}

function handleFormSubmit(e) {
    e.preventDefault();
    
    // Show loading animation
    loadingContainer.style.display = 'flex';
    
    // Hide results container if it was previously shown
    resultsContainer.style.display = 'none';
    
    // Get all checked region checkboxes
    const regionCheckboxes = document.querySelectorAll('input[name="region"]:checked');
    const regions = Array.from(regionCheckboxes).map(cb => cb.value);
    
    const formData = {
        generalRank: parseInt(document.getElementById('generalRank').value),
        caste: casteSelect.value,
        gender: document.querySelector('input[name="gender"]:checked').value,
        tfws: tfwsCheckbox.checked,
        branchCategories: central_object.branchCategories,
        city: regions.includes("All") ? ["All"] : regions,
        selected_branches: selectedBranches,
        homeuniversity: homeuniversitySelect.value
    };

    central_object.formData = formData;

    // Validate rank is positive integer
    if (isNaN(formData.generalRank)) {
        alert('Please enter a valid percentile');
        loadingContainer.style.display = 'none';
        return;
    }

    // Use setTimeout to allow the UI to update before the heavy operation
    setTimeout(() => {
        generateCollegeList(formData)
            .finally(() => {
                loadingContainer.style.display = 'none';
                // Hide the submit button after successful generation
                if (!hasGeneratedList) {
                    submitBtn.style.display = 'none';
                    hasGeneratedList = true;
                }
            });
    }, 100);
}

function handleRegionCheckboxChange(e) {
    if (e.target.value === "All" && e.target.checked) {
        const otherCheckboxes = document.querySelectorAll('input[name="region"]:not([value="All"])');
        otherCheckboxes.forEach(cb => cb.checked = false);
    } else if (e.target.value !== "All" && e.target.checked) {
        const allCheckbox = document.querySelector('input[name="region"][value="All"]');
        allCheckbox.checked = false;
    }
}

// Data Fetching Functions
async function fetchBranches() {
    try {
        const response = await fetch('/fetchBranches');
        let data = await response.json();

        branchSelect.innerHTML = '<option value="" disabled selected>Select branches</option>';

        data = data.reduce((acc, curr) => {
            if (!acc.some(item => item.branch_name === curr.branch_name)) {
                acc.push(curr);
            }
            return acc;
        }, []);

        data.forEach(element => {
            if(element.Branch_category == 'OTHER'){
                const option = document.createElement('option');
                option.value = `${element.branch_name}`;
                option.innerHTML = `${element.branch_name}`;
                branchSelect.appendChild(option);
            }
        });
    } catch (error) {
        console.log(error);
    }
}

async function fetchCity() {
    try {
        const response = await fetch('/fetchcity');
        const data = await response.json();

        regionCheckboxGroup.innerHTML = `
            <label class="checkbox-label">
                <input type="checkbox" name="region" value="All" checked>
                <span>All Regions</span>
            </label>
        `;

        data.forEach(element => {
            const child = document.createElement('label');
            child.classList.add('checkbox-label');

            child.innerHTML = `
                <input type="checkbox" name="region" value="${element.city}">
                <span>${element.city}</span>
            `;

            regionCheckboxGroup.appendChild(child);
        });
    } catch (error) {
        console.log(error);
    }
}

async function fetchUniversity() {
    try {
        const response = await fetch('/fetchUniversity');
        const data = await response.json();

        homeuniversitySelect.innerHTML = `<option value="" disabled selected>Select your home university</option>`;

        data.forEach(element => {
            const option = document.createElement('option');
            option.value = `${element.university}`;
            option.innerHTML = `${element.university}`;
            homeuniversitySelect.appendChild(option);
        });
    } catch (error) {
        console.log(error);
    }
}

// College List Functions
async function generateCollegeList(formData) {
    try {
        const response = await fetch('/College_list', {
            method: 'POST',
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();
        displayColleges(data, formData);
        return data;
    } catch (error) {
        console.log('Error:', error);
        alert('An error occurred while fetching college data');
        throw error;
    }
}

function displayColleges(colleges, formData) {
    collegeCardsContainer.innerHTML = '';

    if (!colleges || colleges.length === 0) {
        collegeCardsContainer.innerHTML = '<p>No colleges found matching your criteria.</p>';
        resultsContainer.style.display = 'block';
        return;
    }

    let count = 1;
    central_object.final_college_list = colleges;
    colleges.forEach(college => {
        const card = createCollegeCard(college, formData, count,false);
        count++;
        collegeCardsContainer.appendChild(card);
    });
    
    resultsContainer.style.display = 'block';
    updateSelectedCount(colleges.length);
    generatePdf();

    setTimeout(() => {
        resultsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
    
}

function createCollegeCard(college, formData, count, tfws) {
    const card = document.createElement('div');
    card.className = 'college-card selected';
    card.dataset.code = college.choice_code;
    let college_code = college.choice_code;
    if(tfws){
        college_code = `${college_code}T`;
    }

    let card_content = `
        <div class="college-card-header">
            <div class="college-code">${count}</div>
            <div class="college-code">${college_code}</div>
            <div class="college-code">Seat type: ${college.seat_type}</div>
        </div>
        <div class="college-name">${college.college_name}</div>
        <div>University: ${college.university}</div>
        <div>${college.branch_name}</div>
        <div class="college-details">
            <div class="college-detail">
                <div class="college-detail-label">GOPEN</div>
                <div>${college.gopen}</div>
            </div>
    `;
    
    if (formData.gender == 'Female') {
        card_content += `
            <div class="college-detail">
                <div class="college-detail-label">LOPEN</div>
                <div>${college.lopen}</div>
            </div>
        `;
        
        if (formData.caste != 'OPEN' && formData.caste != 'EWS') {
            let caste_column = `L${formData.caste}`;
            card_content += `
            <div class="college-detail">
                <div class="college-detail-label">${caste_column}</div>
                <div>${college[caste_column.toLowerCase()]}</div>
            </div>
            `;
        }
    } else {
        if (formData.caste != 'OPEN' && formData.caste != 'EWS') {
            let caste_column = `G${formData.caste}`;
            card_content += `
            <div class="college-detail">
                <div class="college-detail-label">${caste_column}</div>
                <div>${college[caste_column.toLowerCase()]}</div>
            </div>
            `;
        }
    }

    if(formData.caste == 'EWS'){
        card_content = card_content + `
            <div class="college-detail">
                <div class="college-detail-label">EWS</div>
                <div>${college.ews}</div>
            </div>
        `;
    }

    if (formData.tfws) {
        card_content += `
            <div class="college-detail">
                <div class="college-detail-label">TFWS</div>
                <div>${college.tfws}</div>
            </div>
        `;
    }

    card.innerHTML = card_content + `</div>`;

    return card;
}

function updateSelectedCount(count) {
    if (typeof count === 'number') {
        selectedCountElement.textContent = `${count} selected`;
    } else {
        const selectedCount = document.querySelectorAll('.college-card.selected').length;
        selectedCountElement.textContent = `${selectedCount} selected`;
    }
}

document.getElementById('downloadPdfBtn').addEventListener('click', generatePdf);


async function generatePdf() {
    try {

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        // Add watermark to first page
        addWatermark(doc);

        // Add title
        doc.setFontSize(30);
        doc.text('CampusDekho.ai', 14, 20);
        doc.setFontSize(12);
        
        // Student information
        doc.text(`Percentile: ${central_object.formData.generalRank}`, 14, 30);
        doc.text(`Gender: ${central_object.formData.gender}`, 14, 36);
        doc.text(`Home University: ${central_object.formData.homeuniversity}`, 14, 42);
        doc.text(`Caste: ${central_object.formData.caste}`, 14, 48);

        // Format branch category
        const branch_cat_obj = {
            All: 'All',
            CIVIL: 'Civil',
            COMP: 'Computer Science',
            IT: 'Information Technology',
            COMPAI: 'CSE (Artificial Intelligence)',
            AI: 'Artificial Intelligence',
            ELECTRICAL: 'Electrical',
            ENTC: 'ENTC',
            MECH: 'Mechanical',
            OTHER: 'Other'
        };

        const branch_categories = central_object.formData.branchCategories
            .map(el => branch_cat_obj[el] || el)
            .join(", ");

        // Add branch categories with text wrapping
        const wrappedBranchText = doc.splitTextToSize(`Branch Categories: ${branch_categories}`, 270);
        let currentY = 54;
        doc.text(wrappedBranchText, 14, currentY);
        currentY += wrappedBranchText.length * 6;

        // Add selected branches if any
        if (selectedBranches.length > 0) {
            const selectedBranchesText = doc.splitTextToSize(`Selected Branches: ${selectedBranches.join(", ")}`, 270);
            doc.text(selectedBranchesText, 14, currentY);
            currentY += selectedBranchesText.length * 6;
        }

        // Format city list
        const cityString = central_object.formData.city.includes("All") ? "All Regions" : central_object.formData.city.join(", ");
        const wrappedCityText = doc.splitTextToSize(`Cities: ${cityString}`, 270);
        doc.text(wrappedCityText, 14, currentY);
        currentY += wrappedCityText.length * 6;

        // TFWS status
        const tfwsText = central_object.formData.tfws ? 'TFWS: Yes' : 'TFWS: No';
        doc.text(tfwsText, 14, currentY);
        currentY += 10;

        // Prepare table data
        let headData = ['No.', 'Choice Code', 'College Name', 'Branch', 'GOPEN'];

        if(central_object.formData.caste == 'EWS'){
            headData.push('EWS');
        }

        if(central_object.formData.caste != 'OPEN' && central_object.formData.caste != 'EWS' && central_object.formData.gender == 'Male'){
            headData.push(`G${central_object.formData.caste}`)
        }

        if(central_object.formData.gender == 'Female'){
            headData.push('LOPEN');

            if(central_object.formData.caste != 'OPEN' && central_object.formData.caste != 'EWS'){
                headData.push(`L${central_object.formData.caste}`)
            }
        }
        
        if(central_object.formData.tfws){
            headData.push('TFWS');
        }

        let count = 1;
        const tableData = [];
        
        central_object.final_college_list.forEach(college => {
            // Regular seat
            let row = [
                count++,
                college.choice_code,
                college.college_name,
                college.branch_name,
                college.gopen
            ];
            
            if(central_object.formData.caste == 'EWS'){
                row.push(college.ews);
            }
            
            if(central_object.formData.caste != 'OPEN' && central_object.formData.caste != 'EWS' && central_object.formData.gender == 'Male'){
                let c = `G${central_object.formData.caste}`;
                row.push(college[c.toLowerCase()]);
            }

            if(central_object.formData.gender == 'Female'){
                row.push(college.lopen);
                if(central_object.formData.caste != 'EWS' && central_object.formData.caste != 'OPEN'){
                    let c = `L${central_object.formData.caste}`;
                    row.push(college[c.toLowerCase()]);
                }
            }
            
            if(central_object.formData.tfws){
                row.push(college.tfws);
            }
            
            tableData.push(row);
        });

        // Add table
        doc.autoTable({
            head: [headData],
            body: tableData,
            startY: currentY,
            theme: 'grid',
            headStyles: {
                fillColor: [26, 58, 143],
                textColor: 255,
                fontSize: 8
            },
            bodyStyles: {
                fontSize: 7
            },
            alternateRowStyles: {
                fillColor: [240, 240, 240]
            },
            margin: { left: 14 },
            didDrawPage: function (data) {
                // Add watermark to each subsequent page
                addWatermark(doc);
                
                // Disclaimer text
                const pageHeight = doc.internal.pageSize.height;
                doc.setFontSize(8);
                doc.setTextColor(100);
                doc.text(
                    'Disclaimer: The information, predictions, and content provided by CampusDekho.ai , including college predictor and branch-wise prediction tools, are intended solely for reference purposes. While we strive to ensure',
                    14,
                    pageHeight - 11
                );
                doc.text(
                    'the accuracy and reliability of the data presented, we do not guarantee or assure that the results and outcomes shown are 100% accurate or conclusive. Candidates are strongly advised to independently verify and',
                    14,
                    pageHeight - 7
                );
                doc.text(
                    'validate all information before making any decisions based on the provided.',
                    14,
                    pageHeight - 3
                );
            }
        });

        const pdfBlob = doc.output('blob');
        const formData = new FormData();
        formData.append('pdf', pdfBlob, 'preference_list.pdf');
        formData.append('exam', 'Engineering');

        const response = await fetch('/savePdf', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to store PDF');
        }

        doc.save('Engineering_Preference_List.pdf');

        function addWatermark(doc) {
            const pageWidth = doc.internal.pageSize.width;
            const pageHeight = doc.internal.pageSize.height;
            
            // Save current graphics state
            doc.saveGraphicsState();
            
            // Set watermark properties - YELLOW COLOR
            doc.setFontSize(90);
            doc.setTextColor(0, 112, 192);
            doc.setGState(new doc.GState({ opacity: 0.15 })); // 15% opacity
            
            // Calculate centered position
            const text = 'CampusDekho.ai';
            const textWidth = doc.getStringUnitWidth(text) * doc.internal.getFontSize() / doc.internal.scaleFactor;
            const x = (pageWidth - textWidth) / 2;
            const y = pageHeight / 2;
            
            // Add single centered watermark
            doc.text(text, x, y);
            
            // Restore graphics state
            doc.restoreGraphicsState();
        }
        
    } catch (error) {
        console.log(error);
    }
}

