/* ============================================================
   Щоденник практики — інтерактив + експорт у PDF
   ============================================================ */

/* ============================================================
   1. Календарний графік проходження практики (зсув, автонумерація, об'єднання)
   ============================================================ */

const WEEKS_COUNT = 8;   // кількість тижнів практики
const TABLE_ROWS = 22;   // кількість рядків таблиці

function buildPracticeTable() {
  const table = document.getElementById('practice-table');
  if (!table) return;

  const weekHeaders = Array.from({ length: WEEKS_COUNT }, (_, i) => `<th>${i + 1}</th>`).join('');

  let body = '';
  for (let r = 0; r < TABLE_ROWS; r++) {
    // col-no робимо readonly для надійної автонумерації
    let cells = `<td class="col-no"><input type="text" readonly tabindex="-1" placeholder=""></td>`;
    cells += `<td class="col-task"><input type="text" placeholder=""></td>`;
    for (let w = 1; w <= WEEKS_COUNT; w++) {
      cells += `<td class="col-week" role="button" tabindex="0" aria-label="Тиждень ${w}"></td>`;
    }
    cells += `<td class="col-note"><input type="text" placeholder=""></td>`;
    body += `<tr data-row="${r}">${cells}</tr>`;
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

  initPracticeTableInteractions(table);
}

/* ---------- Допоміжні функції роботи з рядками таблиці ---------- */

function isRowCompletelyEmpty(row) {
  const task = row.querySelector('.col-task input').value.trim();
  const note = row.querySelector('.col-note input').value.trim();
  const hasWeeks = Array.from(row.querySelectorAll('.col-week')).some(td => td.classList.contains('crossed'));
  return !task && !note && !hasWeeks;
}

function copyRowContent(srcRow, destRow) {
  const srcTask = srcRow.querySelector('.col-task input');
  const destTask = destRow.querySelector('.col-task input');
  destTask.value = srcTask.value;
  destTask.dataset.isContinuation = srcTask.dataset.isContinuation || 'false';

  const srcNote = srcRow.querySelector('.col-note input');
  const destNote = destRow.querySelector('.col-note input');
  destNote.value = srcNote.value;

  const srcWeeks = srcRow.querySelectorAll('.col-week');
  const destWeeks = destRow.querySelectorAll('.col-week');
  srcWeeks.forEach((sw, idx) => {
    if (sw.classList.contains('crossed')) {
      destWeeks[idx].classList.add('crossed');
    } else {
      destWeeks[idx].classList.remove('crossed');
    }
  });
}

function clearRowContent(row, asContinuation = false) {
  const task = row.querySelector('.col-task input');
  task.value = '';
  task.dataset.isContinuation = asContinuation ? 'true' : 'false';

  const note = row.querySelector('.col-note input');
  note.value = '';

  row.querySelectorAll('.col-week').forEach(w => w.classList.remove('crossed'));
}

// Зсув рядків униз, починаючи з fromIdx
function shiftRowsDown(rows, fromIdx) {
  const lastIdx = rows.length - 1;
  // Якщо 22-й рядок зайнятий — зсувати нікуди (таблиця заповнена)
  if (!isRowCompletelyEmpty(rows[lastIdx])) {
    return false;
  }

  for (let i = lastIdx; i > fromIdx; i--) {
    copyRowContent(rows[i - 1], rows[i]);
  }

  clearRowContent(rows[fromIdx], true);
  return true;
}

// Зсув рядків угору (видалення непотрібного порожнього рядка)
function shiftRowsUp(rows, fromIdx) {
  const lastIdx = rows.length - 1;

  for (let i = fromIdx; i < lastIdx; i++) {
    copyRowContent(rows[i + 1], rows[i]);
  }

  clearRowContent(rows[lastIdx], false);
}

/* ---------- Оновлення автонумерації та об'єднання комірок ---------- */

function refreshTableMergeState(rows) {
  // 1. Скидання rowSpan та видимості
  rows.forEach((row) => {
    row.querySelector('.col-no').rowSpan = 1;
    row.querySelector('.col-no').style.display = '';
    row.querySelector('.col-note').rowSpan = 1;
    row.querySelector('.col-note').style.display = '';
    row.querySelectorAll('.col-week').forEach(w => {
      w.rowSpan = 1;
      w.style.display = '';
    });

    const taskCell = row.querySelector('.col-task');
    taskCell.classList.remove('task-merged-top', 'task-merged-middle', 'task-merged-bottom');
  });

  // 2. Розрахунок автонумерації та об'єднань
  let taskCounter = 0;
  let i = 0;

  while (i < rows.length) {
    const taskInput = rows[i].querySelector('.col-task input');
    const isCont = taskInput.dataset.isContinuation === 'true';

    // Рахуємо кількість рядків-продовжень для цього завдання
    let span = 1;
    while (
      i + span < rows.length &&
      rows[i + span].querySelector('.col-task input').dataset.isContinuation === 'true' &&
      rows[i + span].querySelector('.col-task input').value.trim() !== ''
    ) {
      span++;
    }

    const hasAnyContent = !isRowCompletelyEmpty(rows[i]) || taskInput.value.trim() !== '';

    // Автонумерація: тільки для кореневих рядків, які мають вміст
    if (!isCont && hasAnyContent) {
      taskCounter++;
      rows[i].querySelector('.col-no input').value = String(taskCounter);
    } else {
      rows[i].querySelector('.col-no input').value = '';
    }

    // Об'єднання оформлення
    if (span > 1) {
      const parentRow = rows[i];
      parentRow.querySelector('.col-no').rowSpan = span;
      parentRow.querySelector('.col-note').rowSpan = span;
      parentRow.querySelectorAll('.col-week').forEach(w => w.rowSpan = span);

      parentRow.querySelector('.col-task').classList.add('task-merged-top');

      for (let k = 1; k < span; k++) {
        const childRow = rows[i + k];
        childRow.querySelector('.col-no').style.display = 'none';
        childRow.querySelector('.col-note').style.display = 'none';
        childRow.querySelectorAll('.col-week').forEach(w => w.style.display = 'none');

        const taskCell = childRow.querySelector('.col-task');
        if (k === span - 1) {
          taskCell.classList.add('task-merged-bottom');
        } else {
          taskCell.classList.add('task-merged-middle');
        }
      }
      i += span;
    } else {
      i++;
    }
  }
}

/* ---------- Інтерактивні слухачі таблиці ---------- */

function initPracticeTableInteractions(table) {
  const tbody = table.querySelector('tbody');
  const rows = Array.from(tbody.querySelectorAll('tr'));

  // 1. Клік по тижнях (перемикання «×»)
  tbody.addEventListener('click', (e) => {
    const cell = e.target.closest('td.col-week');
    if (!cell) return;
    cell.classList.toggle('crossed');
    refreshTableMergeState(rows);
  });

  tbody.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const cell = e.target.closest('td.col-week');
      if (cell) {
        e.preventDefault();
        cell.classList.toggle('crossed');
        refreshTableMergeState(rows);
      }
    }
  });

  // 2. Обмеження поля «Примітки»
  tbody.querySelectorAll('.col-note input').forEach((input) => {
    input.addEventListener('input', () => {
      const font = getInputFont(input);
      const maxWidth = getInputAvailableWidth(input);
      if (getTextWidth(input.value, font) > maxWidth) {
        let trimmed = input.value;
        while (trimmed.length > 0 && getTextWidth(trimmed, font) > maxWidth) {
          trimmed = trimmed.slice(0, -1);
        }
        input.value = trimmed;
      }
      refreshTableMergeState(rows);
    });
  });

  // 3. Стовпець «Назва робіт»
  const taskInputs = rows.map(r => r.querySelector('.col-task input'));

  taskInputs.forEach((input, rIdx) => {
    // Введення тексту з розумним переносом та захистом від перекриття
    input.addEventListener('input', () => {
      handleTaskRowInput(rows, rIdx);
    });

    // Backspace, Delete, Стрілки
    input.addEventListener('keydown', (e) => {
      // Backspace на початку рядка-продовження
      if (e.key === 'Backspace' && input.selectionStart === 0 && input.selectionEnd === 0 && rIdx > 0) {
        const isCont = input.dataset.isContinuation === 'true';
        if (isCont) {
          e.preventDefault();
          const prevInput = rows[rIdx - 1].querySelector('.col-task input');
          const prevLen = prevInput.value.length;
          const font = getInputFont(prevInput);
          const maxWidth = getInputAvailableWidth(prevInput);
          const currText = input.value.trim();

          if (currText) {
            const words = currText.split(/\s+/).filter(Boolean);
            let fitWords = [];
            let combined = prevInput.value + (prevInput.value.endsWith(' ') ? '' : (prevInput.value ? ' ' : ''));

            for (let w = 0; w < words.length; w++) {
              if (getTextWidth(combined + words[w], font) <= maxWidth) {
                combined += words[w] + ' ';
                fitWords.push(words[w]);
              } else {
                break;
              }
            }

            prevInput.value = combined.trim();
            input.value = words.slice(fitWords.length).join(' ');
            prevInput.focus();
            prevInput.setSelectionRange(prevLen + 1, prevLen + 1);
          } else {
            prevInput.focus();
            prevInput.setSelectionRange(prevLen, prevLen);
          }

          // Якщо рядок спорожнів — видаляємо його і підтягуємо все нижче вгору
          if (!input.value.trim()) {
            shiftRowsUp(rows, rIdx);
          }

          refreshTableMergeState(rows);
        }
      }

      // Enter — перехід до наступного рядка
      else if (e.key === 'Enter') {
        e.preventDefault();
        if (rIdx < rows.length - 1) {
          rows[rIdx + 1].querySelector('.col-task input').focus();
        }
      }

      // Стрілки
      else if (e.key === 'ArrowUp' && rIdx > 0) {
        e.preventDefault();
        rows[rIdx - 1].querySelector('.col-task input').focus();
      } else if (e.key === 'ArrowDown' && rIdx < rows.length - 1) {
        e.preventDefault();
        rows[rIdx + 1].querySelector('.col-task input').focus();
      }
    });

    // Вставка довгого тексту
    input.addEventListener('paste', (e) => {
      const pasteText = (e.clipboardData || window.clipboardData).getData('text');
      if (!pasteText) return;
      e.preventDefault();

      const before = input.value.slice(0, input.selectionStart);
      const after = input.value.slice(input.selectionEnd);
      const fullText = (before + (before && !before.endsWith(' ') ? ' ' : '') + pasteText + (after ? ' ' + after : '')).replace(/\s+/g, ' ').trim();

      input.value = fullText;
      handleTaskRowInput(rows, rIdx);
    });
  });
}

