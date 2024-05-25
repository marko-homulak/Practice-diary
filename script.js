document.getElementById('download-pdf').addEventListener('click', function () {
    const containers = document.querySelectorAll('.container-a4');
    const opt = {
      scale: 4,
      useCORS: true
    };
    
    const pdf = new jspdf.jsPDF('landscape', 'mm', 'a4');

    function addContainerToPDF(container, index) {
      return html2canvas(container, opt).then(canvas => {
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        if (index > 0) {
          pdf.addPage();
        }
        pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.width, pdf.internal.pageSize.height);
      });
    }

    const promises = Array.from(containers).map((container, index) => addContainerToPDF(container, index));

    Promise.all(promises).then(() => {
      pdf.save('document.pdf');
    }).catch(error => {
      console.error('Помилка при створенні PDF:', error);
    });
});

document.addEventListener('DOMContentLoaded', () => {
    const weeks = document.querySelectorAll('.week');
    const textareas = document.querySelectorAll('textarea');

    // Function to adjust textarea height
    function adjustTextareaHeight(textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    // Add event listeners to toggle cross on week divs
    weeks.forEach(week => {
        week.addEventListener('click', () => {
            week.classList.toggle('crossed');
        });
    });

    // Add input event listener to textareas for dynamic height adjustment
    textareas.forEach(textarea => {
        textarea.addEventListener('input', () => adjustTextareaHeight(textarea));
        // Adjust height initially
        adjustTextareaHeight(textarea);
    });
});

/*document.getElementById('download-pdf').addEventListener('click', function () {
    const containers = document.querySelectorAll('.container-a4');
    const opt = {
        margin: [0, 0, 0, 0],
        image: { type: 'jpeg', quality: 1.0 },
        html2canvas: { scale: 4, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    containers.forEach((container, index) => {
        const pdf = new jspdf.jsPDF(opt.jsPDF);

        html2pdf().from(container).set(opt).toPdf().get('pdf').then((pdfObj) => {
            pdfObj.save(`document_${index + 1}.pdf`);
        });
    });
});*/
