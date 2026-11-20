const form = document.querySelector('#task-form');
const input = document.querySelector('#title');
const list = document.querySelector('#tasks');
const summary = document.querySelector('#summary');
const empty = document.querySelector('#empty');
const errorMessage = document.querySelector('#error');
const addButton = form.querySelector('button');

async function request(suffix = '', method = 'GET', body) {
  const response = await fetch('/api/tasks' + suffix, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return;
  const result = await response.json();
  if (!response.ok) throw new Error(result.error);
  return result;
}

function report(error) {
  errorMessage.textContent = error.message;
  errorMessage.hidden = false;
}

function updateSummary() {
  const total = list.children.length;
  const completed = list.querySelectorAll(':checked').length;
  summary.textContent = total ? completed + ' of ' + total + ' completed' : '0 tasks';
  empty.hidden = total !== 0;
}

function rowFor(task) {
  const row = document.createElement('li');
  const label = document.createElement('label');
  const checkbox = document.createElement('input');
  const title = document.createElement('span');
  const remove = document.createElement('button');

  checkbox.type = 'checkbox';
  checkbox.checked = task.completed;
  title.textContent = task.title;
  remove.type = 'button';
  remove.textContent = 'Delete';
  remove.setAttribute('aria-label', 'Delete ' + task.title);
  label.append(checkbox, title);
  row.append(label, remove);

  checkbox.addEventListener('change', async () => {
    checkbox.disabled = remove.disabled = true;
    errorMessage.hidden = true;
    try {
      const updated = await request('/' + task.id, 'PATCH', { completed: checkbox.checked });
      checkbox.checked = updated.completed;
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      report(error);
    } finally {
      checkbox.disabled = remove.disabled = false;
      updateSummary();
    }
  });

  remove.addEventListener('click', async () => {
    checkbox.disabled = remove.disabled = true;
    errorMessage.hidden = true;
    try {
      await request('/' + task.id, 'DELETE');
      const nextRow = row.nextElementSibling || row.previousElementSibling;
      row.remove();
      updateSummary();
      (nextRow?.querySelector('button') || input).focus();
    } catch (error) {
      report(error);
      checkbox.disabled = remove.disabled = false;
    }
  });

  return row;
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  errorMessage.hidden = true;
  addButton.disabled = true;
  const draft = input.value;
  try {
    const task = await request('', 'POST', { title: draft });
    list.prepend(rowFor(task));
    if (input.value === draft) form.reset();
    updateSummary();
  } catch (error) {
    report(error);
  } finally {
    addButton.disabled = false;
    input.focus();
  }
});

addButton.disabled = true;
request().then(tasks => {
  list.append(...tasks.map(rowFor));
  updateSummary();
}).catch(error => {
  summary.textContent = 'Could not load tasks.';
  report(error);
}).finally(() => {
  addButton.disabled = false;
});