// Розумна обробка тексту в рядку завдання
function handleTaskRowInput(rows, rIdx) {
  const input = rows[rIdx].querySelector('.col-task input');
  const font = getInputFont(input);
  const maxWidth = getInputAvailableWidth(input);
  let text = input.value;

  // Якщо текст помістився повністю
  if (getTextWidth(text, font) <= maxWidth) {
    // Перевіряємо, чи не можна підтягнути слова з наступного рядка-продовження (якщо користувач пратиме текст)
    pullUpFromNextTaskRow(rows, rIdx);
    refreshTableMergeState(rows);
    return;
  }

  // Розрахунок слів, що поміщаються
  const words = text.split(' ');
  let fitWords = [];
  let testStr = '';

  for (let w = 0; w < words.length; w++) {
    const candidate = w === 0 ? words[w] : testStr + ' ' + words[w];
    if (getTextWidth(candidate, font) <= maxWidth) {
      testStr = candidate;
      fitWords.push(words[w]);
    } else {
      break;
    }
  }

  let keepText = '';
  let overflowText = '';

  // Якщо навіть одне слово не поміщається (суцільний текст)
  if (fitWords.length === 0) {
    let charFit = '';
    for (let c = 0; c < text.length; c++) {
      if (getTextWidth(charFit + text[c], font) <= maxWidth) {
        charFit += text[c];
      } else {
        break;
      }
    }
    if (charFit.length > 0) {
      keepText = charFit;
      overflowText = text.slice(charFit.length);
    } else {
      keepText = text;
      overflowText = '';
    }
  } else {
    keepText = fitWords.join(' ');
    overflowText = words.slice(fitWords.length).join(' ');
  }

  // Якщо це останній 22-й рядок таблиці — переносити нікуди, зупиняємо текст
  if (rIdx >= rows.length - 1) {
    input.value = keepText;
    refreshTableMergeState(rows);
    return;
  }

  // Перевіряємо наступний рядок (rIdx + 1)
  const nextInput = rows[rIdx + 1].querySelector('.col-task input');
  const nextIsContinuation = nextInput.dataset.isContinuation === 'true';

  // Якщо наступний рядок — це інший пункт
  if (!nextIsContinuation) {
    if (isRowCompletelyEmpty(rows[rIdx + 1])) {
      // Наступний рядок порожній — робимо його продовженням
      nextInput.dataset.isContinuation = 'true';
    } else {
      // Наступний рядок зайнятий іншим пунктом — зсуваємо все вниз!
      const shifted = shiftRowsDown(rows, rIdx + 1);
      if (!shifted) {
        // Якщо таблиця заповнена до 22 рядка — блокуємо розширення
        input.value = keepText;
        refreshTableMergeState(rows);
        return;
      }
      nextInput.dataset.isContinuation = 'true';
    }
  }

  // Записуємо текст і переносимо хвіст у наступний рядок
  input.value = keepText;
  nextInput.value = overflowText + (nextInput.value ? ' ' + nextInput.value : '');
  nextInput.focus();
  nextInput.setSelectionRange(overflowText.length, overflowText.length);

  // Рекурсивно перевіряємо наступний рядок
  handleTaskRowInput(rows, rIdx + 1);
}

