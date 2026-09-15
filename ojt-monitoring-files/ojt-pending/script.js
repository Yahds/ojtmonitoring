
var studentId;

// updates the table once the a status button is clicked
$(document).ready(function() {
  $('.status-update').on('click', function() {
    var studentId = $(this).closest('.table-data').data('student-id');
    var status = $(this).attr('alt'); 

    var actionText = status === 'ACCEPTED' ? 'accept' : 'reject';
    var confirmation = window.confirm(`Are you sure you want to ${actionText} the student's company?`);

    if (confirmation) {
      $.ajax({
        type: 'POST',
        url: '/update-status',
        data: { studentId: studentId, newStatus: status },
        success: function(response) {
          console.log(response);
        },
        error: function(error) {
          console.error(error);
        }
      });
      location.reload();
    } else {
      console.log('Operation canceled by user.');
    }
  });

  // listens to the keys on the search-input and filters the table based on it
  $('#search-input').on('input', function() {
    const searchText = $(this).val().toLowerCase();
    console.log()
    $('.table-data').hide();

    $('.table-data').filter(function() {
      const studentName = $(this).find('td:nth-child(1)').text().toLowerCase();
      const classcode = $(this).find('td:nth-child(2)').text().toLowerCase();
      const companyName = $(this).find('td:nth-child(3)').text().toLowerCase();
      const companyAddress = $(this).find('td:nth-child(4)').text().toLowerCase();
      
      return studentName.includes(searchText) || classcode.includes(searchText) || companyName.includes(searchText) || companyAddress.includes(searchText);
    }).show();
  });
});

// calls the updateTable once a view option is changed
document.getElementById('dropdown').addEventListener('change', function () {
  const selectedOption = this.value;
  fetch(`/ojt-pending/sort?sortBy=${selectedOption}`)
      .then(response => response.json())
      .then(data => {
          updateTable(data);
      })
      .catch(error => console.error('Error:', error));
});

// updates the pending-students-table 
function updateTable(data) {
  const existingRows = document.querySelectorAll('.table-data');
  data.forEach((student, index) => {
    const studentID = student.studentID;
    const existingRow = existingRows[index];
    if (existingRow) {
      existingRow.querySelector('td:nth-child(1)').textContent = student.studentName || '';
      existingRow.querySelector('td:nth-child(2)').textContent = student.classcode || '';
      existingRow.querySelector('td:nth-child(3)').textContent = student.companyname || '';
      existingRow.querySelector('td:nth-child(4)').textContent = student.companyaddress || '';
    }
  });
}

var originalRemarks = [];

// opens the popup container and populates the student details
async function openPopup(studentData) {
  const studentId = studentData.dataset.studentId;
  window.studentId = studentId;
  const studentName = studentData.studentName;

  document.getElementById('studentName').textContent = studentName;
  document.getElementById('popupContainer').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';

  try {
      const requirements = await fetchRequirements(studentId);
      originalRemarks = requirements.map(req => req.remarks);
      updateRequirementsTable(requirements);
  } catch (error) {
      console.error('Error fetching requirements:', error);
  }
}


// fetch student requirements
async function fetchRequirements(studentId) {
  try {
      
      const response = await fetch(`/ojt-pending/requirements?studentId=${studentId}`);
      const requirements = await response.json();
      return requirements;
  } catch (error) {
      console.error('Error fetching requirements:', error);
      throw error;
  }
}

// closes the popup container
function closePopup() {
    document.getElementById('popupContainer').style.display = 'none';
    document.getElementById('overlay').style.display = 'none';
}

// update the requirements table in the popup
function updateRequirementsTable(requirements) {
  const tableBody = document.querySelector('#popupContainer table tbody');
  tableBody.innerHTML = ''; 

  // Add table headers
  const headerRow = document.createElement('tr');
  headerRow.innerHTML = `
      <th>Requirements</th>
      <th>Date Submitted</th>
      <th>Remarks</th>
      <th>Status</th>
  `;
  tableBody.appendChild(headerRow);

  // Add table rows
    requirements.forEach(req => {
      const newRow = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = req.requirementname;

      const dateCell = document.createElement('td');
      dateCell.textContent = req.datesubmitted || '';

      const remarksCell = document.createElement('td');
      remarksCell.className = 'editable';
      remarksCell.contentEditable = 'true';
      remarksCell.textContent = req.remarks || 'Type here your remarks...';

      const statusCell = document.createElement('td');
      statusCell.textContent = req.status;

      newRow.append(nameCell, dateCell, remarksCell, statusCell);
      tableBody.appendChild(newRow);
  });
}

// adds click event listeners to the first <td> element within each row and calls the openPopup function
var rows = document.querySelectorAll('.table-data');
rows.forEach(function(row) {
    var firstTd = row.querySelector('td:first-child');
    if (firstTd) {
        console.log("Adding click event listener");
        firstTd.addEventListener('click', function() {
            var studentId = row.dataset.studentId;
            var studentName = firstTd.textContent;
            openPopup({
                dataset: { studentId: studentId },
                studentName: studentName
            });
        });
    }
});


// allows the remarks to be editable
document.addEventListener('DOMContentLoaded', function () {
  var editableCells = document.querySelectorAll('.editable');

  editableCells.forEach(function (cell) {
    cell.addEventListener('focus', function () {

      originalContents[cell.dataset.studentId] = cell.textContent;
    });

    cell.addEventListener('blur', function () {
      if (originalContents[cell.dataset.studentId] !== cell.textContent) {
        console.log('Content changed:', cell.textContent);
      }
    });
  });
});


// handles the click event listener of the save button
$('.save-btn').on('click', function () {
  var remarks = [];
  $('.editable').each(function () {
    var text = $(this).text().trim();
    if (text !== 'Type here your remarks...') {
      remarks.push(text);
    }
  });

  var studentId = window.studentId;

  $.ajax({
    type: 'POST',
    url: '/update-remarks',
    data: { studentId: studentId, remarks: remarks },
    success: function (response) {
      console.log(response);
      originalRemarks = remarks.slice();
      alert('Remarks saved successfully!');
    },
    error: function (error) {
      console.error(error);
      alert('Error saving remarks.');
    }
  });
});

$('.cancel-btn').on('click', function () {
  var editableCells = document.querySelectorAll('.editable');

  editableCells.forEach(function (cell, index) {
    cell.textContent = originalRemarks[index] || 'Type here your remarks...';
  });

});












