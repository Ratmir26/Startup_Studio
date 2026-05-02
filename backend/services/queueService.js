// Заглушка для очереди задач (без Redis пока)
const jobs = new Map();

export async function addToQueue(queueName, data) {
  const jobId = Date.now().toString();
  const job = {
    id: jobId,
    data,
    status: 'completed', // сразу completed, без реальной очереди
    result: null
  };

  jobs.set(jobId, job);
  console.log(`✅ Задача добавлена в очередь "${queueName}":`, jobId);

  return job;
}

export async function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export default { addToQueue, getJob };