// Підтягування слів із нижнього рядка при стиранні тексту у верхньому
function pullUpFromNextTaskRow(rows, rIdx) {
  if (rIdx >= rows.length - 1) return;
  const currentInput = rows[rIdx].querySelector('.col-task input');
  const nextInput = rows[rIdx + 1].querySelector('.col-task input');

  if (nextInput.dataset.isContinuation !== 'true') return;

  const font = getInputFont(currentInput);
  const maxWidth = getInputAvailableWidth(currentInput);
  const nextText = nextInput.value.trim();

  if (!nextText) {
    shiftRowsUp(rows, rIdx + 1);
    refreshTableMergeState(rows);
    return;
  }

  const nextWords = nextText.split(/\s+/).filter(Boolean);
  let fitWords = [];
  let combined = currentInput.value + (currentInput.value.endsWith(' ') ? '' : (currentInput.value ? ' ' : ''));

  for (let w = 0; w < nextWords.length; w++) {
    if (getTextWidth(combined + nextWords[w], font) <= maxWidth) {
      combined += nextWords[w] + ' ';
      fitWords.push(nextWords[w]);
    } else {
      break;
    }
  }

  if (fitWords.length > 0) {
    currentInput.value = combined.trim();
    nextInput.value = nextWords.slice(fitWords.length).join(' ');

    if (!nextInput.value.trim()) {
      shiftRowsUp(rows, rIdx + 1);
    } else {
      pullUpFromNextTaskRow(rows, rIdx + 1);
    }
    refreshTableMergeState(rows);
  }
}

