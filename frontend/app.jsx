import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './style.css';

async function request(suffix = '', method = 'GET', body, signal) {
  const response = await fetch('/api/tasks' + suffix, {
    method,
    signal,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (response.status === 204) return;
  const result = await response.json().catch(() => null);
  if (!response.ok || result === null) {
    throw new Error(result?.error || 'Could not reach the task API. Check that the Python server is running.');
  }
  return result;
}

function TaskRow({ task, onSave, onDelete, onError }) {
  const [pending, setPending] = useState(false);

  async function changeTask(action) {
    setPending(true);
    onError('');
    try {
      await action();
    } catch (error) {
      onError(error.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <li>
      <label>
        <input type="checkbox" checked={task.completed} disabled={pending}
          onChange={event => {
            const completed = event.target.checked;
            changeTask(async () => onSave(await request('/' + task.id, 'PATCH', { completed })));
          }} />
        <span>{task.title}</span>
      </label>
      <button type="button" disabled={pending} aria-label={'Delete ' + task.title}
        onClick={() => changeTask(async () => {
          await request('/' + task.id, 'DELETE');
          onDelete(task.id);
        })}>Delete</button>
    </li>
  );
}

function App() {
  const [tasks, setTasks] = useState(null);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [loadFailed, setLoadFailed] = useState(false);
  const [loadingAttempt, setLoadingAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const input = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    request('', 'GET', undefined, controller.signal).then(setTasks).catch(error => {
      if (!controller.signal.aborted) {
        setLoadFailed(true);
        setError(error.message);
      }
    });
    return () => controller.abort();
  }, [loadingAttempt]);

  async function addTask(event) {
    event.preventDefault();
    setError('');
    setAdding(true);
    try {
      const task = await request('', 'POST', { title });
      setTasks(current => [task, ...current]);
      setTitle(current => current === title ? '' : current);
    } catch (error) {
      setError(error.message);
    } finally {
      setAdding(false);
      input.current.focus();
    }
  }

  let summary = loadFailed ? 'Could not load tasks.' : 'Loading tasks…';
  if (tasks) {
    const completed = tasks.filter(task => task.completed).length;
    summary = tasks.length ? completed + ' of ' + tasks.length + ' completed' : '0 tasks';
  }

  return (
    <main>
      <header>
        <h1>Task tracker</h1>
        <p id="summary" role="status">{summary}</p>
      </header>
      <form onSubmit={addTask}>
        <label htmlFor="title">New task</label>
        <div className="entry">
          <input id="title" ref={input} value={title} onChange={event => setTitle(event.target.value)}
            placeholder="What needs doing?" maxLength={120} required />
          <button type="submit" disabled={!tasks || adding}>{adding ? 'Adding…' : 'Add task'}</button>
        </div>
        {error && <p id="error" role="alert">{error}</p>}
        {loadFailed && <button type="button" onClick={() => {
          setLoadFailed(false);
          setError('');
          setLoadingAttempt(attempt => attempt + 1);
        }}>Retry loading tasks</button>}
      </form>
      <section aria-labelledby="list-heading">
        <h2 id="list-heading">Your tasks</h2>
        {tasks?.length === 0 && <p>No tasks yet. Add one above.</p>}
        <ul>
          {tasks?.map(task => (
            <TaskRow key={task.id} task={task} onError={setError}
              onSave={updated => setTasks(current => current.map(item => item.id === updated.id ? updated : item))}
              onDelete={id => {
                setTasks(current => current.filter(item => item.id !== id));
                input.current.focus();
              }} />
          ))}
        </ul>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);