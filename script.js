/* ============================================================
   Щоденник практики — інтерактив + експорт у PDF
   ============================================================ */

/* ---------- 1. Календарний графік проходження практики ---------- */

const WEEKS_COUNT = 8;   // кількість тижнів практики
const TABLE_ROWS = 22;   // кількість рядків таблиці


function buildPracticeTable() {
  const table = document.getElementById('practice-table');
  if (!table) return;

  const weekHeaders = Array.from({ length: WEEKS_COUNT }, (_, i) => `<th>${i + 1}</th>`).join('');

  let body = '';
  for (let r = 0; r < TABLE_ROWS; r++) {
    let cells = `<td class="col-no"><input type="text" placeholder=""></td>`;
    cells += `<td class="col-task"><input type="text" placeholder=""></td>`;
    for (let w = 1; w <= WEEKS_COUNT; w++) {
      cells += `<td class="col-week" role="button" tabindex="0" aria-label="Тиждень ${w}"></td>`;
    }
    cells += `<td class="col-note"><input type="text" placeholder=""></td>`;
    body += `<tr>${cells}</tr>`;
  }

  const cols = `<colgroup>
      <col class="col-no">
      <col class="col-task">
      ${Array.from({ length: WEEKS_COUNT }, () => '<col class="col-week">').join('')}
      <col class="col-note">
    </colgroup>`;

  table.innerHTML = `
    ${cols}
    <thead>
      <tr>
        <th rowspan="2" class="col-no vertical-header"><span>№ з/п</span></th>
        <th rowspan="2" class="col-task">Назва робіт</th>
        <th colspan="${WEEKS_COUNT}">Тижні проходження практики</th>
        <th rowspan="2" class="col-note">Примітки про виконання</th>
      </tr>
      <tr>
        ${weekHeaders}
      </tr>
    </thead>
    <tbody>${body}</tbody>`;

  // Клік по клітинці тижня — ставить / знімає «×»
  table.querySelectorAll('td.col-week').forEach((cell) => {
    const toggle = () => {
      cell.classList.toggle('crossed');
    };
    cell.addEventListener('click', toggle);
    cell.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });
  });
}

/* ---------- 2. Автовисота для textarea (там, де вони лишились) ---------- */

function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

/* ---------- 3. Експорт у PDF ---------- */

async function downloadPdf() {
  const button = document.getElementById('download-pdf');
  const containers = document.querySelectorAll('.container-a4');
  if (!containers.length) return;

  const jsPDFCtor = window.jspdf && window.jspdf.jsPDF;
  if (!jsPDFCtor || typeof window.html2canvas !== 'function') {
    alert('Не вдалося завантажити бібліотеки для створення PDF. Перевірте інтернет-зʼєднання.');
    return;
  }

  button.disabled = true;
  const originalLabel = button.textContent;
  button.textContent = 'Формування PDF…';

  document.body.classList.add('exporting');

  try {
    // Чекаємо на завантаження шрифтів, щоб PDF відповідав тому, що на екрані
    if (document.fonts && document.fonts.ready) await document.fonts.ready;

    const pdf = new jsPDFCtor('landscape', 'mm', 'a4');

    for (let i = 0; i < containers.length; i++) {
      const canvas = await window.html2canvas(containers[i], {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        // Фіксуємо ширину віртуального вікна рендеру, щоб мобільний екран/зум не псували розміри:
        windowWidth: 1250,
        windowHeight: 900,
        onclone: (clonedDoc) => {
          // Примусово повертаємо контейнер А4 в еталонні розміри на час експорту
          const clonedContainer = clonedDoc.querySelectorAll('.container-a4')[i];
          if (clonedContainer) {
            clonedContainer.style.width = '297mm';
            clonedContainer.style.height = '210mm';
            clonedContainer.style.display = 'flex';
            clonedContainer.style.flexDirection = 'row';
          }

          const inputs = clonedDoc.querySelectorAll('input');
          inputs.forEach((input) => {
            const val = input.value || '';
            const textDiv = clonedDoc.createElement('div');
            textDiv.textContent = val;

            textDiv.className = input.className;
            textDiv.style.width = '100%';
            textDiv.style.boxSizing = 'border-box';
            textDiv.style.fontFamily = '"Times New Roman", Times, serif';
            textDiv.style.color = '#000000';
            textDiv.style.whiteSpace = 'nowrap';
            textDiv.style.overflow = 'hidden';          // Запобігає вильоту тексту за межі!

            if (input.closest('#practice-table')) {
              // 1. ТАБЛИЦЯ ГРАФІКА
              textDiv.style.height = '100%';
              textDiv.style.display = 'flex';
              textDiv.style.alignItems = 'center';
              textDiv.style.fontSize = '9px';           // трохи компактніший шрифт для довгих назв
              textDiv.style.lineHeight = '1';
              textDiv.style.textOverflow = 'ellipsis';  // якщо назва наддовга — вона не налізе на сусідні колонки

              if (input.parentElement.classList.contains('col-task')) {
                textDiv.style.justifyContent = 'flex-start';
                textDiv.style.paddingLeft = '1mm';
                textDiv.style.textAlign = 'left';
              } else {
                textDiv.style.justifyContent = 'center';
                textDiv.style.textAlign = 'center';
              }
            } else if (input.closest('.list')) {
              // 2. РЯДКИ ЗАПИСІВ ТА ВІДГУКІВ
              textDiv.style.height = '100%';
              textDiv.style.display = 'flex';
              textDiv.style.alignItems = 'flex-end';
              textDiv.style.fontSize = '11px';
              textDiv.style.lineHeight = '1';
              textDiv.style.textAlign = 'left';
              textDiv.style.paddingBottom = '1px';
              textDiv.style.paddingLeft = '1mm';
              textDiv.style.textOverflow = 'clip';
            } else {
              // 3. ЗВИЧАЙНІ ПОЛЯ ФОРМИ
              textDiv.style.fontSize = '12.5px';
              textDiv.style.lineHeight = '1.1';
              textDiv.style.textAlign = input.style.textAlign || 'center';
              textDiv.style.paddingBottom = '1.5px';
            }

            input.parentNode.replaceChild(textDiv, input);
          });
        }
      });

      if (i > 0) pdf.addPage();
      pdf.addImage(
        canvas.toDataURL('image/jpeg', 0.98),
        'JPEG',
        0,
        0,
        pdf.internal.pageSize.getWidth(),
        pdf.internal.pageSize.getHeight(),
      );
    }

    pdf.save('shchodennyk-praktyky.pdf');
  } catch (error) {
    console.error('Помилка при створенні PDF:', error);
    alert('Помилка при створенні PDF. Деталі — у консолі браузера.');
  } finally {
    document.body.classList.remove('exporting');
    button.disabled = false;
    button.textContent = originalLabel;
  }
}

/* ---------- 4. Ініціалізація ---------- */

document.addEventListener('DOMContentLoaded', () => {
  buildPracticeTable();

  document.querySelectorAll('textarea').forEach((textarea) => {
    textarea.addEventListener('input', () => adjustTextareaHeight(textarea));
    adjustTextareaHeight(textarea);
  });

  const button = document.getElementById('download-pdf');
  if (button) button.addEventListener('click', downloadPdf);
});