/* ============================================================
   2. Автовисота для textarea (там, де вони лишились)
   ============================================================ */

function adjustTextareaHeight(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

/* ============================================================
   3. Експорт у PDF
   ============================================================ */

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
            textDiv.style.overflow = 'hidden';  // Запобігає вильоту тексту за межі!

            if (input.closest('#practice-table')) {
              textDiv.style.height = '100%';
              textDiv.style.display = 'flex';
              textDiv.style.alignItems = 'center';
              textDiv.style.fontSize = '9.5px';
              textDiv.style.lineHeight = '1.25';
              textDiv.style.overflow = 'visible';
              textDiv.style.paddingBottom = '2px';

              const parentTd = input.parentElement;
              if (parentTd.classList.contains('col-task')) {
                textDiv.style.justifyContent = 'flex-start';
                textDiv.style.paddingLeft = '1.2mm';
                textDiv.style.textAlign = 'left';

                // Зняття ліній для об'єднаних блоків у PDF
                if (parentTd.classList.contains('task-merged-top') || parentTd.classList.contains('task-merged-middle')) {
                  parentTd.style.borderBottom = 'none';
                  parentTd.style.borderBottomColor = 'transparent';
                }
                if (parentTd.classList.contains('task-merged-bottom') || parentTd.classList.contains('task-merged-middle')) {
                  parentTd.style.borderTop = 'none';
                  parentTd.style.borderTopColor = 'transparent';
                }
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
              textDiv.style.fontSize = input.style.fontSize || '12.5px';
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

/* ============================================================
   4. Ініціалізація
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  buildPracticeTable();
  initMultilineInputs();
  initFieldValidationAndShrink();

  document.querySelectorAll('textarea').forEach((textarea) => {
    textarea.addEventListener('input', () => adjustTextareaHeight(textarea));
    adjustTextareaHeight(textarea);
  });

  const button = document.getElementById('download-pdf');
  if (button) button.addEventListener('click', downloadPdf);
});

/* ============================================================
   5. Багаторядковий плавний перенос тексту та міжрядкове виділення
   ============================================================ */

const canvasMeasurer = document.createElement('canvas');
const ctxMeasurer = canvasMeasurer.getContext('2d');

function getTextWidth(text, font) {
  ctxMeasurer.font = font;
  return ctxMeasurer.measureText(text).width;
}

function getInputAvailableWidth(input) {
  const style = window.getComputedStyle(input);
  const pl = parseFloat(style.paddingLeft) || 0;
  const pr = parseFloat(style.paddingRight) || 0;
  return Math.max(10, input.clientWidth - pl - pr - 5);
}

function getInputFont(input) {
  const style = window.getComputedStyle(input);
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
}

// Розрахунок позиції курсора в символах за координатами миші
function getCaretOffsetFromPoint(input, clientX) {
  const rect = input.getBoundingClientRect();
  const style = window.getComputedStyle(input);
  const pl = parseFloat(style.paddingLeft) || 0;
  const clickX = clientX - rect.left - pl;
  const text = input.value;
  const font = getInputFont(input);

  if (clickX <= 0) return 0;
  if (clickX >= getTextWidth(text, font)) return text.length;

  let bestOffset = 0;
  let minDiff = Infinity;
  for (let i = 0; i <= text.length; i++) {
    const w = getTextWidth(text.slice(0, i), font);
    const diff = Math.abs(w - clickX);
    if (diff < minDiff) {
      minDiff = diff;
      bestOffset = i;
    }
  }
  return bestOffset;
}

function getMultilineBlocks() {
  const allListGroups = document.querySelectorAll('.form-group.list');
  const blocks = [];
  let currentBlock = [];

  allListGroups.forEach((group, index) => {
    const input = group.querySelector('input');
    if (!input) return;

    if (currentBlock.length === 0) {
      currentBlock.push(input);
    } else {
      const prevGroup = allListGroups[index - 1];
      if (group.previousElementSibling === prevGroup) {
        currentBlock.push(input);
      } else {
        blocks.push(currentBlock);
        currentBlock = [input];
      }
    }
  });

  if (currentBlock.length > 0) {
    blocks.push(currentBlock);
  }

  return blocks;
}

// Перенос слів при переповненні
function handleOverflow(inputs, idx) {
  if (idx >= inputs.length) return;

  const input = inputs[idx];
  const font = getInputFont(input);
  const maxWidth = getInputAvailableWidth(input);
  const text = input.value;

  if (getTextWidth(text, font) <= maxWidth) return;

  if (idx === inputs.length - 1) {
    let trimmed = text;
    while (trimmed.length > 0 && getTextWidth(trimmed, font) > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    input.value = trimmed;
    return;
  }

  const words = text.split(' ');
  let fitWords = [];
  let testStr = '';

  for (let w = 0; w < words.length; w++) {
    const candidate = w === 0 ? words[w] : testStr + ' ' + words[w];
    if (getTextWidth(candidate, font) <= maxWidth) {
      testStr = candidate;
      fitWords.push(words[w]);
    } else {
      break;
    }
  }

  let keepText = '';
  let overflowText = '';

  if (fitWords.length > 0) {
    keepText = fitWords.join(' ');
    overflowText = words.slice(fitWords.length).join(' ');
  } else {
    let charFit = '';
    for (let c = 0; c < text.length; c++) {
      if (getTextWidth(charFit + text[c], font) <= maxWidth) {
        charFit += text[c];
      } else {
        keepText = charFit;
        overflowText = text.slice(c);
        break;
      }
    }
  }

  input.value = keepText;

  const nextInput = inputs[idx + 1];
  if (nextInput) {
    nextInput.value = overflowText + (nextInput.value ? ' ' + nextInput.value : '');
    nextInput.focus();
    nextInput.setSelectionRange(overflowText.length, overflowText.length);
    handleOverflow(inputs, idx + 1);
  }
}

// Каскадне підтягування слів знизу вгору
function cascadePullUp(inputs, fromIdx) {
  for (let k = fromIdx; k < inputs.length - 1; k++) {
    const targetInput = inputs[k];
    const sourceInput = inputs[k + 1];

    const sourceText = sourceInput.value.trim();
    if (!sourceText) break;

    const targetText = targetInput.value.trim();
    const font = getInputFont(targetInput);
    const maxWidth = getInputAvailableWidth(targetInput);

    const sep = targetText.length > 0 ? ' ' : '';
    const words = sourceText.split(/\s+/).filter(Boolean);
    let fitWords = [];
    let currentCombined = targetText;

    for (let w = 0; w < words.length; w++) {
      const candidate = currentCombined + (fitWords.length === 0 && targetText.length > 0 ? sep : (currentCombined.length > 0 ? ' ' : '')) + words[w];
      if (getTextWidth(candidate, font) <= maxWidth) {
        currentCombined = candidate;
        fitWords.push(words[w]);
      } else {
        break;
      }
    }

    if (fitWords.length > 0) {
      targetInput.value = currentCombined;
      sourceInput.value = words.slice(fitWords.length).join(' ');
    } else {
      break;
    }
  }
}

// Вставка великого тексту
function handlePaste(inputs, startIdx, pasteText) {
  const font = getInputFont(inputs[startIdx]);
  const paragraphs = pasteText.split(/\r?\n/);
  let currentIdx = startIdx;

  paragraphs.forEach((para) => {
    if (currentIdx >= inputs.length) return;

    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      inputs[currentIdx].value = '';
      currentIdx++;
      return;
    }

    let currentWords = [];
    for (let w = 0; w < words.length; w++) {
      if (currentIdx >= inputs.length) break;

      const input = inputs[currentIdx];
      const maxWidth = getInputAvailableWidth(input);
      const testLine = [...currentWords, words[w]].join(' ');

      if (getTextWidth(testLine, font) <= maxWidth) {
        currentWords.push(words[w]);
      } else {
        if (currentWords.length > 0) {
          input.value = currentWords.join(' ');
          currentIdx++;
          currentWords = [words[w]];
        } else {
          let charFit = '';
          const longWord = words[w];
          for (let c = 0; c < longWord.length; c++) {
            if (getTextWidth(charFit + longWord[c], font) <= maxWidth) {
              charFit += longWord[c];
            } else {
              input.value = charFit;
              currentIdx++;
              charFit = longWord[c];
            }
          }
          currentWords = [charFit];
        }
      }
    }

    if (currentIdx < inputs.length && currentWords.length > 0) {
      inputs[currentIdx].value = currentWords.join(' ');
      currentIdx++;
    }
  });

  const finalIdx = Math.min(currentIdx, inputs.length - 1);
  inputs[finalIdx].focus();
  const len = inputs[finalIdx].value.length;
  inputs[finalIdx].setSelectionRange(len, len);
}

/* ============================================================
   6. Логіка міжрядкового виділення тексту
   ============================================================ */

let activeSelection = null; // { inputs, from: { idx, offset }, to: { idx, offset } }
let isSelecting = false;
let selectStart = null;

function clearSelectionHighlight() {
  document.querySelectorAll('.selection-highlight').forEach(el => el.remove());
}

function renderSelectionHighlight(sel) {
  clearSelectionHighlight();
  if (!sel) return;

  const { inputs, from, to } = sel;
  const font = getInputFont(inputs[from.idx]);

  for (let i = from.idx; i <= to.idx; i++) {
    const input = inputs[i];
    const parent = input.parentElement;
    const val = input.value;
    const style = window.getComputedStyle(input);
    const pl = parseFloat(style.paddingLeft) || 0;

    let startX = 0;
    let endX = 0;

    if (from.idx === to.idx) {
      startX = getTextWidth(val.slice(0, from.offset), font);
      endX = getTextWidth(val.slice(0, to.offset), font);
    } else if (i === from.idx) {
      startX = getTextWidth(val.slice(0, from.offset), font);
      endX = getTextWidth(val, font);
    } else if (i === to.idx) {
      startX = 0;
      endX = getTextWidth(val.slice(0, to.offset), font);
    } else {
      startX = 0;
      endX = getTextWidth(val, font);
    }

    const width = Math.max(0, endX - startX);
    if (width > 0 || (i > from.idx && i < to.idx && val.length === 0)) {
      const hl = document.createElement('div');
      hl.className = 'selection-highlight';
      hl.style.left = (pl + startX) + 'px';
      hl.style.width = (width > 0 ? width : 8) + 'px';
      parent.appendChild(hl);
    }
  }
}

function getSelectedText(sel) {
  if (!sel) return '';
  const { inputs, from, to } = sel;
  if (from.idx === to.idx) {
    return inputs[from.idx].value.slice(from.offset, to.offset);
  }
  const lines = [];
  for (let i = from.idx; i <= to.idx; i++) {
    const val = inputs[i].value;
    if (i === from.idx) {
      lines.push(val.slice(from.offset));
    } else if (i === to.idx) {
      lines.push(val.slice(0, to.offset));
    } else {
      lines.push(val);
    }
  }
  return lines.join('\n');
}

function deleteSelection(sel) {
  if (!sel) return;
  const { inputs, from, to } = sel;

  if (from.idx === to.idx) {
    const input = inputs[from.idx];
    const val = input.value;
    input.value = val.slice(0, from.offset) + val.slice(to.offset);
    input.focus();
    input.setSelectionRange(from.offset, from.offset);
    cascadePullUp(inputs, from.idx);
    clearSelectionHighlight();
    activeSelection = null;
    return;
  }

  const startVal = inputs[from.idx].value.slice(0, from.offset);
  const endVal = inputs[to.idx].value.slice(to.offset);
  inputs[from.idx].value = startVal + (startVal && endVal && !startVal.endsWith(' ') ? ' ' : '') + endVal;

  const numDeletedLines = to.idx - from.idx;
  for (let i = from.idx + 1; i < inputs.length; i++) {
    const sourceIdx = i + numDeletedLines;
    inputs[i].value = sourceIdx < inputs.length ? inputs[sourceIdx].value : '';
  }

  inputs[from.idx].focus();
  inputs[from.idx].setSelectionRange(from.offset, from.offset);

  handleOverflow(inputs, from.idx);
  cascadePullUp(inputs, from.idx);

  clearSelectionHighlight();
  activeSelection = null;
}

// Ініціалізація блоків
function initMultilineInputs() {
  const blocks = getMultilineBlocks();

  blocks.forEach((inputs) => {
    inputs.forEach((input, idx) => {
      // 1. Початок виділення мишкою
      input.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return; // тільки ліва кнопка

        clearSelectionHighlight();
        activeSelection = null;
        isSelecting = true;
        selectStart = {
          block: inputs,
          idx: idx,
          offset: getCaretOffsetFromPoint(input, e.clientX)
        };
      });

      // 2. Введення символів
      input.addEventListener('input', () => {
        handleOverflow(inputs, idx);
      });

      // 3. Гарячі клавіші та переходи
      input.addEventListener('keydown', (e) => {
        // Якщо є активне міжрядкове виділення
        if (activeSelection) {
          if (e.key === 'Backspace' || e.key === 'Delete') {
            e.preventDefault();
            deleteSelection(activeSelection);
            return;
          }
          // Заміна виділеного тексту введеною літерою
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            e.preventDefault();
            const char = e.key;
            const targetInput = activeSelection.inputs[activeSelection.from.idx];
            const pos = activeSelection.from.offset;
            deleteSelection(activeSelection);

            targetInput.value = targetInput.value.slice(0, pos) + char + targetInput.value.slice(pos);
            targetInput.setSelectionRange(pos + 1, pos + 1);
            handleOverflow(inputs, idx);
            return;
          }
          if (e.key.startsWith('Arrow')) {
            clearSelectionHighlight();
            activeSelection = null;
          }
        }

        // Ctrl + A: виділити весь текст у поточному блоці
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          let lastIdx = 0;
          for (let i = inputs.length - 1; i >= 0; i--) {
            if (inputs[i].value.trim() !== '') {
              lastIdx = i;
              break;
            }
          }
          activeSelection = {
            inputs: inputs,
            from: { idx: 0, offset: 0 },
            to: { idx: lastIdx, offset: inputs[lastIdx].value.length }
          };
          renderSelectionHighlight(activeSelection);
          return;
        }

        // BACKSPACE: повернення та підтягування рядка
        if (e.key === 'Backspace') {
          if (input.selectionStart === 0 && input.selectionEnd === 0 && idx > 0) {
            e.preventDefault();
            const prevInput = inputs[idx - 1];
            const prevText = prevInput.value;
            const currText = input.value;

            if (currText.trim() === '') {
              for (let k = idx; k < inputs.length - 1; k++) {
                inputs[k].value = inputs[k + 1].value;
              }
              inputs[inputs.length - 1].value = '';
              prevInput.focus();
              const prevLen = prevInput.value.length;
              prevInput.setSelectionRange(prevLen, prevLen);
              return;
            }

            const font = getInputFont(prevInput);
            const maxWidth = getInputAvailableWidth(prevInput);
            const words = currText.trim().split(/\s+/).filter(Boolean);
            let fitWords = [];
            let currentCombined = prevText;
            const sep = (prevText.length > 0 && !prevText.endsWith(' ')) ? ' ' : '';

            for (let w = 0; w < words.length; w++) {
              const candidate = currentCombined + (fitWords.length === 0 ? sep : ' ') + words[w];
              if (getTextWidth(candidate, font) <= maxWidth) {
                currentCombined = candidate;
                fitWords.push(words[w]);
              } else {
                break;
              }
            }

            if (fitWords.length > 0) {
              const targetCursorPos = prevText.length + (prevText.length > 0 ? sep.length : 0);
              prevInput.value = currentCombined;
              input.value = words.slice(fitWords.length).join(' ');
              prevInput.focus();
              prevInput.setSelectionRange(targetCursorPos, targetCursorPos);
              cascadePullUp(inputs, idx);
            } else {
              prevInput.focus();
              const prevLen = prevInput.value.length;
              prevInput.setSelectionRange(prevLen, prevLen);
            }
          }
        }

        // DELETE: підтягування тексту праворуч
        else if (e.key === 'Delete') {
          if (input.selectionStart === input.value.length && input.selectionEnd === input.value.length && idx < inputs.length - 1) {
            const nextInput = inputs[idx + 1];
            if (nextInput.value.trim() !== '') {
              e.preventDefault();
              const font = getInputFont(input);
              const maxWidth = getInputAvailableWidth(input);
              const currentText = input.value;
              const nextWords = nextInput.value.trim().split(/\s+/).filter(Boolean);
              const sep = (currentText.length > 0 && !currentText.endsWith(' ')) ? ' ' : '';

              let fitWords = [];
              let currentCombined = currentText;

              for (let w = 0; w < nextWords.length; w++) {
                const candidate = currentCombined + (fitWords.length === 0 ? sep : ' ') + nextWords[w];
                if (getTextWidth(candidate, font) <= maxWidth) {
                  currentCombined = candidate;
                  fitWords.push(nextWords[w]);
                } else {
                  break;
                }
              }

              if (fitWords.length > 0) {
                const cursorPos = input.selectionStart;
                input.value = currentCombined;
                nextInput.value = nextWords.slice(fitWords.length).join(' ');
                input.setSelectionRange(cursorPos, cursorPos);
                cascadePullUp(inputs, idx + 1);
              }
            }
          }
        }

        // ENTER
        else if (e.key === 'Enter') {
          e.preventDefault();
          if (idx < inputs.length - 1) {
            inputs[idx + 1].focus();
            inputs[idx + 1].setSelectionRange(0, 0);
          }
        }

        // СТРІЛКИ
        else if (e.key === 'ArrowUp' && idx > 0) {
          e.preventDefault();
          const prevInput = inputs[idx - 1];
          const pos = Math.min(input.selectionStart, prevInput.value.length);
          prevInput.focus();
          prevInput.setSelectionRange(pos, pos);
        } else if (e.key === 'ArrowDown' && idx < inputs.length - 1) {
          e.preventDefault();
          const nextInput = inputs[idx + 1];
          const pos = Math.min(input.selectionStart, nextInput.value.length);
          nextInput.focus();
          nextInput.setSelectionRange(pos, pos);
        } else if (e.key === 'ArrowLeft' && input.selectionStart === 0 && input.selectionEnd === 0 && idx > 0) {
          e.preventDefault();
          const prevInput = inputs[idx - 1];
          prevInput.focus();
          const len = prevInput.value.length;
          prevInput.setSelectionRange(len, len);
        } else if (e.key === 'ArrowRight' && input.selectionStart === input.value.length && idx < inputs.length - 1) {
          e.preventDefault();
          const nextInput = inputs[idx + 1];
          nextInput.focus();
          nextInput.setSelectionRange(0, 0);
        }
      });

      // 4. Вставка тексту (Paste)
      input.addEventListener('paste', (e) => {
        const pasteData = (e.clipboardData || window.clipboardData).getData('text');
        if (!pasteData) return;

        e.preventDefault();
        if (activeSelection) deleteSelection(activeSelection);

        const before = input.value.slice(0, input.selectionStart);
        const after = input.value.slice(input.selectionEnd);
        handlePaste(inputs, idx, before + pasteData + after);
      });
    });
  });

  // Глобальне відстеження руху миші для виділення
  document.addEventListener('mousemove', (e) => {
    if (!isSelecting || !selectStart) return;

    const elem = document.elementFromPoint(e.clientX, e.clientY);
    const hoveredInput = elem ? elem.closest('.form-group.list input') : null;
    if (!hoveredInput) return;

    const currentIdx = selectStart.block.indexOf(hoveredInput);
    if (currentIdx === -1) return;

    const currentOffset = getCaretOffsetFromPoint(hoveredInput, e.clientX);

    let from, to;
    if (selectStart.idx < currentIdx || (selectStart.idx === currentIdx && selectStart.offset <= currentOffset)) {
      from = { idx: selectStart.idx, offset: selectStart.offset };
      to = { idx: currentIdx, offset: currentOffset };
    } else {
      from = { idx: currentIdx, offset: currentOffset };
      to = { idx: selectStart.idx, offset: selectStart.offset };
    }

    // Якщо виділено хоча б 1 символ або між різними рядками
    if (from.idx !== to.idx || from.offset !== to.offset) {
      window.getSelection().removeAllRanges(); // прибираємо стандартне системне виділення
      activeSelection = { inputs: selectStart.block, from, to };
      renderSelectionHighlight(activeSelection);
    } else {
      clearSelectionHighlight();
      activeSelection = null;
    }
  });

  document.addEventListener('mouseup', () => {
    isSelecting = false;
    selectStart = null;
  });

  // Скидання виділення при кліку повз блоки
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.form-group.list')) {
      clearSelectionHighlight();
      activeSelection = null;
    }
  });

  // Глобальна обробка копіювання
  document.addEventListener('copy', (e) => {
    if (!activeSelection) return;
    const text = getSelectedText(activeSelection);
    if (text) {
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
    }
  });

  // Глобальна обробка вирізання
  document.addEventListener('cut', (e) => {
    if (!activeSelection) return;
    const text = getSelectedText(activeSelection);
    if (text) {
      e.clipboardData.setData('text/plain', text);
      e.preventDefault();
      deleteSelection(activeSelection);
    }
  });
}

