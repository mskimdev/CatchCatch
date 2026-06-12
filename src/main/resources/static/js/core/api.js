async function apiRequest(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body != null ? JSON.stringify(body) : undefined,
  }).catch(() => null);

  const data = res ? await res.json().catch(() => null) : null;
  return { res, data };
}

function apiGet(url) {
  return apiRequest('GET', url, null);
}

function apiPost(url, body) {
  return apiRequest('POST', url, body);
}

function apiPut(url, body) {
  return apiRequest('PUT', url, body);
}

function apiDelete(url) {
  return apiRequest('DELETE', url, null);
}
