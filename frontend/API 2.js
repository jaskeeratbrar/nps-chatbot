export async function fetchBackend() {
    const response = await fetch('/'); // The proxy forwards this to the backend
    const text = await response.text();
    return text;
  }
  