/* ============================================================
   7. Суворі обмеження для числових пополів та Auto-shrink для тексту
   ============================================================ */

// Плавне масштабування шрифту для однорядкових полів (ПІБ, назви, посади)
function applyAutoShrink(input, baseFontSize = 13, minFontSize = 9) {
  const text = input.value;
  const maxWidth = getInputAvailableWidth(input);
  const computed = window.getComputedStyle(input);
  const fontFamily = computed.fontFamily || '"Times New Roman", Times, serif';
  const fontStyle = computed.fontStyle || 'normal';
  const fontWeight = computed.fontWeight || 'normal';

  if (!text) {
    input.style.fontSize = `${baseFontSize}px`;
    return;
  }

  // Зменшуємо розмір шрифту з кроком 0.5px, доки текст не вміститься
  let currentSize = baseFontSize;
  while (currentSize > minFontSize) {
    const testFont = `${fontStyle} ${fontWeight} ${currentSize}px ${fontFamily}`;
    if (getTextWidth(text, testFont) <= maxWidth) {
      break;
    }
    currentSize -= 0.5;
  }

  input.style.fontSize = `${currentSize}px`;

  // Якщо навіть при 9px текст довший за лінію — жорстко зупиняємо ввід на межі
  const finalFont = `${fontStyle} ${fontWeight} ${minFontSize}px ${fontFamily}`;
  if (getTextWidth(input.value, finalFont) > maxWidth) {
    let trimmed = input.value;
    while (trimmed.length > 0 && getTextWidth(trimmed, finalFont) > maxWidth) {
      trimmed = trimmed.slice(0, -1);
    }
    input.value = trimmed;
  }
}

// Ініціалізація суворих числових рамок та Auto-shrink
function initFieldValidationAndShrink() {
  // 1. Рік і День (всі елементи .type-year input) — строго 2 цифри
  document.querySelectorAll('.type-year input').forEach((input) => {
    input.setAttribute('maxlength', '2');
    input.setAttribute('inputmode', 'numeric');
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(0, 2);
    });
  });

  // 2. Курс — тільки одна цифра від 1 до 6
  const courseGroup = Array.from(document.querySelectorAll('.form-group')).find(g =>
    g.textContent.includes('курс, група')
  );
  if (courseGroup) {
    const courseInput = courseGroup.querySelector('.type-1 input');
    if (courseInput) {
      courseInput.setAttribute('maxlength', '1');
      courseInput.setAttribute('inputmode', 'numeric');
      courseInput.addEventListener('input', () => {
        courseInput.value = courseInput.value.replace(/[^1-6]/g, '').slice(0, 1);
      });
    }
  }

  // 3. Терміни практики "з ... до ..." — формат ДД.ММ (цифри та крапка)
  const termGroup = Array.from(document.querySelectorAll('.form-group')).find(g =>
    g.textContent.includes('Термін практики: з')
  );
  if (termGroup) {
    const dateInputs = termGroup.querySelectorAll('.form-value:not(.type-year) input');
    dateInputs.forEach((input) => {
      input.setAttribute('maxlength', '5');
      input.setAttribute('inputmode', 'numeric');
      input.addEventListener('input', () => {
        let clean = input.value.replace(/[^\d.]/g, '');
        // Автоматично додаємо крапку після двох цифр дня
        if (/^\d{2}$/.test(clean) && !input.value.endsWith('.')) {
          clean = clean + '.';
        }
        input.value = clean.slice(0, 5);
      });
    });
  }

  // 4. Auto-shrink для всіх звичайних однорядкових полів (ПІБ, посади, компанії)
  const singleLineInputs = document.querySelectorAll(
    '.form-value:not(.list):not(.type-year):not(.type-autograph) input'
  );

  singleLineInputs.forEach((input) => {
    // Пропускаємо поле курсу (воно має фіксовану довжину 1)
    if (input.getAttribute('maxlength') === '1') return;

    input.addEventListener('input', () => {
      applyAutoShrink(input, 13, 9);
    });

    // Перевірка при початковому завантаженні сторінки
    if (input.value) {
      applyAutoShrink(input, 13, 9);
    }
  });
}
